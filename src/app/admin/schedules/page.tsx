"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/profile";
import {
  predictFarmStatus,
  recommendedDateString,
  type Priority,
} from "@/lib/farm-status";
import ScheduleForm, { type ScheduleFarmOption } from "./schedule-form";
import { deleteSchedule } from "./actions";

type FarmRow = {
  id: string;
  name: string;
  capacity_kg: number;
  current_stock_kg: number;
};

type YieldRow = {
  farm_id: string;
  amount_kg: number;
};

type ScheduleRow = {
  id: string;
  farm_id: string;
  scheduled_date: string;
  memo: string;
};

type ScheduleWithFarm = ScheduleRow & { farmName: string };

const YIELD_HISTORY_DAYS = 30;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(dateStr));
}

function AdminSchedulesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultFarmId = searchParams.get("farmId");

  const [loading, setLoading] = useState(true);
  const [farmOptions, setFarmOptions] = useState<ScheduleFarmOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithFarm[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
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

      const [farmsResult, yieldResult, schedulesResult] = await Promise.all([
        supabase
          .from("farms")
          .select("id, name, capacity_kg, current_stock_kg"),
        supabase
          .from("yield_records")
          .select("farm_id, amount_kg")
          .gte("occurred_on", historyStart.toISOString().slice(0, 10)),
        supabase
          .from("collection_schedules")
          .select("id, farm_id, scheduled_date, memo")
          .gte("scheduled_date", todayString())
          .order("scheduled_date", { ascending: true }),
      ]);

      if (farmsResult.error) {
        console.error("[AdminSchedulesPage] farms fetch failed:", farmsResult.error);
      }
      if (yieldResult.error) {
        console.error(
          "[AdminSchedulesPage] yield_records fetch failed:",
          yieldResult.error
        );
      }
      if (schedulesResult.error) {
        console.error(
          "[AdminSchedulesPage] collection_schedules fetch failed:",
          schedulesResult.error
        );
      }

      const farmRows = (farmsResult.data ?? []) as FarmRow[];
      const yieldRows = (yieldResult.data ?? []) as YieldRow[];
      const scheduleRows = (schedulesResult.data ?? []) as ScheduleRow[];

      const avgDailyYieldByFarm = new Map<string, number>();
      for (const row of yieldRows) {
        avgDailyYieldByFarm.set(
          row.farm_id,
          (avgDailyYieldByFarm.get(row.farm_id) ?? 0) + row.amount_kg
        );
      }
      for (const [farmId, totalKg] of avgDailyYieldByFarm) {
        avgDailyYieldByFarm.set(farmId, totalKg / YIELD_HISTORY_DAYS);
      }

      const farmNameById = new Map<string, string>();
      const options: ScheduleFarmOption[] = farmRows.map((farm) => {
        farmNameById.set(farm.id, farm.name || "(名称未登録)");
        const prediction = predictFarmStatus(
          farm.capacity_kg,
          farm.current_stock_kg,
          avgDailyYieldByFarm.get(farm.id) ?? 0
        );
        return {
          id: farm.id,
          name: farm.name || "(名称未登録)",
          priority: prediction.priority as Priority,
          predictedLabel: prediction.predictedLabel,
          recommendedDate: recommendedDateString(prediction.recommendedDays),
        };
      });

      const priorityOrder: Record<Priority, number> = { urgent: 0, soon: 1, safe: 2 };
      options.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setFarmOptions(options);
      setSchedules(
        scheduleRows.map((s) => ({
          ...s,
          farmName: farmNameById.get(s.farm_id) ?? "(不明な農家)",
        }))
      );
      setLoading(false);
    }

    loadData();
  }, [router, reloadKey]);

  async function handleDelete(id: string) {
    const { error } = await deleteSchedule(id);
    if (error) {
      window.alert(error);
      return;
    }
    reload();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    );
  }

  const defaultDate =
    farmOptions.find((f) => f.id === defaultFarmId)?.recommendedDate ||
    farmOptions[0]?.recommendedDate ||
    todayString();

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <Link href="/admin" className="text-sm text-slate-500">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            収集予定の登録
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            システムが計算した収集推奨日を参考に、収集予定を登録できます。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            新しい収集予定
          </h2>
          <div className="mt-4">
            <ScheduleForm
              farms={farmOptions}
              defaultDate={defaultDate}
              defaultFarmId={defaultFarmId}
              onSuccess={reload}
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            登録済みの収集予定
          </h2>
          {schedules.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              まだ収集予定が登録されていません。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDate(s.scheduled_date)} ・ {s.farmName}
                    </p>
                    {s.memo && (
                      <p className="mt-0.5 text-xs text-slate-500">{s.memo}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="shrink-0 text-xs text-red-600 underline"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AdminSchedulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      }
    >
      <AdminSchedulesContent />
    </Suspense>
  );
}
