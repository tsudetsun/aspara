"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-lg md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-slate-900 p-10 text-white md:flex">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-400">
              Admin Console
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight">
              アスパラガス
              <br />
              収集管理システム
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            農家の保管状況を把握し、収集タイミングを判断する運営者向け管理画面です。
          </p>
        </div>

        <div className="flex flex-col justify-center p-10">
          <h2 className="mb-1 text-xl font-semibold text-slate-900">
            管理者ログイン
          </h2>
          <p className="mb-8 text-sm text-slate-500">
            運営スタッフ用アカウントでログインしてください。
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="admin@example.com"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            農家の方は
            <Link href="/login/farmer" className="ml-1 underline">
              こちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
