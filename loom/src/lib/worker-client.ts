// Client-side worker API — calls loom-worker directly to bypass Vercel timeout
import type { ThreadsPost, ThreadsProfile } from "@loom/shared";

const WORKER_URL = process.env.NEXT_PUBLIC_LOOM_WORKER_URL?.replace(/\/+$/, "");

if (!WORKER_URL) {
  console.warn(
    "NEXT_PUBLIC_LOOM_WORKER_URL is not set — worker client calls will fail",
  );
}

interface WorkerScrapeResponse {
  success: boolean;
  profile?: {
    username: string;
    displayName: string;
    bio: string;
    profileImageUrl: string;
  };
  posts?: Array<{
    id: string;
    username: string;
    content: string;
    imageUrls: string[];
    likeCount: number;
    replyCount: number;
    repostCount: number;
    postedAt: string;
    threadId?: string;
  }>;
  error?: string;
  accountId?: string;
  duration?: number;
}

interface ScrapeResult {
  posts: ThreadsPost[];
  profile: ThreadsProfile;
  hasMore: boolean;
}

export async function scrapeThreadsDirect(
  username: string,
  limit = 100,
): Promise<ScrapeResult> {
  if (!WORKER_URL) {
    throw new Error("NEXT_PUBLIC_LOOM_WORKER_URL is not configured");
  }

  const response = await fetch(`${WORKER_URL}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, limit }),
  });

  if (!response.ok && response.status !== 503) {
    const text = await response.text().catch(() => "No response body");
    throw new Error(`Worker request failed (${response.status}): ${text}`);
  }

  const data: WorkerScrapeResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Scrape failed");
  }

  if (!data.profile || !data.posts) {
    throw new Error("Worker returned success but missing data");
  }

  const profile: ThreadsProfile = {
    username: data.profile.username,
    displayName: data.profile.displayName,
    bio: data.profile.bio,
    followerCount: 0,
    profileImageUrl: data.profile.profileImageUrl,
  };

  const posts: ThreadsPost[] = data.posts.map((post) => ({
    id: post.id,
    username: post.username,
    content: post.content,
    imageUrls: post.imageUrls,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    repostCount: post.repostCount,
    postedAt: new Date(post.postedAt),
    ...(post.threadId ? { threadId: post.threadId } : {}),
  }));

  return {
    posts,
    profile,
    hasMore: posts.length >= limit,
  };
}

// NDJSON stream reader helper
async function* readNdjsonStream<T>(
  response: Response,
): AsyncGenerator<T, void, unknown> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as T;
    }
  }
}

type NdjsonEvent =
  | { type: "progress"; progress: number; message: string }
  | { type: "complete"; data: unknown }
  | { type: "error"; error: string };

export async function scrapeThreadsWithProgress(
  username: string,
  limit: number,
  onProgress: (progress: number, message: string) => void,
): Promise<ScrapeResult> {
  if (!WORKER_URL) {
    throw new Error("NEXT_PUBLIC_LOOM_WORKER_URL is not configured");
  }

  const response = await fetch(`${WORKER_URL}/scrape-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, limit }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "No response body");
    throw new Error(`Worker request failed (${response.status}): ${text}`);
  }

  for await (const event of readNdjsonStream<NdjsonEvent>(response)) {
    if (event.type === "progress") {
      onProgress(event.progress, event.message);
    } else if (event.type === "error") {
      throw new Error(event.error);
    } else if (event.type === "complete") {
      const raw = event.data as WorkerScrapeResponse;
      if (!raw.success) throw new Error(raw.error || "Scrape failed");
      if (!raw.profile || !raw.posts) {
        throw new Error("Worker returned success but missing data");
      }

      const profile: ThreadsProfile = {
        username: raw.profile.username,
        displayName: raw.profile.displayName,
        bio: raw.profile.bio,
        followerCount: 0,
        profileImageUrl: raw.profile.profileImageUrl,
      };

      const posts: ThreadsPost[] = raw.posts.map((post) => ({
        id: post.id,
        username: post.username,
        content: post.content,
        imageUrls: post.imageUrls,
        likeCount: post.likeCount,
        replyCount: post.replyCount,
        repostCount: post.repostCount,
        postedAt: new Date(post.postedAt),
        ...(post.threadId ? { threadId: post.threadId } : {}),
      }));

      return { posts, profile, hasMore: posts.length >= limit };
    }
  }

  throw new Error("Stream ended without a complete event");
}

export async function createLoomWithProgress(
  pages: string[],
  userId: string,
  onProgress: (progress: number, message: string) => void,
): Promise<{ pdfPath: string; loomId: string }> {
  if (!WORKER_URL) {
    throw new Error("NEXT_PUBLIC_LOOM_WORKER_URL is not configured");
  }

  const response = await fetch(`${WORKER_URL}/create-loom-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pages, userId }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "No response body");
    throw new Error(`Worker request failed (${response.status}): ${text}`);
  }

  for await (const event of readNdjsonStream<NdjsonEvent>(response)) {
    if (event.type === "progress") {
      onProgress(event.progress, event.message);
    } else if (event.type === "error") {
      throw new Error(event.error);
    } else if (event.type === "complete") {
      return event.data as { pdfPath: string; loomId: string };
    }
  }

  throw new Error("Stream ended without a complete event");
}

export async function createLoomDirect(
  pages: string[],
  userId: string,
): Promise<{ pdfPath: string; loomId: string }> {
  if (!WORKER_URL) {
    throw new Error("NEXT_PUBLIC_LOOM_WORKER_URL is not configured");
  }

  const response = await fetch(`${WORKER_URL}/create-loom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pages, userId }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      errorData.error || errorData.message || "create-loom failed",
    );
  }

  return response.json();
}
