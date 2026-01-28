import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { getAuthUser } from "../kinde"; // pass in getUser as middleware function to make the route authenticated
import { db } from "../db";
import { expensesTable, expensesInsertSchema } from "../db/schema/expenses";
import { gamesTable, gamesInsertSchema, gamesSelectSchema, gameParamsSchema } from "../db/schema/games";
import { usersTable } from "../db/schema/users";
import { eq, desc, sum, and, ilike, or } from "drizzle-orm";
import { s3Client, R2_BUCKET, PutObjectCommand, GetObjectCommand } from "../s3";

export const usersRoute = new Hono()

.get("/account", getAuthUser, async c => {
    // regex makes sure we get a number as a request
    // const id = Number.parseInt(c.req.param('id'))
    const authUser = c.var.user
    // const kindeid = 'kp_c71a3c8c7b11484e9b8f9009b690cd4d'
    const account = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.kindeId, authUser.id)))
    // .where(and(eq(usersTable.kindeId, kindeid)))
    .limit(1)
    .then(res => res[0])
     if (!account){
        return c.notFound();
    }
    return c.json({ account })
})

.post("/avatar", getAuthUser, async c => {
    const dbUser = c.var.dbUser;

    const formData = await c.req.formData();
    const fileEntry = formData.get("avatar");

    if (!fileEntry || typeof fileEntry === "string") {
        return c.json({ error: "No file provided" }, 400);
    }

    const file = fileEntry as File;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
        return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp, gif" }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return c.json({ error: "File too large. Max size: 5MB" }, 400);
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const key = `avatars/${dbUser.id}/${Date.now()}.${ext}`;

    // Upload to R2 via S3 API
    await s3Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
    }));

    // Construct public URL (adjust based on your R2 public access config)
    const avatarUrl = `/api/user/avatar/${dbUser.id}`;

    // Update user's avatar URL in database
    await db
        .update(usersTable)
        .set({ avatarUrl: key })
        .where(eq(usersTable.id, dbUser.id));

    return c.json({ avatarUrl, key });
})

// Get public user profile by ID (no auth required)
.get("/profile/:userId", async c => {
    const userId = c.req.param("userId");

    const user = await db
        .select({
            id: usersTable.id,
            username: usersTable.username,
            displayName: usersTable.displayName,
            avatarUrl: usersTable.avatarUrl,
            createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)
        .then(res => res[0]);

    if (!user) {
        return c.notFound();
    }

    return c.json({ user });
})

.get("/avatar/:userId", async c => {
    const userId = c.req.param("userId");

    // Get user's avatar key from database
    const user = await db
        .select({ avatarUrl: usersTable.avatarUrl })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1)
        .then(res => res[0]);

    if (!user?.avatarUrl) {
        return c.notFound();
    }

    // Fetch from R2 via S3 API
    try {
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: user.avatarUrl,
        }));

        if (!response.Body) {
            return c.notFound();
        }

        const headers = new Headers();
        headers.set("Content-Type", response.ContentType || "image/jpeg");
        headers.set("Cache-Control", "public, max-age=31536000");

        // Convert stream to web ReadableStream
        const stream = response.Body.transformToWebStream();
        return new Response(stream, { headers });
    } catch (error) {
        return c.notFound();
    }
})

// .post("/", zValidator("json", createExpenseSchema), getUser, async c => { // zValidator middleware validation function
//     const user = c.var.user
//     const expense = await c.req.valid("json");
//     const validatedExpense = expensesInsertSchema.parse({
//         ...expense,
//         userId: user.id,
//     })

//     const result = await db
//     .insert(expensesTable)
//     .values(validatedExpense)
//     .returning()
//     .then(res => res[0]);
//     c.status(201)
//     return c.json(result);
// })
// .get("/total-spent", getUser, async c => {
//     // add a fake delay to test loading feature in frontend - needs to make function async for it
//     // await new Promise((r) => setTimeout(r, 2000))
//     const user = c.var.user
//     const result = await db.select({ total: sum(expensesTable.amount) })
//         .from(expensesTable)
//         .where(eq(expensesTable.userId, user.id))
//         .limit(1)
//         .then(res => res[0]) // db commands always return an array sowe have to convert it into just the first element
//     return c.json(result);
// })

// })
// .delete("/:id{[0-9]+}", getUser, async c => {  // regex makes sure we get a number as a request
//     const id = Number.parseInt(c.req.param('id'))
//     const user = c.var.user // we can grab the user like this
//     const expense = await db
//     .delete(expensesTable)
//     .where(and(eq(expensesTable.userId, user.id), eq(expensesTable.id, id)))
//     .returning()
//     .then(res => res[0])
    
//     if (!expense){
//         return c.notFound();
//     }
//     return c.json({expense: expense})

// })
