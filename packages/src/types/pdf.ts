// Merged post type for combining thread posts in essay mode
export interface MergedPost {
  content: string;
  date: Date;
  likeCount: number;
  imageUrls: string[];
  postIds?: string[];
}

// Caption map type: postId -> caption (one caption per post)
export type CaptionMap = Map<string, string>;
