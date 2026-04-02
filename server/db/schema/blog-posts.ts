import { uuid, pgTable, pgEnum, index, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export type BlogPostCustomization = {
  backgroundColor?: string;
  headerColor?: string;
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg" | "xl";
  accentColor?: string;
};

export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);

export const blogPostsTable = pgTable("blog_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  slug: text("slug").notNull().unique(),
  headerImageUrl: text("header_image_url"),
  content: jsonb("content").$type<Record<string, unknown>>(),
  status: blogPostStatusEnum("status").default("draft").notNull(),
  customization: jsonb("customization").$type<BlogPostCustomization>(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("blog_posts_user_idx").on(table.userId),
  index("blog_posts_slug_idx").on(table.slug),
  index("blog_posts_status_idx").on(table.status),
  index("blog_posts_published_at_idx").on(table.publishedAt),
]);

export const blogPostStatuses = ["draft", "published"] as const;
export type BlogPostStatus = (typeof blogPostStatuses)[number];

export const blogPostsInsertSchema = createInsertSchema(blogPostsTable, {
  title: z.string().min(0).max(200),
  subtitle: z.string().max(400).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  status: z.enum(blogPostStatuses).optional(),
});

export const blogPostsSelectSchema = createSelectSchema(blogPostsTable);

export const createBlogPostSchema = blogPostsInsertSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export type CreateBlogPost = z.infer<typeof createBlogPostSchema>;
