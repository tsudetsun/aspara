import { createClient } from "@/lib/supabase/client";

export type CreateScheduleState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function createSchedule(
  _prevState: CreateScheduleState,
  formData: FormData
): Promise<CreateScheduleState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const farmIds = formData.getAll("farm_ids").map(String);
  const scheduledDate = String(formData.get("scheduled_date") || "");
  const memo = String(formData.get("memo") || "").trim();

  if (farmIds.length === 0) {
    return { status: "error", message: "収集する農家を1件以上選択してください。" };
  }
  if (!scheduledDate) {
    return { status: "error", message: "収集予定日を入力してください。" };
  }

  const { error } = await supabase.from("collection_schedules").insert(
    farmIds.map((farmId) => ({
      farm_id: farmId,
      scheduled_date: scheduledDate,
      memo,
    }))
  );

  if (error) {
    console.error("[createSchedule] insert failed:", error);
    return {
      status: "error",
      message: "登録に失敗しました。もう一度お試しください。",
    };
  }

  return { status: "success" };
}

export async function deleteSchedule(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("collection_schedules").delete().eq("id", id);

  if (error) {
    console.error("[deleteSchedule] delete failed:", error);
    return { error: "削除に失敗しました。もう一度お試しください。" };
  }

  return { error: null };
}
