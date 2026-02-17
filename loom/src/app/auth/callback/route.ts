import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Database } from "@loom/shared";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if profile exists, if not create one
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          const profileData: Database["public"]["Tables"]["profiles"]["Insert"] = {
            id: user.id,
            email: user.email!,
            name: user.user_metadata.full_name || user.user_metadata.name,
            avatar_url: user.user_metadata.avatar_url,
          };
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const { error: insertError } = await supabase
            .from("profiles")
            .insert(profileData as any);
          /* eslint-enable @typescript-eslint/no-explicit-any */
          if (insertError) {
            console.error(
              "[PROFILE_CREATE_ERROR]",
              JSON.stringify(insertError, null, 2),
            );
          }
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
