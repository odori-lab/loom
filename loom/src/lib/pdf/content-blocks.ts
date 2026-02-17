import {
  ThreadsPost,
  ThreadsProfile,
  BookStructure,
  formatNumber,
  escapeHtml,
  formatDate,
  generateTocPage,
  generatePrefacePage,
  generateChapterTitlePage,
  generateSubChapterTitle,
  generateLastPage,
  mergeThreadPosts,
  buildCaptionMap,
} from "@loom/shared";
import type { CaptionMap, MergedPost } from "@loom/shared";
import { ContentBlock } from "./types";
import { generateCoverPage } from "./templates/cover";
import { generateAuthorPage } from "./templates/author";

// Re-export ContentBlock type for backward compatibility
export type { ContentBlock } from "./types";

// Generate a single merged post's inner HTML (no page wrapper)
function generateMergedPostInnerHtml(
  post: MergedPost,
  captionMap?: CaptionMap,
): string {
  const dateStr = formatDate(post.date);
  const likesStr =
    post.likeCount > 0
      ? ` &middot; &#9829; ${formatNumber(post.likeCount)}`
      : "";
  const headerHtml = `<div class="essay-post-header">${dateStr}${likesStr}</div>`;

  let caption: string | undefined;
  if (captionMap && post.postIds) {
    for (const postId of post.postIds) {
      const found = captionMap.get(postId);
      if (found) {
        caption = found;
        break;
      }
    }
  }

  const contentHtml = generateInlineContent(
    post.content,
    post.imageUrls,
    caption,
  );

  return `
    <div class="essay-post">
      ${headerHtml}
      ${contentHtml}
    </div>
  `;
}

// Render images with optional caption - all images in a single horizontal row
function renderImagesHtml(imageUrls: string[], caption?: string): string {
  const captionHtml = caption
    ? `<figcaption class="essay-image-caption">${escapeHtml(caption)}</figcaption>`
    : "";

  const imgsHtml = imageUrls
    .map((url) => `<img src="${url}" alt="" class="essay-inline-image" />`)
    .join("");

  return `<figure class="essay-figure"><div class="essay-image-row">${imgsHtml}</div>${captionHtml}</figure>`;
}

// Generate content with images inline between paragraphs
function generateInlineContent(
  content: string,
  imageUrls: string[],
  caption?: string,
): string {
  const paragraphs = content.split("\n\n").filter((p) => p.trim());

  if (imageUrls.length === 0) {
    // Always split by paragraphs for proper page breaking
    return paragraphs
      .map((p) => `<div class="essay-post-text">${escapeHtml(p)}</div>`)
      .join("");
  }

  const textHtml = paragraphs
    .map((p) => `<div class="essay-post-text">${escapeHtml(p)}</div>`)
    .join("");
  return textHtml + renderImagesHtml(imageUrls, caption);
}

export function generateContentBlocks(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure: BookStructure,
): ContentBlock[] {
  return generateEssayBlocks(posts, profile, bookStructure);
}

