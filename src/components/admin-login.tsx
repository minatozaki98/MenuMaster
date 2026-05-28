"use client";

import { FormEvent, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LockKeyhole, ShieldCheck, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInAdmin } from "@/lib/store";
import { getMenuImageChoice } from "@/lib/menu-images";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language-provider";

export function AdminLogin() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { t } = useLanguage();
  const [email, setEmail] = useState("admin@menumaster.demo");
  const [password, setPassword] = useState("demo-admin");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const backdropImage = getMenuImageChoice("coffee").url;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signInAdmin(email, password);
      router.push("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("localDemoLogin"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-dvh bg-stone-950 bg-cover bg-center px-4 py-8 text-stone-50"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(28,25,23,0.92), rgba(28,25,23,0.72)), url(${backdropImage})`,
      }}
    >
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_440px]">
        <div className="hidden max-w-xl lg:block">
          <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-amber-400 text-stone-950 shadow-xl shadow-amber-950/30">
            <Utensils size={24} aria-hidden="true" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase text-amber-200">
            {t("staffAccess")}
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-white">
            {t("fastControls")}
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-stone-200">
            {t("signInDescription")}
          </p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="w-full rounded-lg border border-white/15 bg-white/96 p-6 text-stone-950 shadow-2xl shadow-stone-950/35 backdrop-blur"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-stone-950 text-white">
              <LockKeyhole size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{t("adminSignIn")}</h1>
              <p className="text-sm text-stone-600">{t("menuMasterDemoDashboard")}</p>
            </div>
          </div>

          <div className="mb-5">
            <LanguageSwitcher />
          </div>

          <div className="mb-5 flex items-start gap-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
            <ShieldCheck className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
            <p>{t("demoCredentials")}</p>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">
              {t("email")}
            </span>
            <input
              className="h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none transition focus:border-stone-950 focus:ring-4 focus:ring-amber-500/20"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm font-semibold text-stone-700">
              {t("password")}
            </span>
            <input
              className="h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none transition focus:border-stone-950 focus:ring-4 focus:ring-amber-500/20"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("signingIn") : t("signIn")}
          </button>
        </motion.form>
      </section>
    </main>
  );
}
