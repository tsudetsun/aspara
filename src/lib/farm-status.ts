export type Priority = "urgent" | "soon" | "safe";

export const PRIORITY_INFO: Record<
  Priority,
  { emoji: string; label: string; badge: string; card: string }
> = {
  urgent: {
    emoji: "🔴",
    label: "最優先",
    badge: "bg-red-100 text-red-700",
    card: "border-red-200 bg-red-50",
  },
  soon: {
    emoji: "🟡",
    label: "優先",
    badge: "bg-amber-100 text-amber-700",
    card: "border-amber-200 bg-amber-50",
  },
  safe: {
    emoji: "🟢",
    label: "余裕あり",
    badge: "bg-green-100 text-green-700",
    card: "border-green-200 bg-green-50",
  },
};

export type FarmPrediction = {
  priority: Priority;
  predictedLabel: string; // 例: "今日中", "2日後", "予測不可"
  recommendedDays: number | null; // 保管上限到達までの日数(算出できない場合は null)
};

// 過去の平均発生量から、保管上限に到達するまでの日数をシンプルに見積もる
export function predictFarmStatus(
  capacity: number,
  currentStock: number,
  avgDailyYield: number,
): FarmPrediction {
  if (capacity <= 0) {
    return { priority: "safe", predictedLabel: "上限未設定", recommendedDays: null };
  }

  const remaining = capacity - currentStock;
  if (remaining <= 0) {
    return { priority: "urgent", predictedLabel: "今日中", recommendedDays: 0 };
  }

  if (avgDailyYield > 0) {
    const days = Math.ceil(remaining / avgDailyYield);
    const predictedLabel =
      days <= 0 ? "今日中" : days === 1 ? "明日" : `${days}日後`;
    const priority: Priority = days <= 0 ? "urgent" : days <= 2 ? "soon" : "safe";
    return { priority, predictedLabel, recommendedDays: Math.max(days, 0) };
  }

  // 発生量の登録履歴がまだ無い場合は、現在の充填率で簡易判定する
  const percent = currentStock / capacity;
  if (percent >= 0.9) {
    return { priority: "urgent", predictedLabel: "今日中", recommendedDays: null };
  }
  if (percent >= 0.6) {
    return { priority: "soon", predictedLabel: "数日以内", recommendedDays: null };
  }
  return { priority: "safe", predictedLabel: "予測不可", recommendedDays: null };
}

// 収集推奨日を YYYY-MM-DD 形式で返す(算出できない場合は null)
export function recommendedDateString(recommendedDays: number | null): string | null {
  if (recommendedDays === null) {
    return null;
  }
  const date = new Date();
  date.setDate(date.getDate() + recommendedDays);
  return date.toISOString().slice(0, 10);
}