function generateEssayBlocks(
  posts: ThreadsPost[],
  profile: ThreadsProfile,
  bookStructure: BookStructure,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const postMap = new Map<string, ThreadsPost>();
  for (const post of posts) {
    postMap.set(post.id, post);
  }

  const captionMap = buildCaptionMap(bookStructure.imageCaptions);

  // Cover (full page)
  blocks.push({
    id: "cover",
    html: generateCoverPage(profile, bookStructure.title),
    type: "cover",
    fullPage: true,
  });

  // Author page (full page) - after cover
  blocks.push({
    id: "author",
    html: generateAuthorPage(profile),
    type: "author",
    fullPage: true,
  });

  // Preface (full page) - before TOC
  if (bookStructure.preface) {
    blocks.push({
      id: "preface",
      html: generatePrefacePage(bookStructure.preface),
      type: "preface",
      fullPage: true,
    });
  }

  // TOC (non-fullPage, can be split across pages)
  blocks.push({
    id: "toc",
    html: generateTocPage(bookStructure),
    type: "toc",
    fullPage: false,
  });

  // Chapters
  for (
    let chapterIdx = 0;
    chapterIdx < bookStructure.chapters.length;
    chapterIdx++
  ) {
    const chapter = bookStructure.chapters[chapterIdx];

    // Chapter title page (full page)
    blocks.push({
      id: `chapter-${chapterIdx}`,
      html: generateChapterTitlePage(chapter, chapterIdx),
      type: "chapter-title",
      fullPage: true,
      chapterIndex: chapterIdx,
      chapterTitle: chapter.title,
    });

    // Sub-chapters
    for (let subIdx = 0; subIdx < chapter.subChapters.length; subIdx++) {
      const subChapter = chapter.subChapters[subIdx];

      // Sub-chapter header block
      const subChapterTitleHtml = generateSubChapterTitle(
        subChapter.title,
        chapterIdx,
        subIdx,
      );
      blocks.push({
        id: `sub-chapter-${chapterIdx}-${subIdx}`,
        html: subChapterTitleHtml,
        type: "sub-chapter",
        chapterIndex: chapterIdx,
        chapterTitle: chapter.title,
        subChapterIndex: subIdx,
        subChapterTitle: subChapter.title,
      });

      // Gather and merge posts for this sub-chapter
      const subChapterPosts: ThreadsPost[] = [];
      for (const postId of subChapter.postIds) {
        const post = postMap.get(postId);
        if (post) subChapterPosts.push(post);
      }

      if (subChapterPosts.length === 0) continue;

      const mergedPosts = mergeThreadPosts(subChapterPosts);

      // Generate individual element-level blocks for natural page packing
      for (
        let postIdx = 0;
        postIdx < mergedPosts.length;
        postIdx++
      ) {
        const mp = mergedPosts[postIdx];
        const dateStr = formatDate(mp.date);
        const likesStr =
          mp.likeCount > 0
            ? ` &middot; &#9829; ${formatNumber(mp.likeCount)}`
            : "";

        // Post header block
        blocks.push({
          id: `post-header-${chapterIdx}-${subIdx}-${postIdx}`,
          html: `<div class="essay-post-header">${dateStr}${likesStr}</div>`,
          type: "post",
          chapterIndex: chapterIdx,
          chapterTitle: chapter.title,
          subChapterIndex: subIdx,
          subChapterTitle: subChapter.title,
        });

        // Text paragraph blocks
        const paragraphs = mp.content
          .split("\n\n")
          .filter((p) => p.trim());
        for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
          blocks.push({
            id: `post-text-${chapterIdx}-${subIdx}-${postIdx}-${pIdx}`,
            html: `<div class="essay-post-text">${escapeHtml(paragraphs[pIdx])}</div>`,
            type: "post",
            chapterIndex: chapterIdx,
            chapterTitle: chapter.title,
            subChapterIndex: subIdx,
            subChapterTitle: subChapter.title,
          });
        }

        // Image block (if any)
        if (mp.imageUrls.length > 0) {
          let caption: string | undefined;
          if (captionMap && mp.postIds) {
            for (const postId of mp.postIds) {
              const found = captionMap.get(postId);
              if (found) {
                caption = found;
                break;
              }
            }
          }
          blocks.push({
            id: `post-image-${chapterIdx}-${subIdx}-${postIdx}`,
            html: renderImagesHtml(mp.imageUrls, caption),
            type: "post",
            chapterIndex: chapterIdx,
            chapterTitle: chapter.title,
            subChapterIndex: subIdx,
            subChapterTitle: subChapter.title,
          });
        }
      }
    }
  }

  // Last page (full page)
  blocks.push({
    id: "last",
    html: generateLastPage(),
    type: "last",
    fullPage: true,
  });

  return blocks;
}
