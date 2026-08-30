"use client";

import { useActionState, useEffect } from "react";
import { updateCapacity, type UpdateFarmState } from "./actions";

const initialState: UpdateFarmState = { status: "idle" };

export default function CapacityForm({
  capacityKg,
  onSuccess,
}: {
  capacityKg: number;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateCapacity,
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
        htmlFor="capacity_kg"
        className="block text-sm font-medium text-slate-700"
      >
        保管可能量 (kg)
      </label>
      <input
        id="capacity_kg"
        name="capacity_kg"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.1"
        required
        defaultValue={capacityKg}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />

      {state.status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          保存しました！
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-green-700 py-3.5 text-lg font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
      >
        {pending ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
