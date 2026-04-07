import { queryOptions } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/react";
import { api } from "@/lib/api";

export type BlogPostStatus = "draft" | "published";

export type BlogPostCustomization = {
  backgroundColor?: string;
  headerColor?: string;
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg" | "xl";
  accentColor?: string;
};

export type BlogPost = {
  id: string;
  userId: string;
  title: string;
  subtitle: string | null;
  slug: string;
  headerImageUrl: string | null;
  content: JSONContent | null;
  status: BlogPostStatus;
  customization: BlogPostCustomization | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmbedGame = {
  id: string;
  name: string;
  slug: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  igdbRating: string | null;
};

export type EmbedList = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  gameCount: number;
  ownerUsername: string;
  ownerDisplayName: string | null;
};

export type Embeds = {
  games: Record<string, EmbedGame>;
  lists: Record<string, EmbedList>;
};

export type BlogPostDetail = {
  post: BlogPost;
  embeds: Embeds;
};

export type PublicBlogPostAuthor = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type PublicBlogPostDetail = {
  post: BlogPost;
  author: PublicBlogPostAuthor;
  embeds: Embeds;
};

async function getMyBlogPosts(): Promise<{ posts: BlogPost[] }> {
  const res = await api["blog-posts"].$get();
  if (!res.ok) throw new Error("Failed to fetch blog posts");
  return res.json() as Promise<{ posts: BlogPost[] }>;
}

export const myBlogPostsQueryOptions = queryOptions({
  queryKey: ["my-blog-posts"],
  queryFn: getMyBlogPosts,
  staleTime: 1000 * 60 * 2,
});

async function getUserPublishedPosts(userId: string): Promise<{ posts: BlogPost[] }> {
  const res = await api["blog-posts"].user[":userId"].$get({ param: { userId } });
  if (!res.ok) throw new Error("Failed to fetch user posts");
  return res.json() as Promise<{ posts: BlogPost[] }>;
}

export const userPublishedPostsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user-published-posts", userId],
    queryFn: () => getUserPublishedPosts(userId),
    staleTime: 1000 * 60 * 5,
  });

async function getPublicBlogPost(postId: string): Promise<PublicBlogPostDetail> {
  const res = await api["blog-posts"].public[":postId"].$get({ param: { postId } });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Post not found");
    throw new Error("Failed to fetch blog post");
  }
  return res.json() as Promise<PublicBlogPostDetail>;
}

export const publicBlogPostQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ["public-blog-post", postId],
    queryFn: () => getPublicBlogPost(postId),
    staleTime: 1000 * 60 * 5,
  });

async function getBlogPost(postId: string): Promise<BlogPostDetail> {
  const res = await api["blog-posts"][":postId"].$get({ param: { postId } });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Post not found");
    throw new Error("Failed to fetch blog post");
  }
  return res.json() as Promise<BlogPostDetail>;
}

export const blogPostQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: ["blog-post", postId],
    queryFn: () => getBlogPost(postId),
    staleTime: 1000 * 60 * 2,
  });

export async function createBlogPost(data: {
  title: string;
  slug: string;
  subtitle?: string;
  customization?: BlogPostCustomization;
}): Promise<{ post: BlogPost }> {
  const res = await api["blog-posts"].$post({ json: data });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to create post");
  }
  return res.json() as Promise<{ post: BlogPost }>;
}

export async function updateBlogPost(
  postId: string,
  data: {
    title?: string;
    subtitle?: string | null;
    slug?: string;
    content?: JSONContent | null;
    customization?: BlogPostCustomization | null;
  }
): Promise<{ post: BlogPost }> {
  const res = await api["blog-posts"][":postId"].$patch({ param: { postId }, json: data });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to update post");
  }
  return res.json() as Promise<{ post: BlogPost }>;
}

export async function deleteBlogPost(postId: string): Promise<void> {
  const res = await api["blog-posts"][":postId"].$delete({ param: { postId } });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function publishBlogPost(postId: string): Promise<{ post: BlogPost }> {
  const res = await api["blog-posts"][":postId"].publish.$post({ param: { postId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to publish post");
  }
  return res.json() as Promise<{ post: BlogPost }>;
}

export async function unpublishBlogPost(postId: string): Promise<{ post: BlogPost }> {
  const res = await api["blog-posts"][":postId"].unpublish.$post({ param: { postId } });
  if (!res.ok) {
    const error = await res.json() as { error?: string };
    throw new Error(error.error || "Failed to unpublish post");
  }
  return res.json() as Promise<{ post: BlogPost }>;
}

// FormData uploads — not supported by the Hono RPC client
export async function uploadHeaderImage(postId: string, file: File): Promise<{ headerImageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`/api/blog-posts/${postId}/header-image`, { method: "POST", body: formData });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to upload header image");
  }
  return res.json();
}

export async function removeHeaderImage(postId: string): Promise<void> {
  const res = await api["blog-posts"][":postId"]["header-image"].$delete({ param: { postId } });
  if (!res.ok) throw new Error("Failed to remove header image");
}

export async function uploadPostImage(postId: string, file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`/api/blog-posts/${postId}/image`, { method: "POST", body: formData });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to upload image");
  }
  return res.json();
}
