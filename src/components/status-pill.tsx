"use client";

import type { OrderStatus } from "@/lib/types";
import { translateStatus } from "@/lib/i18n";
import { useLanguage } from "./language-provider";

const statusStyles: Record<OrderStatus, string> = {
  new: "bg-amber-50 text-amber-900 ring-amber-200 before:bg-amber-500",
  accepted: "bg-sky-50 text-sky-900 ring-sky-200 before:bg-sky-500",
  preparing: "bg-violet-50 text-violet-900 ring-violet-200 before:bg-violet-500",
  ready: "bg-emerald-50 text-emerald-900 ring-emerald-200 before:bg-emerald-500",
  served: "bg-slate-50 text-slate-800 ring-slate-200 before:bg-slate-400",
  paid: "bg-stone-950 text-white ring-stone-950 before:bg-emerald-300",
  cancelled: "bg-rose-50 text-rose-900 ring-rose-200 before:bg-rose-500",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const { language } = useLanguage();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold capitalize ring-1 before:size-1.5 before:rounded-full ${statusStyles[status]}`}
    >
      {translateStatus(language, status)}
    </span>
  );
}
