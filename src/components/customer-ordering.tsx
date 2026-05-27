"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, ReceiptText, ShoppingCart } from "lucide-react";
import {
  findTableByToken,
  formatCurrency,
  loadMenuMasterState,
  submitOrder,
} from "@/lib/store";
import type { CartItem, MenuItem, MenuMasterState, Order } from "@/lib/types";
import { StatusPill } from "./status-pill";

type CustomerOrderingProps = {
  tableToken: string;
};

export function CustomerOrdering({ tableToken }: CustomerOrderingProps) {
  const shouldReduceMotion = useReducedMotion();
  const [state, setState] = useState<MenuMasterState | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const nextState = await loadMenuMasterState();
    setState(nextState);
    setActiveCategory((current) => current || nextState.categories[0]?.id || "");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 8000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const table = state ? findTableByToken(state, tableToken) : undefined;
  const categories = useMemo(() => state?.categories ?? [], [state?.categories]);
  const menuItems = useMemo(() => state?.menuItems ?? [], [state?.menuItems]);
  const visibleItems = menuItems.filter((item) => item.categoryId === activeCategory);
  const tableOrders =
    state?.orders.filter((order) => order.tableId === table?.id).slice(0, 4) ?? [];

  const cartLines = useMemo(() => {
    return cart.map((cartItem) => {
      const item = menuItems.find((candidate) => candidate.id === cartItem.menuItemId);
      const selectedOptions =
        item?.options.filter((option) => cartItem.optionIds.includes(option.id)) ?? [];
      const optionTotal = selectedOptions.reduce(
        (sum, option) => sum + option.priceDeltaCents,
        0,
      );
      const unitPrice = (item?.priceCents ?? 0) + optionTotal;

      return {
        cartItem,
        item,
        selectedOptions,
        lineTotal: unitPrice * cartItem.quantity,
      };
    });
  }, [cart, menuItems]);

  const cartSubtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);

  function addToCart(item: MenuItem, optionIds: string[] = []) {
    if (!item.isAvailable) {
      setError(`${item.name} is out of stock.`);
      return;
    }

    setError("");
    setCart((current) => {
      const key = `${item.id}:${optionIds.sort().join(",")}`;
      const existing = current.find(
        (line) => `${line.menuItemId}:${line.optionIds.sort().join(",")}` === key,
      );

      if (existing) {
        return current.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [...current, { menuItemId: item.id, optionIds, quantity: 1, note: "" }];
    });
  }

  function updateQuantity(index: number, delta: number) {
    setCart((current) =>
      current
        .map((line, lineIndex) =>
          lineIndex === index
            ? { ...line, quantity: Math.max(line.quantity + delta, 0) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function updateNote(index: number, note: string) {
    setCart((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, note } : line)),
    );
  }

  async function placeOrder() {
    if (!table || cart.length === 0) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const order = await submitOrder(table, cart);
      setLastOrder(order);
      setCart([]);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!state) {
    return <main className="min-h-dvh bg-stone-50 p-6">Loading menu...</main>;
  }

  if (!table) {
    return (
      <main className="min-h-dvh bg-stone-50 p-6">
        <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h1 className="text-2xl font-semibold">Invalid table QR</h1>
          <p className="mt-2 text-stone-600">
            This QR token does not match a table in the demo restaurant.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-stone-50 pb-36 text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-500">{table.name}</p>
            <h1 className="text-2xl font-semibold">{state.restaurant.name}</h1>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
            Open
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                  activeCategory === category.id
                    ? "bg-stone-950 text-white"
                    : "bg-white text-stone-700 ring-1 ring-stone-200"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {visibleItems.map((item, index) => (
              <motion.article
                key={item.id}
                layout
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : Math.min(index * 0.035, 0.18),
                  duration: 0.22,
                }}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
              >
                <div
                  className="h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                  aria-label={item.name}
                />
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{item.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {item.description}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatCurrency(item.priceCents)}
                    </p>
                  </div>

                  {item.options.length ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {item.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          disabled={!item.isAvailable}
                          onClick={() => addToCart(item, [option.id])}
                          className="min-h-10 rounded-lg bg-stone-100 px-3 text-sm font-medium text-stone-700 disabled:opacity-40"
                        >
                          {option.name}
                          {option.priceDeltaCents
                            ? ` +${formatCurrency(option.priceDeltaCents)}`
                            : ""}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={!item.isAvailable}
                    onClick={() => addToCart(item)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    <Plus size={18} aria-hidden="true" />
                    {item.isAvailable ? "Add to cart" : "Out of stock"}
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <AnimatePresence initial={!shouldReduceMotion}>
            {lastOrder ? (
              <motion.section
                key={lastOrder.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Latest order</h2>
                  <StatusPill status={lastOrder.status} />
                </div>
                <p className="text-sm text-stone-600">
                  Order total {formatCurrency(lastOrder.totalCents)}
                </p>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText size={18} aria-hidden="true" />
              <h2 className="font-semibold">This table history</h2>
            </div>
            <div className="space-y-2">
              {tableOrders.length ? (
                tableOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                    transition={{
                      delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.12),
                      duration: 0.18,
                    }}
                    className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(order.totalCents)}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <StatusPill status={order.status} />
                  </motion.div>
                ))
              ) : (
                <p className="text-sm text-stone-500">No orders for this table yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white p-4 shadow-2xl">
        <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ShoppingCart size={18} aria-hidden="true" />
              <h2 className="font-semibold">Cart</h2>
              <span className="text-sm text-stone-500">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
              <AnimatePresence initial={!shouldReduceMotion}>
                {cartLines.length ? (
                  cartLines.map((line, index) => (
                  <motion.div
                    key={`${line.cartItem.menuItemId}-${line.cartItem.optionIds.join("-")}`}
                    layout
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
                    transition={{ duration: 0.18 }}
                    className="grid gap-2 rounded-xl bg-stone-50 p-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="text-sm font-semibold">{line.item?.name}</p>
                      <p className="text-xs text-stone-500">
                        {line.selectedOptions.map((option) => option.name).join(", ") ||
                          "Standard"}
                      </p>
                      <input
                        value={line.cartItem.note}
                        onChange={(event) => updateNote(index, event.target.value)}
                        placeholder="Kitchen note"
                        className="mt-2 h-10 w-full rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-stone-950"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="flex items-center rounded-full bg-white ring-1 ring-stone-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, -1)}
                          className="flex size-10 items-center justify-center"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {line.cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(index, 1)}
                          className="flex size-10 items-center justify-center"
                          aria-label="Increase quantity"
                        >
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <p className="w-20 text-right text-sm font-semibold">
                        {formatCurrency(line.lineTotal)}
                      </p>
                    </div>
                  </motion.div>
                  ))
                ) : (
                  <motion.p
                    key="empty-cart"
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                    className="text-sm text-stone-500"
                  >
                    Add menu items to start an order.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
          </div>

          <button
            type="button"
            disabled={!cart.length || isSubmitting}
            onClick={() => void placeOrder()}
            className="h-14 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isSubmitting ? "Sending..." : `Place order ${formatCurrency(cartSubtotal)}`}
          </button>
        </div>
      </section>
    </main>
  );
}
