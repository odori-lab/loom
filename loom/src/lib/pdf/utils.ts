import { ImageCaption } from "@loom/shared";
import { CaptionMap } from "./types";

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
