"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateFarmState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateCapacity(
  _prevState: UpdateFarmState,
  formData: FormData
): Promise<UpdateFarmState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const capacityKg = Number(formData.get("capacity_kg"));

  if (!Number.isFinite(capacityKg) || capacityKg < 0) {
    return {
      status: "error",
      message: "保管可能量は0以上の数値で入力してください。",
    };
  }

  const { error } = await supabase
    .from("farms")
    .update({ capacity_kg: capacityKg })
    .eq("id", user.id);

  if (error) {
    console.error("[updateCapacity] update failed:", error);
    return {
      status: "error",
      message: "保存に失敗しました。もう一度お試しください。",
    };
  }

  revalidatePath("/farmer");
  revalidatePath("/farmer/profile");
  return { status: "success" };
}

export async function updateFarmInfo(
  _prevState: UpdateFarmState,
  formData: FormData
): Promise<UpdateFarmState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const name = String(formData.get("name") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const memo = String(formData.get("memo") || "").trim();

  if (!name) {
    return { status: "error", message: "農家名を入力してください。" };
  }

  const { error } = await supabase
    .from("farms")
    .update({ name, address, phone, memo })
    .eq("id", user.id);

  if (error) {
    console.error("[updateFarmInfo] update failed:", error);
    return {
      status: "error",
      message: "保存に失敗しました。もう一度お試しください。",
    };
  }

  revalidatePath("/farmer");
  revalidatePath("/farmer/profile");
  return { status: "success" };
}
