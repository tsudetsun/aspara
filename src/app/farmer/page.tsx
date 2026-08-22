import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FarmerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/farmer");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 px-4">
      <p className="text-xl font-semibold text-green-900">
        利用者画面にログイン完了
      </p>
    </div>
  );
}
