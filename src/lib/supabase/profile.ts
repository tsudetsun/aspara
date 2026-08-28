import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "farmer" | "admin";

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getUserRole] profiles select failed:", error);
    return null;
  }

  return (data?.role as UserRole | undefined) ?? null;
}
