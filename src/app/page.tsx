import Link from "next/link";
import { ArrowRight, LayoutDashboard, QrCode } from "lucide-react";
import { DEMO_TABLE_TOKEN } from "@/lib/demo-data";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col justify-center">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            MenuMaster demo
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            QR ordering and POS for a pub and bar floor.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Customers scan a table QR, place orders, and staff manage live
            orders, menu stock, checkout, and history from one web dashboard.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href={`/t/${DEMO_TABLE_TOKEN}`}
            className="group rounded-2xl bg-white p-5 text-slate-950 ring-1 ring-white/10 transition hover:bg-emerald-50"
          >
            <QrCode className="mb-5" size={28} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Open customer QR menu</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Simulates a guest scanning the QR code at Table 7.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              Start order <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>

          <Link
            href="/admin"
            className="group rounded-2xl bg-slate-900 p-5 text-white ring-1 ring-white/10 transition hover:bg-slate-800"
          >
            <LayoutDashboard className="mb-5" size={28} aria-hidden="true" />
            <h2 className="text-xl font-semibold">Open admin POS</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Demo login uses admin@menumaster.demo and demo-admin unless
              Supabase env vars are configured.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              Manage orders <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
