"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";

const QUICK_TEST_ACCOUNTS = [
  {
    name: "Alex Morgan",
    role: "ORG_ADMIN",
    email: "alex.morgan@centvis.com",
  },
  {
    name: "Rachel Green",
    role: "SCRUM_MASTER",
    email: "rachel.green@centvis.com",
  },
  {
    name: "Lucas Silva",
    role: "DEVELOPER",
    email: "lucas.silva@centvis.com",
  },
];

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("alex.morgan@centvis.com");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (result?.error) {
        setErrorMessage("Invalid email or password. Verify credentials and try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsSsoLoading(true);
    await signIn("microsoft-entra-id", { callbackUrl });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-2xl shadow-xl shadow-blue-500/25">
            C
          </div>
          <div className="flex items-center justify-center space-x-1.5 pt-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Centraxis
            </h1>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase tracking-wider">
              Centvis
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Sign in to access your enterprise Agile boards and AI story agent
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 space-y-6">
          {/* 1. Microsoft Entra ID SSO Button */}
          <div className="space-y-2">
            <button
              onClick={handleMicrosoftLogin}
              disabled={isSsoLoading}
              className="flex w-full items-center justify-center space-x-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] disabled:opacity-50"
            >
              {isSsoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
              )}
              <span>Sign in with Microsoft Entra ID</span>
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Requires tenant Azure AD corporate credentials
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Local Dev Bypass
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center space-x-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 2. Credentials Form (Development Mode Bypass) */}
          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@centvis.com"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Default: password123
                </span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Credentials</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Seeded Accounts */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-slate-600">
              <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
              <span>Quick Test Accounts (Click to fill)</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_TEST_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("password123");
                  }}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-left text-xs transition hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <span className="font-medium text-slate-800">{acc.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Centraxis by Centvis &middot; Local Testing Mode &middot; Port 3000
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex items-center space-x-2 text-sm text-slate-500 font-medium">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading authentication...</span>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
