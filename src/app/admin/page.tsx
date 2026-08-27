import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRIORITY_INFO, predictFarmStatus, type Priority } from "@/lib/farm-status";

type FarmRow = {
  id: string;
  name: string;
  address: string;
  capacity_kg: number;
  current_stock_kg: number;
};

type YieldRow = {
  farm_id: string;
  amount_kg: number;
  occurred_on: string;
};

type FarmStatus = {
  id: string;
  name: string;
  address: string;
  currentStock: number; // kg
  capacity: number; // kg
  predictedLabel: string; // 例: "今日中", "2日後", "予測不可"
  priority: Priority;
};

const YIELD_HISTORY_DAYS = 30;

function formatToday() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function buildFarmStatus(farm: FarmRow, avgDailyYield: number): FarmStatus {
  const currentStock = farm.current_stock_kg;
  const capacity = farm.capacity_kg;
  const prediction = predictFarmStatus(capacity, currentStock, avgDailyYield);

  return {
    id: farm.id,
    name: farm.name || "(名称未登録)",
    address: farm.address || "住所未登録",
    currentStock,
    capacity,
    ...prediction,
  };
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/admin");
  }

  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - YIELD_HISTORY_DAYS);

  const [farmsResult, yieldResult] = await Promise.all([
    supabase
      .from("farms")
      .select("id, name, address, capacity_kg, current_stock_kg"),
    supabase
      .from("yield_records")
      .select("farm_id, amount_kg, occurred_on")
      .gte("occurred_on", historyStart.toISOString().slice(0, 10)),
  ]);

  if (farmsResult.error) {
    console.error("[AdminHomePage] farms fetch failed:", farmsResult.error);
  }
  if (yieldResult.error) {
    console.error(
      "[AdminHomePage] yield_records fetch failed:",
      yieldResult.error,
    );
  }

  const farmRows = (farmsResult.data ?? []) as FarmRow[];
  const yieldRows = (yieldResult.data ?? []) as YieldRow[];

  const avgDailyYieldByFarm = new Map<string, number>();
  for (const row of yieldRows) {
    avgDailyYieldByFarm.set(
      row.farm_id,
      (avgDailyYieldByFarm.get(row.farm_id) ?? 0) + row.amount_kg,
    );
  }
  for (const [farmId, totalKg] of avgDailyYieldByFarm) {
    avgDailyYieldByFarm.set(farmId, totalKg / YIELD_HISTORY_DAYS);
  }

  const fillRatio = (f: FarmStatus) =>
    f.capacity > 0 ? f.currentStock / f.capacity : -1;

  const farms = farmRows
    .map((farm) => buildFarmStatus(farm, avgDailyYieldByFarm.get(farm.id) ?? 0))
    .sort((a, b) => fillRatio(b) - fillRatio(a));

  const today = todayString();
  const todaysYieldRows = yieldRows.filter((r) => r.occurred_on === today);
  const todaysYield = {
    totalKg: todaysYieldRows.reduce((sum, r) => sum + r.amount_kg, 0),
    farmCount: new Set(todaysYieldRows.map((r) => r.farm_id)).size,
  };

  const urgentFarms = farms.filter((f) => f.priority === "urgent");
  const totalStock = farms.reduce((sum, f) => sum + f.currentStock, 0);
  const totalCapacity = farms.reduce((sum, f) => sum + f.capacity, 0);
  const needsCollectionCount = farms.filter(
    (f) => f.priority !== "safe",
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-sm text-slate-500">{formatToday()}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            運営ダッシュボード
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* 今日、どこへ収集に行くべきか */}
        <section className="mb-10 rounded-2xl border-2 border-red-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            🚚 今日、どこへ収集に行くべきか
          </h2>

          {urgentFarms.length === 0 ? (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-6 text-center text-sm font-medium text-green-700">
              本日、最優先で収集が必要な農家はありません。
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {urgentFarms.map((farm) => {
                const remaining = farm.capacity - farm.currentStock;
                const percent =
                  farm.capacity > 0
                    ? Math.round((farm.currentStock / farm.capacity) * 100)
                    : 0;
                return (
                  <div
                    key={farm.id}
                    className="rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900">
                        {PRIORITY_INFO.urgent.emoji} {farm.name}
                      </p>
                      <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                        {farm.predictedLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {farm.address}
                    </p>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>
                          現在 {farm.currentStock}kg / 上限 {farm.capacity}kg
                        </span>
                        <span>残り {Math.max(remaining, 0)}kg</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/admin/farms/${farm.id}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline"
                    >
                      農家の詳細を見る →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ざっと確認できる項目 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">登録農家数</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {farms.length}
              <span className="ml-1 text-base font-normal text-slate-500">
                件
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">現在の総保管量</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalStock}
              <span className="ml-1 text-base font-normal text-slate-500">
                kg
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">総保管可能量</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalCapacity}
              <span className="ml-1 text-base font-normal text-slate-500">
                kg
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">本日の発生量</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {todaysYield.totalKg}
              <span className="ml-1 text-base font-normal text-slate-500">
                kg
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {todaysYield.farmCount}件の農家から登録
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">本日の収集予定</p>
            <p className="mt-2 text-sm text-slate-400">
              収集予定機能は準備中です
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">収集が必要な農家数</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {needsCollectionCount}
              <span className="ml-1 text-base font-normal text-slate-500">
                件
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">最優先で収集すべき農家</p>
            {urgentFarms.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">なし</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {urgentFarms.map((farm) => (
                  <li key={farm.id} className="text-sm text-slate-700">
                    {PRIORITY_INFO.urgent.emoji} {farm.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 農家別の状況一覧 */}
        <section className="mt-10 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            農家別の保管状況
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            農家名または「詳細を見る」から、住所・連絡先などの詳細ページを確認できます。
          </p>
          {farms.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              登録されている農家がまだありません。
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">農家</th>
                    <th className="py-2 pr-4 font-medium">現在量</th>
                    <th className="py-2 pr-4 font-medium">保管上限</th>
                    <th className="py-2 pr-4 font-medium">残り容量</th>
                    <th className="py-2 pr-4 font-medium">予測</th>
                    <th className="py-2 pr-4 font-medium">優先度</th>
                    <th className="py-2 font-medium">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => {
                    const info = PRIORITY_INFO[farm.priority];
                    return (
                      <tr key={farm.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium text-slate-900">
                          <Link
                            href={`/admin/farms/${farm.id}`}
                            className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
                          >
                            {farm.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-4 text-slate-700">
                          {farm.currentStock}kg
                        </td>
                        <td className="py-2 pr-4 text-slate-700">
                          {farm.capacity}kg
                        </td>
                        <td className="py-2 pr-4 text-slate-700">
                          {Math.max(farm.capacity - farm.currentStock, 0)}kg
                        </td>
                        <td className="py-2 pr-4 text-slate-700">
                          {farm.predictedLabel}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${info.badge}`}
                          >
                            {info.emoji} {info.label}
                          </span>
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/admin/farms/${farm.id}`}
                            className="whitespace-nowrap text-sm font-semibold text-blue-700 hover:underline"
                          >
                            詳細を見る →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
