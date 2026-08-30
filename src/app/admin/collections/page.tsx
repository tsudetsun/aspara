"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserRole } from "@/lib/supabase/profile";
import CollectionForm, { type CollectionFarmOption } from "./collection-form";

type FarmRow = {
  id: string;
  name: string;
  capacity_kg: number;
  current_stock_kg: number;
};

type CollectionRow = {
  id: string;
  farm_id: string;
  collected_on: string;
  amount_kg: number;
  staff_name: string;
  memo: string;
};

type CollectionWithFarm = CollectionRow & { farmName: string };

const RECENT_COLLECTIONS_LIMIT = 10;

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(dateStr));
}

function AdminCollectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultFarmId = searchParams.get("farmId");

  const [loading, setLoading] = useState(true);
  const [farmOptions, setFarmOptions] = useState<CollectionFarmOption[]>([]);
  const [recentCollections, setRecentCollections] = useState<
    CollectionWithFarm[]
  >([]);
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

      const [farmsResult, collectionsResult] = await Promise.all([
        supabase
          .from("farms")
          .select("id, name, capacity_kg, current_stock_kg"),
        supabase
          .from("collections")
          .select("id, farm_id, collected_on, amount_kg, staff_name, memo")
          .order("collected_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(RECENT_COLLECTIONS_LIMIT),
      ]);

      if (farmsResult.error) {
        console.error(
          "[AdminCollectionsPage] farms fetch failed:",
          farmsResult.error
        );
      }
      if (collectionsResult.error) {
        console.error(
          "[AdminCollectionsPage] collections fetch failed:",
          collectionsResult.error
        );
      }

      const farmRows = (farmsResult.data ?? []) as FarmRow[];
      const collectionRows = (collectionsResult.data ?? []) as CollectionRow[];

      const farmNameById = new Map<string, string>();
      const options: CollectionFarmOption[] = farmRows.map((farm) => {
        farmNameById.set(farm.id, farm.name || "(名称未登録)");
        return {
          id: farm.id,
          name: farm.name || "(名称未登録)",
          currentStock: farm.current_stock_kg,
          capacity: farm.capacity_kg,
        };
      });

      setFarmOptions(options);
      setRecentCollections(
        collectionRows.map((c) => ({
          ...c,
          farmName: farmNameById.get(c.farm_id) ?? "(不明な農家)",
        }))
      );
      setLoading(false);
    }

    loadData();
  }, [router, reloadKey]);

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
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <Link href="/admin" className="text-sm text-slate-500">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            収集量の登録
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            収集した量を登録すると、その農家の現在保管量から自動的に差し引かれます。
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            新しい収集記録
          </h2>
          <div className="mt-4">
            <CollectionForm
              farms={farmOptions}
              defaultFarmId={defaultFarmId}
              onSuccess={reload}
            />
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            最近の収集記録
          </h2>
          {recentCollections.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              まだ収集記録がありません。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentCollections.map((c) => (
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

export default function AdminCollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      }
    >
      <AdminCollectionsContent />
    </Suspense>
  );
}
