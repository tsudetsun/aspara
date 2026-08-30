"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/profile";

type FarmRow = {
  id: string;
  name: string;
};

type YieldRow = {
  farm_id: string;
  amount_kg: number;
};

type CollectionRow = {
  id: string;
  farm_id: string;
  collected_on: string;
  amount_kg: number;
  staff_name: string;
  memo: string;
};

type FarmHistory = {
  id: string;
  name: string;
  totalYield: number;
  totalCollected: number;
  collectionCount: number;
  lastCollectedOn: string | null;
};

type CollectionWithFarm = CollectionRow & { farmName: string };

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(dateStr));
}

export default function AdminHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalCollected, setTotalCollected] = useState(0);
  const [farmHistories, setFarmHistories] = useState<FarmHistory[]>([]);
  const [collections, setCollections] = useState<CollectionWithFarm[]>([]);

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

      const [farmsResult, yieldResult, collectionsResult] = await Promise.all(
        [
          supabase.from("farms").select("id, name"),
          supabase.from("yield_records").select("farm_id, amount_kg"),
          supabase
            .from("collections")
            .select("id, farm_id, collected_on, amount_kg, staff_name, memo")
            .order("collected_on", { ascending: false })
            .order("created_at", { ascending: false }),
        ]
      );

      if (farmsResult.error) {
        console.error("[AdminHistoryPage] farms fetch failed:", farmsResult.error);
      }
      if (yieldResult.error) {
        console.error(
          "[AdminHistoryPage] yield_records fetch failed:",
          yieldResult.error
        );
      }
      if (collectionsResult.error) {
        console.error(
          "[AdminHistoryPage] collections fetch failed:",
          collectionsResult.error
        );
      }

      const farmRows = (farmsResult.data ?? []) as FarmRow[];
      const yieldRows = (yieldResult.data ?? []) as YieldRow[];
      const collectionRows = (collectionsResult.data ?? []) as CollectionRow[];

      const farmNameById = new Map<string, string>();
      const totalYieldByFarm = new Map<string, number>();
      const totalCollectedByFarm = new Map<string, number>();
      const collectionCountByFarm = new Map<string, number>();
      const lastCollectedOnByFarm = new Map<string, string>();

      for (const farm of farmRows) {
        farmNameById.set(farm.id, farm.name || "(名称未登録)");
      }
      for (const row of yieldRows) {
        totalYieldByFarm.set(
          row.farm_id,
          (totalYieldByFarm.get(row.farm_id) ?? 0) + row.amount_kg
        );
      }
      for (const row of collectionRows) {
        totalCollectedByFarm.set(
          row.farm_id,
          (totalCollectedByFarm.get(row.farm_id) ?? 0) + row.amount_kg
        );
        collectionCountByFarm.set(
          row.farm_id,
          (collectionCountByFarm.get(row.farm_id) ?? 0) + 1
        );
        const lastDate = lastCollectedOnByFarm.get(row.farm_id);
        if (!lastDate || row.collected_on > lastDate) {
          lastCollectedOnByFarm.set(row.farm_id, row.collected_on);
        }
      }

      const histories: FarmHistory[] = farmRows.map((farm) => ({
        id: farm.id,
        name: farm.name || "(名称未登録)",
        totalYield: totalYieldByFarm.get(farm.id) ?? 0,
        totalCollected: totalCollectedByFarm.get(farm.id) ?? 0,
        collectionCount: collectionCountByFarm.get(farm.id) ?? 0,
        lastCollectedOn: lastCollectedOnByFarm.get(farm.id) ?? null,
      }));

      setTotalCollected(
        collectionRows.reduce((sum, r) => sum + r.amount_kg, 0)
      );
      setFarmHistories(histories);
      setCollections(
        collectionRows.map((c) => ({
          ...c,
          farmName: farmNameById.get(c.farm_id) ?? "(不明な農家)",
        }))
      );
      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link href="/admin" className="text-sm text-slate-500">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            収集履歴
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* 現在の合計収集量 */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">現在の合計収集量</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">
            {totalCollected}
            <span className="ml-1 text-base font-normal text-slate-500">
              kg
            </span>
          </p>
        </section>

        {/* 農家ごとの履歴 */}
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            農家ごとの収集履歴
          </h2>
          {farmHistories.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              登録されている農家がまだありません。
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">農家</th>
                    <th className="py-2 pr-4 font-medium">発生量</th>
                    <th className="py-2 pr-4 font-medium">収集量</th>
                    <th className="py-2 pr-4 font-medium">収集回数</th>
                    <th className="py-2 font-medium">最終収集日</th>
                  </tr>
                </thead>
                <tbody>
                  {farmHistories.map((f) => (
                    <tr key={f.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        <Link
                          href={`/admin/farms/detail?id=${f.id}`}
                          className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
                        >
                          {f.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {f.totalYield}kg
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {f.totalCollected}kg
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        {f.collectionCount}回
                      </td>
                      <td className="py-2 text-slate-700">
                        {f.lastCollectedOn
                          ? formatDate(f.lastCollectedOn)
                          : "なし"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 収集記録一覧 */}
        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            収集記録一覧
          </h2>
          {collections.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              まだ収集記録がありません。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {collections.map((c) => (
                <li key={c.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {formatDate(c.collected_on)} ・ {c.farmName}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {c.amount_kg}kg
                    </span>
                  </div>
                  {(c.staff_name || c.memo) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[c.staff_name && `担当: ${c.staff_name}`, c.memo]
                        .filter(Boolean)
                        .join(" ・ ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
