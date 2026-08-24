"use client";

import { useActionState, useRef, useState } from "react";
import { registerYield, type RegisterYieldState } from "./actions";

const QUICK_AMOUNTS = [1, 3, 5, 10];

const initialState: RegisterYieldState = { status: "idle" };

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function YieldForm() {
  const [state, formAction, pending] = useActionState(
    registerYield,
    initialState
  );
  const [amount, setAmount] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // 登録成功直後は入力欄をクリアする(effectを使わずレンダー中に同期)
  const [lastStatus, setLastStatus] = useState(state.status);
  if (state.status !== lastStatus) {
    setLastStatus(state.status);
    if (state.status === "success") {
      setAmount("");
    }
  }

  return (
    <form ref={formRef} action={formAction} className="mt-4">
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((kg) => (
          <button
            key={kg}
            type="button"
            onClick={() => setAmount(String(kg))}
            className={`rounded-xl border py-3 text-base font-semibold transition ${
              amount === String(kg)
                ? "border-green-600 bg-green-600 text-white"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {kg}kg
          </button>
        ))}
      </div>

      <label htmlFor="amount_kg" className="mt-4 block text-sm font-medium text-slate-700">
        発生量 (kg)
      </label>
      <input
        id="amount_kg"
        name="amount_kg"
        type="number"
        inputMode="decimal"
        min="0.1"
        step="0.1"
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="例: 5"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />

      <label htmlFor="occurred_on" className="mt-4 block text-sm font-medium text-slate-700">
        発生日
      </label>
      <input
        id="occurred_on"
        name="occurred_on"
        type="date"
        defaultValue={todayString()}
        max={todayString()}
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />

      {state.status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          登録しました！
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-green-700 py-3.5 text-lg font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
      >
        {pending ? "登録中..." : "登録する"}
      </button>
    </form>
  );
}
