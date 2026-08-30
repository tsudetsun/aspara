"use client";

import { useActionState, useEffect } from "react";
import { createCollection, type CreateCollectionState } from "./actions";

export type CollectionFarmOption = {
  id: string;
  name: string;
  currentStock: number;
  capacity: number;
};

const initialState: CreateCollectionState = { status: "idle" };

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function CollectionForm({
  farms,
  defaultFarmId,
  onSuccess,
}: {
  farms: CollectionFarmOption[];
  defaultFarmId?: string | null;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createCollection,
    initialState
  );

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction}>
      <label
        htmlFor="farm_id"
        className="block text-sm font-medium text-slate-700"
      >
        収集した農家
      </label>
      <select
        id="farm_id"
        name="farm_id"
        required
        defaultValue={defaultFarmId ?? ""}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <option value="" disabled>
          選択してください
        </option>
        {farms.map((farm) => (
          <option key={farm.id} value={farm.id}>
            {farm.name}(現在 {farm.currentStock}kg / 上限 {farm.capacity}kg)
          </option>
        ))}
      </select>

      <label
        htmlFor="amount_kg"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        収集量 (kg)
      </label>
      <input
        id="amount_kg"
        name="amount_kg"
        type="number"
        inputMode="decimal"
        min="0.1"
        step="0.1"
        required
        placeholder="例: 25"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <label
        htmlFor="collected_on"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        収集日
      </label>
      <input
        id="collected_on"
        name="collected_on"
        type="date"
        defaultValue={todayString()}
        max={todayString()}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      <label
        htmlFor="staff_name"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        担当者(任意)
      </label>
      <input
        id="staff_name"
        name="staff_name"
        type="text"
        placeholder="例: 山田"
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
        placeholder="例: 全量回収"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />

      {state.status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          収集量を登録しました！保管量は自動的に更新されます。
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-slate-800 py-3.5 text-lg font-bold text-white transition hover:bg-slate-900 disabled:opacity-60"
      >
        {pending ? "登録中..." : "収集量を登録する"}
      </button>
    </form>
  );
}
