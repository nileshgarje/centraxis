"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { CentvisLogo } from "@centraxis/ui";
import { api } from "~/trpc/react";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();

  const initialEmail = searchParams.get("email") || session?.user?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(8).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update email if session loads later
  useEffect(() => {
    if (!email && session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session, email]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown((prev) => prev - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input box
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // TRPC mutations
  const sendCodeMutation = api.auth.sendCode.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(data.message);
      setErrorMessage(null);
      setResendCooldown(60);
      if (data.simulatedCode) {
        setSimulatedCode(data.simulatedCode);
      }
    },
    onError: (err) => {
      setErrorMessage(err.message || "Failed to send verification code.");
      setSuccessMessage(null);
    },
  });

  const verifyCodeMutation = api.auth.verifyCode.useMutation({
    onError: (err) => {
      setErrorMessage(err.message || "Invalid or expired verification code.");
      setIsSubmitting(false);
    },
  });

  const fullCode = digits.join("");

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric characters
    const cleanValue = value.replace(/\D/g, "");

    // If pasted multiple digits
    if (cleanValue.length > 1) {
      const pasteDigits = cleanValue.slice(0, 8).split("");
      const newDigits = [...digits];
      for (let i = 0; i < 8; i++) {
        if (pasteDigits[i]) {
          newDigits[i] = pasteDigits[i]!;
        }
      }
      setDigits(newDigits);
      const nextIndex = Math.min(pasteDigits.length, 7);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleanValue && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const pasteDigits = pasted.slice(0, 8).split("");
    const newDigits = [...digits];
    for (let i = 0; i < 8; i++) {
      if (pasteDigits[i]) {
        newDigits[i] = pasteDigits[i]!;
      }
    }
    setDigits(newDigits);
    const targetFocus = Math.min(pasteDigits.length, 7);
    inputRefs.current[targetFocus]?.focus();
  };

  const handleResendCode = async () => {
    if (!email || resendCooldown > 0) return;
    setErrorMessage(null);
    sendCodeMutation.mutate({ email });
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMessage("Please specify a valid email address.");
      return;
    }
    if (fullCode.length !== 8) {
      setErrorMessage("Please enter all 8 digits of the verification code.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (status === "authenticated") {
        // User already has an Entra ID SSO session; verify email in database and refresh session
        await verifyCodeMutation.mutateAsync({
          email,
          code: fullCode,
        });
        setSuccessMessage("Email verified successfully! Granting access...");
        await update();
        router.replace("/");
        router.refresh();
      } else {
        // Unauthenticated; atomically verify 8-digit code and establish session
        const signInResult = await signIn("email-otp", {
          redirect: false,
          email,
          code: fullCode,
          callbackUrl: "/",
        });

        if (signInResult?.error) {
          setErrorMessage(
            "Invalid or expired verification code. Please check and try again.",
          );
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage("Email verified successfully! Granting access...");
        router.replace("/");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Invalid or expired code. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  const quickFillCode = (code: string) => {
    const chars = code.slice(0, 8).split("");
    const newDigits = Array(8).fill("");
    for (let i = 0; i < chars.length; i++) {
      newDigits[i] = chars[i];
    }
    setDigits(newDigits);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <CentvisLogo height={36} className="mb-1" />
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Centraxis
            </h1>
            <span className="rounded-md border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-mono">
              Access Gate
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            Verify your email address with the 8-digit code to access your
            organization's workspace
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
          <div className="flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              <KeyRound className="h-7 w-7" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              8-Digit Email Verification
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We sent a verification code to{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {email || "your email address"}
              </span>
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center space-x-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center space-x-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dev Mode Code Preview Banner */}
          {simulatedCode && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Simulated Code (Dev)</span>
                </div>
                <div className="font-mono text-sm tracking-wider font-extrabold text-blue-950 dark:text-blue-100">
                  {simulatedCode}
                </div>
              </div>
              <button
                type="button"
                onClick={() => quickFillCode(simulatedCode)}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-3 py-1.5 transition"
              >
                Quick Fill
              </button>
            </div>
          )}

          {/* Email input (editable if needed) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Account Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@centvis.com"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 dark:text-white shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* 8-Digit Segmented OTP Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
              Enter 8-Digit Verification Code
            </label>
            <div className="flex justify-between items-center gap-1.5 sm:gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="h-12 w-full text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-mono font-bold text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              ))}
            </div>
          </div>

          {/* Submit Verification Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isSubmitting || fullCode.length !== 8}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Verify & Access App</span>
              </>
            )}
          </button>

          {/* Resend & Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={sendCodeMutation.isPending || resendCooldown > 0}
              className="flex items-center space-x-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 transition"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${sendCodeMutation.isPending ? "animate-spin" : ""}`}
              />
              <span>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Code"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
            >
              Back to Sign In
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Protected by Centvis Identity Services & Enterprise Multi-Factor
          Verification
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
