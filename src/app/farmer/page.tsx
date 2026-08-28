"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import YieldForm from "./yield-form";

type Farm = {
  id: string;
  name: string;
  capacity_kg: number;
  current_stock_kg: number;
};

type YieldRecord = {
  id: string;
  occurred_on: string;
  amount_kg: number;
};

function formatToday() {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(dateStr));
}

export default function FarmerHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [recentRecords, setRecentRecords] = useState<YieldRecord[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login/farmer");
        return;
      }

      // 初回ログイン時など、profile がまだ無ければ farmer として自動登録する
      const profileResult = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!profileResult.data) {
        const { error } = await supabase
          .from("profiles")
          .insert({ id: user.id, role: "farmer" });
        if (error) {
          console.error("[FarmerHomePage] profile insert failed:", error);
        }
      }

      const selectResult = await supabase
        .from("farms")
        .select("id, name, capacity_kg, current_stock_kg")
        .eq("id", user.id)
        .maybeSingle();
      if (selectResult.error) {
        console.error("[FarmerHomePage] farms select failed:", selectResult.error);
      }
      let farmData = selectResult.data as Farm | null;

      if (!farmData) {
        // 初回ログイン時など、農家レコードがまだ無ければ空の状態で自動作成する
        const insertResult = await supabase
          .from("farms")
          .insert({ id: user.id })
          .select("id, name, capacity_kg, current_stock_kg")
          .single();
        if (insertResult.error) {
          console.error("[FarmerHomePage] farms insert failed:", insertResult.error);
        }
        farmData = insertResult.data as Farm | null;
      }

      const { data: records } = await supabase
        .from("yield_records")
        .select("id, occurred_on, amount_kg")
        .eq("farm_id", user.id)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      setFarm(farmData);
      setRecentRecords((records ?? []) as YieldRecord[]);
      setLoading(false);
    }

    loadData();
  }, [router, reloadKey]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50">
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    );
  }

  const capacity = farm?.capacity_kg ?? 0;
  const currentStock = farm?.current_stock_kg ?? 0;
  const remaining = capacity - currentStock;
  const percent =
    capacity > 0 ? Math.min(Math.round((currentStock / capacity) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-green-50 pb-16">
      <header className="border-b border-green-100 bg-white px-4 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{formatToday()}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              {farm?.name ? `${farm.name} さん` : "マイページ"}
            </h1>
          </div>
          <Link
            href="/farmer/profile"
            className="mt-1 shrink-0 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800"
          >
            農家情報を編集
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        {/* 保管状況 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">現在の保管量</p>
          <p className="mt-1 text-4xl font-bold text-green-900">
            {currentStock}
            <span className="ml-1 text-lg font-normal text-slate-500">kg</span>
          </p>

          {capacity > 0 ? (
            <>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-green-100">
                <div
                  className={`h-full rounded-full ${
                    percent >= 90
                      ? "bg-red-500"
                      : percent >= 60
                        ? "bg-amber-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                保管上限 {capacity}kg まで、あと{" "}
                <span className="font-semibold text-slate-700">
                  {Math.max(remaining, 0)}kg
                </span>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              保管可能量が未設定です。運営に確認してください。
            </p>
          )}
        </section>

        {/* 発生量登録 */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            規格外アスパラガスを登録
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            今日発生した量を選ぶか、入力してください。
          </p>
          <YieldForm onSuccess={reload} />
        </section>

        {/* 最近の登録履歴 */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            最近の登録
          </h2>
          {recentRecords.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              まだ登録がありません。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentRecords.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-500">
                    {formatDate(r.occurred_on)}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {r.amount_kg}kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
