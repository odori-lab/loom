import type { ThreadsPost } from "../types/threads";
import type { ImageCaption } from "../types/book";
import type { MergedPost, CaptionMap } from "../types/pdf";

// Merge thread posts: group by threadId, combine content, sum likes
export function mergeThreadPosts(posts: ThreadsPost[]): MergedPost[] {
	const merged: MergedPost[] = [];
	const threadGroups = new Map<string, ThreadsPost[]>();
	const seenThreadIds: string[] = [];

	for (const post of posts) {
		if (post.threadId) {
			if (!threadGroups.has(post.threadId)) {
				threadGroups.set(post.threadId, []);
				seenThreadIds.push(post.threadId);
			}
			threadGroups.get(post.threadId)!.push(post);
		} else {
			merged.push({
				content: post.content,
				date: new Date(post.postedAt),
				likeCount: post.likeCount || 0,
				imageUrls: [...post.imageUrls],
				postIds: [post.id],
			});
		}
	}

	const result: MergedPost[] = [];
	let nonThreadIdx = 0;
	const threadInserted = new Set<string>();

	for (const post of posts) {
		if (post.threadId) {
			if (!threadInserted.has(post.threadId)) {
				threadInserted.add(post.threadId);
				const group = threadGroups.get(post.threadId)!;
				result.push({
					content: group.map((p) => p.content).join("\n\n"),
					date: new Date(group[0]!.postedAt),
					likeCount: group.reduce((sum, p) => sum + (p.likeCount || 0), 0),
					imageUrls: group.flatMap((p) => p.imageUrls),
					postIds: group.map((p) => p.id),
				});
			}
		} else {
			result.push(merged[nonThreadIdx]!);
			nonThreadIdx++;
		}
	}

	return result;
}

// Build caption lookup map from ImageCaption array: postId -> caption (first caption wins)
export function buildCaptionMap(imageCaptions?: ImageCaption[]): CaptionMap {
	const map: CaptionMap = new Map();
	if (!imageCaptions) return map;

	for (const cap of imageCaptions) {
		if (!map.has(cap.postId)) {
			map.set(cap.postId, cap.caption);
		}
	}

	return map;
}
