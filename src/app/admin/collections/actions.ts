import { createClient } from "@/lib/supabase/client";

export type CreateCollectionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createCollection(
  _prevState: CreateCollectionState,
  formData: FormData
): Promise<CreateCollectionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const farmId = String(formData.get("farm_id") || "");
  const collectedOn = String(formData.get("collected_on") || "");
  const amountKg = Number(formData.get("amount_kg"));
  const staffName = String(formData.get("staff_name") || "").trim();
  const memo = String(formData.get("memo") || "").trim();

  if (!farmId) {
    return { status: "error", message: "収集した農家を選択してください。" };
  }
  if (!Number.isFinite(amountKg) || amountKg <= 0) {
    return {
      status: "error",
      message: "収集量は0より大きい数値で入力してください。",
    };
  }

  const { error } = await supabase.from("collections").insert({
    farm_id: farmId,
    amount_kg: amountKg,
    staff_name: staffName,
    memo,
    ...(collectedOn ? { collected_on: collectedOn } : {}),
  });

  if (error) {
    console.error("[createCollection] insert failed:", error);
    return {
      status: "error",
      message: "登録に失敗しました。もう一度お試しください。",
    };
  }

  return { status: "success" };
}
