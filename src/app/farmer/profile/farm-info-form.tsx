"use client";

import { useActionState, useEffect } from "react";
import { updateFarmInfo, type UpdateFarmState } from "./actions";

const initialState: UpdateFarmState = { status: "idle" };

export default function FarmInfoForm({
  name,
  address,
  phone,
  memo,
  onSuccess,
}: {
  name: string;
  address: string;
  phone: string;
  memo: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateFarmInfo,
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
      <label htmlFor="name" className="block text-sm font-medium text-slate-700">
        農家名
      </label>
      <input
        id="name"
        name="name"
        type="text"
        required
        defaultValue={name}
        placeholder="例: 山田農園"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />

      <label
        htmlFor="address"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        住所
      </label>
      <input
        id="address"
        name="address"
        type="text"
        defaultValue={address}
        placeholder="例: 北海道○○市○○町1-2-3"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />

      <label
        htmlFor="phone"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        電話番号
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        defaultValue={phone}
        placeholder="例: 090-1234-5678"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
      />

      <label
        htmlFor="memo"
        className="mt-4 block text-sm font-medium text-slate-700"
      >
        メモ
      </label>
      <textarea
        id="memo"
        name="memo"
        rows={3}
        defaultValue={memo}
        placeholder="必要に応じて入力してください"
        className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
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
