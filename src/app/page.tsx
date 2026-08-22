import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4">
      <h1 className="text-center text-2xl font-bold text-slate-900">
        アスパラガス収集管理アプリ
      </h1>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/login/farmer"
          className="rounded-xl bg-green-700 px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-green-800"
        >
          農家の方はこちら
        </Link>
        <Link
          href="/login/admin"
          className="rounded-xl bg-slate-900 px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-slate-800"
        >
          運営の方はこちら
        </Link>
      </div>
    </div>
  );
}
