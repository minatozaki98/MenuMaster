"use client";

import { FormEvent, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInAdmin } from "@/lib/store";

export function AdminLogin() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState("admin@menumaster.demo");
  const [password, setPassword] = useState("demo-admin");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signInAdmin(email, password);
      router.push("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-950 px-4 py-10 text-zinc-50">
      <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md items-center">
        <motion.form
          onSubmit={handleSubmit}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="w-full rounded-2xl border border-white/10 bg-white p-6 text-zinc-950 shadow-2xl"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
              <LockKeyhole size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Admin sign in</h1>
              <p className="text-sm text-zinc-600">MenuMaster demo dashboard</p>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input
              className="h-12 w-full rounded-lg border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <input
              className="h-12 w-full rounded-lg border border-zinc-300 px-3 text-base outline-none transition focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/10"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </motion.form>
      </section>
    </main>
  );
}
