import {
  createKindeServerClient,
  GrantType,
  type SessionManager,
  type UserType,
} from "@kinde-oss/kinde-typescript-sdk";
import { type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { usersTable, type UserRole } from "./db/schema/users";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { usersSelectSchema } from "./db/schema/users";

// Role hierarchy: admin > pro > free
const roleHierarchy: Record<UserRole, number> = {
  free: 0,
  pro: 1,
  admin: 2,
};

const KindeEnv = z.object({
  KINDE_DOMAIN: z.string(),
  KINDE_CLIENT_ID: z.string(),
  KINDE_CLIENT_SECRET: z.string(),
  KINDE_REDIRECT_URI: z.string().url(),
  KINDE_LOGOUT_REDIRECT_URI: z.string().url(),
});

const ProcessEnv = KindeEnv.parse(process.env);

export const kindeClient = createKindeServerClient(
  GrantType.AUTHORIZATION_CODE,
  {
    authDomain: ProcessEnv.KINDE_DOMAIN,
    clientId: ProcessEnv.KINDE_CLIENT_ID,
    clientSecret: ProcessEnv.KINDE_CLIENT_SECRET,
    redirectURL: ProcessEnv.KINDE_REDIRECT_URI,
    logoutRedirectURL: ProcessEnv.KINDE_LOGOUT_REDIRECT_URI,
  }
);

let store: Record<string, unknown> = {};

export const sessionManager = (c: Context): SessionManager => ({
  async getSessionItem(key: string) {
    const result = getCookie(c, key);
    return result;
  },
  async setSessionItem(key: string, value: unknown) {
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    } as const;
    if (typeof value === "string") {
      setCookie(c, key, value, cookieOptions);
    } else {
      setCookie(c, key, JSON.stringify(value), cookieOptions);
    }
  },
  async removeSessionItem(key: string) {
    deleteCookie(c, key);
  },
  async destroySession() {
    ["id_token", "access_token", "user", "refresh_token"].forEach((key) => {
      deleteCookie(c, key);
    });
  },
});

type Env = {
  Variables: {
    user: UserType;
    dbUser: z.infer<typeof usersSelectSchema>;
  };
};

// Helper function to generate username from Kinde user
function generateUsername(kindeUser: UserType): string {
  // Try to use their email username part
  if (kindeUser.email) {
    const emailUsername = kindeUser.email.split('@')[0];
    return emailUsername!.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  
  // Fallback to first name or a random string
  if (kindeUser.given_name) {
    return kindeUser.given_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  
  // Last resort: random string
  return `user${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to ensure unique username
async function getUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    
    if (existing.length === 0) {
      return username;
    }
    
    username = `${baseUsername}${counter}`;
    counter++;
  }
}

export const getAuthUser = createMiddleware<Env>(async (c, next) => {
  try {
    const manager = sessionManager(c);
    const isAuthenticated = await kindeClient.isAuthenticated(manager);
    if (!isAuthenticated) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const user = await kindeClient.getUserProfile(manager);
    c.set("user", user);

    // Get or create database user
    let dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.kindeId, user.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!dbUser) {
      // Generate a unique username
      const baseUsername = generateUsername(user);
      const uniqueUsername = await getUniqueUsername(baseUsername);
      
      // Create the user
      const displayName = user.given_name && user.family_name 
        ? `${user.given_name} ${user.family_name}`.trim()
        : user.given_name || user.family_name || null;

      const [newUser] = await db
        .insert(usersTable)
        .values({
          kindeId: user.id,
          username: uniqueUsername,
          displayName: displayName,
          avatarUrl: user.picture || null,
        })
        .returning();
      
      dbUser = newUser!;
    }

    // Check if user is suspended
    if (dbUser.suspendedAt !== null) {
      return c.json({ error: "Account suspended" }, 403);
    }

    c.set("dbUser", dbUser);
    await next();
  } catch (e) {
    console.error(e);
    return c.json({ error: "Unauthorized" }, 401);
  }
});

// Middleware to require specific roles (must be used after getAuthUser)
export const requireRole = (...allowedRoles: UserRole[]) => {
  return createMiddleware<Env>(async (c, next) => {
    const dbUser = c.get("dbUser");

    if (!dbUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!allowedRoles.includes(dbUser.role as UserRole)) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await next();
  });
};

// Middleware to require minimum role level (uses hierarchy)
export const requireMinRole = (minRole: UserRole) => {
  return createMiddleware<Env>(async (c, next) => {
    const dbUser = c.get("dbUser");

    if (!dbUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (roleHierarchy[dbUser.role as UserRole] < roleHierarchy[minRole]) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await next();
  });
};

// Helper to check role in route handlers
export const hasRole = (dbUser: z.infer<typeof usersSelectSchema>, ...roles: UserRole[]): boolean => {
  return roles.includes(dbUser.role as UserRole);
};

// Helper to check minimum role level
export const hasMinRole = (dbUser: z.infer<typeof usersSelectSchema>, minRole: UserRole): boolean => {
  return roleHierarchy[dbUser.role as UserRole] >= roleHierarchy[minRole];
};