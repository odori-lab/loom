import type { StoredPage } from "@loom/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function getSignedDownloadUrl(
  supabase: SupabaseClient,
  pdfPath: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from("looms-pdf")
    .createSignedUrl(pdfPath, SIGNED_URL_EXPIRY);

  return data?.signedUrl ?? null;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from("looms-pdf")
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  return data?.signedUrl ?? null;
}

export async function fetchStoredPages(
  pagesUrl: string,
): Promise<StoredPage[]> {
  const response = await fetch(pagesUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch stored pages: ${response.status}`);
  }
  return response.json();
}
