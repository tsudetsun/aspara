"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/profile";
import { PRIORITY_INFO, predictFarmStatus } from "@/lib/farm-status";

type Farm = {
  id: string;
  name: string;
  address: string;
  phone: string;
  capacity_kg: number;
  current_stock_kg: number;
  memo: string;
};

type YieldRecord = {
  id: string;
  occurred_on: string;
  amount_kg: number;
};

type ScheduleRecord = {
  id: string;
  scheduled_date: string;
  memo: string;
};

type CollectionRecord = {
  id: string;
  collected_on: string;
  amount_kg: number;
  staff_name: string;
};

const YIELD_HISTORY_DAYS = 30;
const RECENT_RECORDS_LIMIT = 10;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(dateStr));
}

function AdminFarmDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [recentRecords, setRecentRecords] = useState<YieldRecord[]>([]);
  const [avgDailyYield, setAvgDailyYield] = useState(0);
  const [upcomingSchedules, setUpcomingSchedules] = useState<ScheduleRecord[]>([]);
  const [recentCollections, setRecentCollections] = useState<CollectionRecord[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login/admin");
        return;
      }

      const role = await getUserRole(supabase, user.id);
      if (role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/login/admin");
        return;
      }

      const historyStart = new Date();
      historyStart.setDate(historyStart.getDate() - YIELD_HISTORY_DAYS);

      const [
        farmResult,
        recentYieldResult,
        historyYieldResult,
        scheduleResult,
        collectionResult,
      ] = await Promise.all([
        supabase
          .from("farms")
          .select(
            "id, name, address, phone, capacity_kg, current_stock_kg, memo"
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("yield_records")
          .select("id, occurred_on, amount_kg")
          .eq("farm_id", id)
          .order("occurred_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(RECENT_RECORDS_LIMIT),
        supabase
          .from("yield_records")
          .select("amount_kg")
          .eq("farm_id", id)
          .gte("occurred_on", historyStart.toISOString().slice(0, 10)),
        supabase
          .from("collection_schedules")
          .select("id, scheduled_date, memo")
          .eq("farm_id", id)
          .gte("scheduled_date", todayString())
          .order("scheduled_date", { ascending: true }),
        supabase
          .from("collections")
          .select("id, collected_on, amount_kg, staff_name")
          .eq("farm_id", id)
          .order("collected_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(RECENT_RECORDS_LIMIT),
      ]);

      if (farmResult.error) {
        console.error("[AdminFarmDetailPage] farm fetch failed:", farmResult.error);
      }
      if (scheduleResult.error) {
        console.error(
          "[AdminFarmDetailPage] collection_schedules fetch failed:",
          scheduleResult.error
        );
      }
      if (collectionResult.error) {
        console.error(
          "[AdminFarmDetailPage] collections fetch failed:",
          collectionResult.error
        );
      }

      const farmData = farmResult.data as Farm | null;
      if (!farmData) {
        setLoading(false);
        return;
      }

      const historyTotal = (historyYieldResult.data ?? []).reduce(
        (sum, r) => sum + (r as { amount_kg: number }).amount_kg,
        0
      );

      setFarm(farmData);
      setRecentRecords((recentYieldResult.data ?? []) as YieldRecord[]);
      setAvgDailyYield(historyTotal / YIELD_HISTORY_DAYS);
      setUpcomingSchedules((scheduleResult.data ?? []) as ScheduleRecord[]);
      setRecentCollections((collectionResult.data ?? []) as CollectionRecord[]);
      setLoading(false);
    }

    loadData();
  }, [id, router]);

  if (!id || (!loading && !farm)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
        <p className="text-sm text-slate-500">農家が見つかりませんでした。</p>
        <Link href="/admin" className="text-sm text-blue-700 hover:underline">
          ← ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (!farm) {
    return null;
  }

  const { priority, predictedLabel } = predictFarmStatus(
    farm.capacity_kg,
    farm.current_stock_kg,
    avgDailyYield
  );
  const info = PRIORITY_INFO[priority];
  const remaining = farm.capacity_kg - farm.current_stock_kg;
  const percent =
    farm.capacity_kg > 0
      ? Math.min(Math.round((farm.current_stock_kg / farm.capacity_kg) * 100), 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <Link href="/admin" className="text-sm text-slate-500">
            ← ダッシュボードに戻る
          </Link>
          <div className="mt-1 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">
              {farm.name || "(名称未登録)"}
            </h1>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.badge}`}
            >
              {info.emoji} {info.label}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* 保管状況 */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">保管状況</h2>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {farm.current_stock_kg}
              <span className="ml-1 text-base font-normal text-slate-500">
                kg
              </span>
            </p>
            <p className="text-sm text-slate-500">
              保管上限 {farm.capacity_kg}kg
            </p>
          </div>

          {farm.capacity_kg > 0 ? (
            <>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
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
                残り{" "}
                <span className="font-semibold text-slate-700">
                  {Math.max(remaining, 0)}kg
                </span>{" "}
                ・ 予測: {predictedLabel}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">保管上限が未設定です。</p>
          )}
        </section>

        {/* 収集予定 */}
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              収集予定
            </h2>
            <Link
              href={`/admin/schedules?farmId=${farm.id}`}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              予定を登録する →
            </Link>
          </div>
          {upcomingSchedules.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              まだ収集予定が登録されていません。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {upcomingSchedules.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <span className="font-semibold text-slate-900">
                    {formatDate(s.scheduled_date)}
                  </span>
                  {s.memo && (
                    <span className="ml-2 text-slate-500">{s.memo}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 収集記録 */}
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              収集記録
            </h2>
            <Link
              href={`/admin/collections?farmId=${farm.id}`}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              収集量を登録する →
            </Link>
          </div>
          {recentCollections.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              まだ収集記録がありません。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentCollections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-slate-500">
                    {formatDate(c.collected_on)}
                    {c.staff_name && ` ・ ${c.staff_name}`}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {c.amount_kg}kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 基本情報 */}
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">基本情報</h2>
          <dl className="mt-3 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">住所</dt>
              <dd className="text-right text-slate-900">
                {farm.address || "未登録"}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">電話番号</dt>
              <dd className="text-right text-slate-900">
                {farm.phone || "未登録"}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">メモ</dt>
              <dd className="text-right whitespace-pre-wrap text-slate-900">
                {farm.memo || "なし"}
              </dd>
            </div>
          </dl>
        </section>

        {/* 発生量の登録履歴 */}
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            最近の発生量登録
          </h2>
          {recentRecords.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">まだ登録がありません。</p>
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

export default function AdminFarmDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      }
    >
      <AdminFarmDetailContent />
    </Suspense>
  );
}
