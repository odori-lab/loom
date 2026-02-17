import { generateTocPage as generateTocContent, BookStructure } from "@loom/shared";

export function generateTocPage(bookStructure: BookStructure): string {
  return `<div class="page toc-page">${generateTocContent(bookStructure)}</div>`;
}
