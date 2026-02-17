import { ThreadsPost, ThreadsProfile, BookStructure } from "@loom/shared";
import { ContentBlock, CaptionMap, MergedPost } from "./types";
import { buildCaptionMap } from "./utils";
import { generateCoverPage } from "./templates/cover";
import { generateTocPage } from "./templates/toc";
import { generatePrefacePage } from "./templates/preface";
import { generateChapterTitlePage } from "./templates/chapter";
import { generateSubChapterTitle } from "./templates/chapter";
import { generateLastPage } from "./templates/last";
import { mergeThreadPosts } from "./generator";
import { formatNumber, escapeHtml, formatDate } from "@/lib/utils/format";

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

// Render images with optional caption - stack vertically for 3+ images
function renderImagesHtml(imageUrls: string[], caption?: string): string {
  const captionHtml = caption
    ? `<figcaption class="essay-image-caption">${escapeHtml(caption)}</figcaption>`
    : "";

  if (imageUrls.length >= 3) {
    // Stack vertically for 3+ images - each in its own row
    const rowsHtml = imageUrls
      .map(
        (url) =>
          `<div class="essay-image-row"><img src="${url}" alt="" class="essay-inline-image" /></div>`,
      )
      .join("");
    return `<figure class="essay-figure">${rowsHtml}${captionHtml}</figure>`;
  }

  // 1-2 images in a single row
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

  if (paragraphs.length <= 1) {
    return `<div class="essay-post-text">${escapeHtml(content)}</div>${renderImagesHtml(imageUrls, caption)}`;
  }

  const result: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    result.push(
      `<div class="essay-post-text">${escapeHtml(paragraphs[i])}</div>`,
    );
    if (i === 0) {
      result.push(renderImagesHtml(imageUrls, caption));
    }
  }

  return result.join("");
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

  // Blank page after cover (back of cover page)
  blocks.push({
    id: "cover-blank",
    html: '<div class="page"></div>',
    type: "blank",
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

  // TOC (full page) - after preface
  blocks.push({
    id: "toc",
    html: generateTocPage(bookStructure),
    type: "toc",
    fullPage: true,
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
      });

      // Gather and merge posts for this sub-chapter
      const subChapterPosts: ThreadsPost[] = [];
      for (const postId of subChapter.postIds) {
        const post = postMap.get(postId);
        if (post) subChapterPosts.push(post);
      }

      if (subChapterPosts.length === 0) continue;

      const mergedPosts = mergeThreadPosts(subChapterPosts);

      // Each merged post is a separate block
      for (let postIdx = 0; postIdx < mergedPosts.length; postIdx++) {
        const mp = mergedPosts[postIdx];
        blocks.push({
          id: `post-${chapterIdx}-${subIdx}-${postIdx}`,
          html: generateMergedPostInnerHtml(mp, captionMap),
          type: "post",
        });
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
