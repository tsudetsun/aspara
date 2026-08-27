import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CapacityForm from "./capacity-form";
import FarmInfoForm from "./farm-info-form";

type Farm = {
  name: string;
  address: string;
  phone: string;
  capacity_kg: number;
  current_stock_kg: number;
  memo: string;
};

export default async function FarmerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/farmer");
  }

  const { data, error } = await supabase
    .from("farms")
    .select("name, address, phone, capacity_kg, current_stock_kg, memo")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[FarmerProfilePage] farms select failed:", error);
  }

  const farm = (data ?? {
    name: "",
    address: "",
    phone: "",
    capacity_kg: 0,
    current_stock_kg: 0,
    memo: "",
  }) as Farm;

  return (
    <div className="min-h-screen bg-green-50 pb-16">
      <header className="border-b border-green-100 bg-white px-4 py-5">
        <Link href="/farmer" className="text-sm text-green-700">
          ← マイページに戻る
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          農家情報の登録・編集
        </h1>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        {/* 保管可能量 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">保管可能量</h2>
          <p className="mt-1 text-sm text-slate-500">
            最大で保管できる量を設定してください。
          </p>
          <div className="mt-4">
            <CapacityForm capacityKg={farm.capacity_kg} />
          </div>
        </section>

        {/* 農家情報 */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">農家情報</h2>
          <p className="mt-1 text-sm text-slate-500">
            農家名・連絡先などの基本情報を登録してください。
          </p>
          <div className="mt-4">
            <FarmInfoForm
              name={farm.name}
              address={farm.address}
              phone={farm.phone}
              memo={farm.memo}
            />
          </div>
        </section>

        {/* 現在の保管量(参考表示のみ) */}
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            現在の保管量
          </h2>
          <p className="mt-2 text-2xl font-bold text-green-900">
            {farm.current_stock_kg}
            <span className="ml-1 text-base font-normal text-slate-500">
              kg
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            発生量の登録により自動的に計算されます。マイページから登録できます。
          </p>
        </section>
      </main>
    </div>
  );
}
