"use client";

import { useActionState, useState } from "react";
import { PRIORITY_INFO, type Priority } from "@/lib/farm-status";
import { createSchedule, type CreateScheduleState } from "./actions";

export type ScheduleFarmOption = {
  id: string;
  name: string;
  priority: Priority;
  predictedLabel: string;
  recommendedDate: string | null;
};

const initialState: CreateScheduleState = { status: "idle" };

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatRecommendedDate(dateStr: string | null) {
  if (!dateStr) {
    return null;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(dateStr));
}

export default function ScheduleForm({
  farms,
  defaultDate,
  defaultFarmId,
  onSuccess,
}: {
  farms: ScheduleFarmOption[];
  defaultDate: string;
  defaultFarmId?: string | null;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createSchedule,
    initialState
  );

  const [lastStatus, setLastStatus] = useState(state.status);
  if (state.status !== lastStatus) {
    setLastStatus(state.status);
    if (state.status === "success") {
      onSuccess?.();
    }
  }

  return (
    <form action={formAction}>
      <p className="block text-sm font-medium text-slate-700">
        収集する農家
      </p>
      {farms.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">
          登録されている農家がまだありません。
        </p>
      ) : (
        <div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {farms.map((farm) => {
            const info = PRIORITY_INFO[farm.priority];
            const recommended = formatRecommendedDate(farm.recommendedDate);
            return (
              <label
                key={farm.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="farm_ids"
                    value={farm.id}
                    defaultChecked={farm.id === defaultFarmId}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-900">
                    {farm.name}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${info.badge}`}
                  >
                    {info.emoji} {farm.predictedLabel}
                  </span>
                  {recommended && <span>推奨: {recommended}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <label
        htmlFor="scheduled_date"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        収集予定日
      </label>
      <input
        id="scheduled_date"
        name="scheduled_date"
        type="date"
        required
        defaultValue={defaultDate || todayString()}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <label
        htmlFor="memo"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        メモ(任意)
      </label>
      <textarea
        id="memo"
        name="memo"
        rows={2}
        placeholder="例: 午前中に訪問予定"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      {state.status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          収集予定を登録しました！
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-slate-800 py-3.5 text-lg font-bold text-white transition hover:bg-slate-900 disabled:opacity-60"
      >
        {pending ? "登録中..." : "収集予定を登録する"}
      </button>
    </form>
  );
}
