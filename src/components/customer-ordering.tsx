"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock3, Minus, Plus, ReceiptText, ShoppingCart, Sparkles } from "lucide-react";
import {
  findTableByToken,
  formatCurrency,
  loadCustomerMenuState,
  submitCustomerOrder,
} from "@/lib/store";
import {
  translateCategory,
  translateMenuItem,
  translateOption,
  translateTableName,
} from "@/lib/i18n";
import type { CartItem, MenuItem, MenuMasterState, Order } from "@/lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language-provider";
import { StatusPill } from "./status-pill";

type CustomerOrderingProps = {
  tableToken: string;
};

export function CustomerOrdering({ tableToken }: CustomerOrderingProps) {
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();
  const [state, setState] = useState<MenuMasterState | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const nextState = await loadCustomerMenuState(tableToken);
    setState(nextState);
    setActiveCategory((current) => current || nextState.categories[0]?.id || "");
  }, [tableToken]);

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
      setError(`${translateMenuItem(language, item).name} ${t("outOfStock")}.`);
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
      const order = await submitCustomerOrder(tableToken, cart);
      setLastOrder(order);
      setCart([]);
      setIsReviewing(false);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToSubmitOrder"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!state) {
    return (
      <main className="min-h-dvh bg-[#f6f1e8] p-6 text-stone-950">
        {t("loadingMenu")}
      </main>
    );
  }

  if (!table) {
    return (
      <main className="min-h-dvh bg-[#f6f1e8] p-6">
        <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h1 className="text-2xl font-semibold">{t("invalidQr")}</h1>
          <p className="mt-2 text-stone-600">
            {t("invalidQrDescription")}
          </p>
        </section>
      </main>
    );
  }

  if (cart.length > 0 && isReviewing) {
    return (
      <main className="min-h-dvh bg-[#f6f1e8] text-stone-950">
        <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f6f1e8]/92 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {translateTableName(language, table.name)}
              </p>
              <h1 className="truncate text-2xl font-semibold">{t("orderReview")}</h1>
              <p className="text-sm text-stone-600">{t("reviewBeforeSend")}</p>
            </div>
            <LanguageSwitcher compact />
          </div>
        </header>

        <section className="mx-auto max-w-4xl px-4 py-5">
          <button
            type="button"
            onClick={() => setIsReviewing(false)}
            className="mb-4 h-11 rounded-md bg-white px-4 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-50"
          >
            {t("backToMenu")}
          </button>

          <div className="rounded-lg bg-white p-4 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-amber-800" size={20} aria-hidden="true" />
                <h2 className="text-xl font-semibold">{t("cart")}</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("items")}
              </span>
            </div>

            <div className="space-y-3">
              {cartLines.map((line, index) => (
                <motion.div
                  key={`${line.cartItem.menuItemId}-${line.cartItem.optionIds.join("-")}`}
                  layout
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, x: 24 }}
                  transition={{ duration: 0.18 }}
                  className="grid gap-4 rounded-lg bg-stone-50 p-4 ring-1 ring-stone-100 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Sparkles size={16} aria-hidden="true" />
                      {line.item ? translateMenuItem(language, line.item).name : ""}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {line.selectedOptions
                        .map((option) => translateOption(language, option.id, option.name))
                        .join(", ") || t("standard")}
                    </p>
                    <label className="mt-3 block">
                      <span className="mb-1 block text-sm font-semibold text-stone-700">
                        {t("kitchenNote")}
                      </span>
                      <input
                        value={line.cartItem.note}
                        onChange={(event) => updateNote(index, event.target.value)}
                        placeholder={t("kitchenNote")}
                        className="h-12 w-full rounded-md border border-stone-200 bg-white px-3 text-base outline-none focus:border-stone-950 focus:ring-4 focus:ring-amber-500/20"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="flex items-center rounded-md bg-white ring-1 ring-stone-200">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, -1)}
                        className="flex size-11 items-center justify-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <span className="w-10 text-center font-semibold">
                        {line.cartItem.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        className="flex size-11 items-center justify-center"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                    <p className="min-w-28 text-right font-semibold">
                      {formatCurrency(line.lineTotal)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

            <div className="mt-5 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-stone-500">{t("total")}</p>
                <p className="text-2xl font-semibold">{formatCurrency(cartSubtotal)}</p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void placeOrder()}
                className="h-14 rounded-md bg-emerald-700 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
              >
                {isSubmitting ? t("sending") : `${t("placeOrder")} ${formatCurrency(cartSubtotal)}`}
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f6f1e8] pb-28 text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f6f1e8]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {translateTableName(language, table.name)}
            </p>
            <h1 className="truncate text-2xl font-semibold">{state.restaurant.name}</h1>
            <p className="hidden text-sm text-stone-600 sm:block">
              {t("browseSendKitchen")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <Clock3 size={16} aria-hidden="true" />
              {t("open")}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`h-11 shrink-0 rounded-md px-4 text-sm font-semibold transition ${
                  activeCategory === category.id
                    ? "bg-stone-950 text-white shadow-lg shadow-stone-900/15"
                    : "bg-white/88 text-stone-700 ring-1 ring-stone-200 hover:bg-white"
                }`}
              >
                {translateCategory(language, category.id, category.name)}
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
                className="group overflow-hidden rounded-lg bg-white shadow-sm shadow-stone-300/50 ring-1 ring-stone-200"
              >
                {(() => {
                  const translatedItem = translateMenuItem(language, item);
                  return (
                    <>
                <div className="relative h-44 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 motion-safe:group-hover:scale-105"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                    aria-label={item.name}
                  />
                  {!item.isAvailable ? (
                    <div className="absolute inset-0 grid place-items-center bg-stone-950/58 text-sm font-semibold text-white">
                      {t("outOfStock")}
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{translatedItem.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        {translatedItem.description}
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
                          className="min-h-10 rounded-md bg-amber-50 px-3 text-sm font-semibold text-amber-950 ring-1 ring-amber-100 transition hover:bg-amber-100 disabled:opacity-40"
                        >
                          {translateOption(language, option.id, option.name)}
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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-stone-950 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    <Plus size={18} aria-hidden="true" />
                    {item.isAvailable ? t("addToCart") : t("outOfStock")}
                  </button>
                </div>
                    </>
                  );
                })()}
              </motion.article>
            ))}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <AnimatePresence initial={!shouldReduceMotion}>
            {lastOrder ? (
              <motion.section
                key={lastOrder.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg bg-white p-4 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">{t("latestOrderLabel")}</h2>
                  <StatusPill status={lastOrder.status} />
                </div>
                <p className="text-sm text-stone-600">
                  {t("orderTotal")} {formatCurrency(lastOrder.totalCents)}
                </p>
              </motion.section>
            ) : null}
          </AnimatePresence>

          <section className="rounded-lg bg-white p-4 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText className="text-amber-800" size={18} aria-hidden="true" />
              <h2 className="font-semibold">{t("thisTableHistory")}</h2>
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
                    className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 ring-1 ring-stone-100"
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
                <p className="text-sm text-stone-500">{t("noOrdersForTable")}</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/96 p-4 shadow-2xl shadow-stone-950/15 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-amber-800" size={18} aria-hidden="true" />
              <h2 className="font-semibold">{t("cart")}</h2>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-sm text-stone-600">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t("items")}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {cartLines.length
                ? `${t("total")} ${formatCurrency(cartSubtotal)}`
                : t("addItemsToStart")}
            </p>
            {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
          </div>

          <button
            type="button"
            disabled={!cart.length}
            onClick={() => setIsReviewing(true)}
            className="h-14 rounded-md bg-emerald-700 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
          >
            {`${t("reviewOrder")} ${formatCurrency(cartSubtotal)}`}
          </button>
        </div>
      </section>
    </main>
  );
}
