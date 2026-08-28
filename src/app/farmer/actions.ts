import { createClient } from "@/lib/supabase/client";

export type RegisterYieldState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function registerYield(
  _prevState: RegisterYieldState,
  formData: FormData
): Promise<RegisterYieldState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const amountKg = Number(formData.get("amount_kg"));
  const occurredOn = String(formData.get("occurred_on") || "");

  if (!Number.isFinite(amountKg) || amountKg <= 0) {
    return {
      status: "error",
      message: "発生量は0より大きい数値で入力してください。",
    };
  }

  const { error } = await supabase.from("yield_records").insert({
    farm_id: user.id,
    amount_kg: amountKg,
    ...(occurredOn ? { occurred_on: occurredOn } : {}),
  });

  if (error) {
    console.error("[registerYield] insert failed:", error);
    return {
      status: "error",
      message: "登録に失敗しました。もう一度お試しください。",
    };
  }

  return { status: "success" };
}
