"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, LayoutDashboard, QrCode, Utensils } from "lucide-react";
import { DEMO_TABLE_TOKEN } from "@/lib/demo-data";
import { getMenuImageChoice } from "@/lib/menu-images";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  const { t } = useLanguage();
  const heroImage = getMenuImageChoice("steak").url;

  return (
    <main className="min-h-dvh bg-stone-950 text-white">
      <section
        className="relative isolate min-h-dvh overflow-hidden bg-cover bg-center px-4 py-5"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 -z-10 bg-stone-950/78" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.28),transparent_32%),linear-gradient(180deg,rgba(28,25,23,0.14),#1c1917_94%)]" />

        <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-6xl flex-col">
          <nav className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-amber-400 text-stone-950">
                <Utensils size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("appName")}</p>
                <p className="text-xs text-stone-300">{t("qrOrderingDemo")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-emerald-400/12 px-3 py-1.5 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/30 sm:flex">
                <BadgeCheck size={16} aria-hidden="true" />
                {t("demoRestaurantLive")}
              </div>
              <LanguageSwitcher compact />
            </div>
          </nav>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-semibold uppercase text-amber-200">
                {t("builtForOneRestaurant")}
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {t("appName")}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-200">
                {t("landingDescription")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-stone-200">
                {[t("guestQrMenu"), t("adminPos"), t("tableResetControls")].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-2 backdrop-blur-md"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Link
                href={`/t/${DEMO_TABLE_TOKEN}`}
                className="group rounded-lg border border-white/12 bg-white p-5 text-stone-950 shadow-2xl shadow-stone-950/30 transition hover:-translate-y-0.5 hover:bg-amber-50 focus-visible:outline-amber-300"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-md bg-amber-100 text-amber-900">
                    <QrCode size={22} aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="text-stone-400 transition group-hover:translate-x-1 group-hover:text-stone-950"
                    size={18}
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-xl font-semibold">{t("openCustomerQrMenu")}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {t("customerQrDescription")}
                </p>
              </Link>

              <Link
                href="/admin"
                className="group rounded-lg border border-white/12 bg-stone-900/92 p-5 text-white shadow-2xl shadow-stone-950/30 backdrop-blur transition hover:-translate-y-0.5 hover:bg-stone-900 focus-visible:outline-amber-300"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-200">
                    <LayoutDashboard size={22} aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="text-stone-500 transition group-hover:translate-x-1 group-hover:text-white"
                    size={18}
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-xl font-semibold">{t("openAdminPos")}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">
                  {t("adminDemoLogin")}
                </p>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 py-5 text-sm text-stone-300 sm:grid-cols-3">
            <p>
              <span className="block font-semibold text-white">{t("twelveTables")}</span>
              {t("qrSessionsDescription")}
            </p>
            <p>
              <span className="block font-semibold text-white">
                {t("liveOrderStates")}
              </span>
              {t("liveOrderStatesDescription")}
            </p>
            <p>
              <span className="block font-semibold text-white">{t("demoSafeData")}</span>
              {t("demoSafeDataDescription")}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
