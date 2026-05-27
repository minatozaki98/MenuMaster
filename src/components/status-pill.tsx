import type { OrderStatus } from "@/lib/types";

const statusStyles: Record<OrderStatus, string> = {
  new: "bg-amber-100 text-amber-900 ring-amber-200",
  accepted: "bg-sky-100 text-sky-900 ring-sky-200",
  preparing: "bg-violet-100 text-violet-900 ring-violet-200",
  ready: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  served: "bg-slate-100 text-slate-800 ring-slate-200",
  paid: "bg-zinc-900 text-white ring-zinc-900",
  cancelled: "bg-rose-100 text-rose-900 ring-rose-200",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
