"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Banknote,
  ChefHat,
  ClipboardList,
  History,
  ImageIcon,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { buildMenuItemFromAdminForm } from "@/lib/menu-admin";
import {
  getMenuImageChoice,
  menuImageChoices,
} from "@/lib/menu-images";
import {
  checkoutOrder,
  closeTableSession,
  formatCurrency,
  getAdminSession,
  loadMenuMasterState,
  loadTableSessionSummaries,
  openTableSession,
  orderCountByStatus,
  resetTableSession,
  revenueToday,
  salesByMenuItem,
  saveMenuItem,
  signOutAdmin,
  updateMenuAvailability,
  updateOrderStatus,
  uploadMenuImage,
} from "@/lib/store";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import {
  translateCategory,
  translateMenuItem,
  translateMenuItemSnapshot,
  translatePaymentMethod,
  translateStatus,
  translateTableName,
} from "@/lib/i18n";
import type {
  MenuItem,
  MenuMasterState,
  Order,
  OrderStatus,
  PaymentMethod,
  TableSessionSummary,
} from "@/lib/types";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "./language-provider";
import { StatusPill } from "./status-pill";

const statuses: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "served",
  "paid",
  "cancelled",
];
const orderBoardStatuses: OrderStatus[] = ["new", "accepted", "preparing", "ready", "served"];
const MAX_MENU_IMAGE_BYTES = 1_500_000;

type AdminTab = "orders" | "pos" | "menu" | "history" | "tables";

const panelClass =
  "rounded-lg bg-white p-4 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200";
const quietPanelClass = "rounded-md bg-stone-50 p-3 ring-1 ring-stone-100";
const inputClass =
  "h-11 w-full rounded-md border border-stone-300 bg-white px-3 outline-none transition focus:border-stone-950 focus:ring-4 focus:ring-amber-500/20";
const secondaryButtonClass =
  "rounded-md bg-white px-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-50";

export function AdminDashboard() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();
  const [state, setState] = useState<MenuMasterState | null>(null);
  const [tableSessions, setTableSessions] = useState<TableSessionSummary[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [editingMenuItemId, setEditingMenuItemId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const isSignedIn = await getAdminSession();
    if (!isSignedIn) {
      router.push("/admin/login");
      return;
    }

    const [nextState, nextTableSessions] = await Promise.all([
      loadMenuMasterState(),
      loadTableSessionSummaries(),
    ]);
    setState(nextState);
    setTableSessions(nextTableSessions);
    setSelectedOrderId((current) => current || nextState.orders[0]?.id || "");
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      return () => window.clearTimeout(timeout);
    }

    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      window.clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const unpaidOrders = useMemo(
    () =>
      state?.orders.filter((order) => !["paid", "cancelled"].includes(order.status)) ??
      [],
    [state?.orders],
  );
  const selectedOrder =
    state?.orders.find((order) => order.id === selectedOrderId) ?? unpaidOrders[0];
  const editingMenuItem = state?.menuItems.find((item) => item.id === editingMenuItemId);
  const dailyRevenue = state ? revenueToday(state.orders) : 0;
  const itemSales = state ? salesByMenuItem(state.orders) : [];
  const activeTableCount = tableSessions.filter((table) => table.status === "open").length;
  const readyOrderCount = state ? orderCountByStatus(state.orders, "ready") : 0;
  const kitchenQueueCount = state
    ? state.orders.filter((order) => ["new", "accepted", "preparing"].includes(order.status))
        .length
    : 0;

  async function handleStatus(orderId: string, status: OrderStatus) {
    setError("");
    try {
      await updateOrderStatus(orderId, status);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToUpdateOrder"));
    }
  }

  async function handleCheckout() {
    if (!selectedOrder) {
      return;
    }

    setError("");
    try {
      await checkoutOrder(
        selectedOrder.id,
        paymentMethod,
        Math.round(Number(discount || "0")),
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToRecordPayment"));
    }
  }

  async function handleAvailability(item: MenuItem) {
    setError("");
    try {
      await updateMenuAvailability(item.id, !item.isAvailable);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToUpdateMenu"));
    }
  }

  async function handleOpenTable(tableId: string) {
    setError("");
    try {
      await openTableSession(tableId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToOpenTable"));
    }
  }

  async function handleCloseTable(tableId: string) {
    setError("");
    try {
      await closeTableSession(tableId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToCloseTable"));
    }
  }

  async function handleResetTable(tableId: string) {
    setError("");
    try {
      await resetTableSession(tableId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToResetTable"));
    }
  }

  async function handleSaveMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!state) {
      return false;
    }

    const data = new FormData(form);
    const name = String(data.get("name"));
    const categoryId = String(data.get("categoryId"));
    const price = Number(data.get("price"));
    const description = String(data.get("description"));
    const imageChoiceId = String(data.get("imageChoiceId") ?? "");
    const uploadedImageUrl = String(data.get("uploadedImageUrl") ?? "");
    const uploadedImageFile = data.get("imageFile");
    const id = String(data.get("id") ?? "");
    const nextId = id || crypto.randomUUID();
    const imageFile =
      uploadedImageFile instanceof File && uploadedImageFile.size > 0
        ? uploadedImageFile
        : undefined;

    if (
      !name ||
      !categoryId ||
      !price ||
      (!imageChoiceId && !uploadedImageUrl && !imageFile && !id)
    ) {
      setError(t("requiredMenuFields"));
      return false;
    }

    setError("");
    try {
      const imageUrl = imageFile
        ? await uploadMenuImage(nextId, imageFile)
        : uploadedImageUrl;

      await saveMenuItem(
        buildMenuItemFromAdminForm(state, {
          id: nextId,
          categoryId,
          name,
          price,
          description,
          imageChoiceId,
          uploadedImageUrl: imageUrl,
        }),
      );
      setEditingMenuItemId("");
      form.reset();
      await refresh();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("unableToSaveMenu"));
      return false;
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    router.push("/admin/login");
  }

  if (!state) {
    return <main className="min-h-dvh bg-[#f6f1e8] p-6">{t("loadingAdmin")}</main>;
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
    { id: "orders", label: t("orders"), icon: ClipboardList },
    { id: "pos", label: t("pos"), icon: Banknote },
    { id: "menu", label: t("menu"), icon: Settings2 },
    { id: "history", label: t("history"), icon: History },
    { id: "tables", label: t("tables"), icon: QrCode },
  ];

  return (
    <main className="min-h-dvh bg-[#f6f1e8] text-stone-950">
      <header className="border-b border-stone-200/80 bg-white/88 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">{t("adminDashboard")}</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {state.restaurant.name}
            </h1>
            <p className="text-sm text-stone-600">{t("dashboardDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void refresh()}
              className="flex h-11 items-center gap-2 rounded-md bg-stone-100 px-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 transition hover:bg-white"
            >
              <RefreshCw size={16} aria-hidden="true" />
              {t("refresh")}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex h-11 items-center gap-2 rounded-md bg-stone-950 px-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              <LogOut size={16} aria-hidden="true" />
              {t("signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto rounded-lg bg-stone-900 p-2 shadow-xl shadow-stone-950/10 lg:block lg:space-y-2 lg:self-start">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-semibold transition lg:w-full ${
                  activeTab === tab.id
                    ? "bg-amber-400 text-stone-950 shadow-lg shadow-amber-950/20"
                    : "text-stone-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 space-y-4">
          {error ? (
            <div className="rounded-md bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          <section className="rounded-lg bg-stone-950 p-4 text-white shadow-xl shadow-stone-950/10">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {t("floorOverview")}
                </p>
                <h2 className="text-xl font-semibold">{t("kitchenQueue")}</h2>
              </div>
              <div className="rounded-md bg-white/10 px-3 py-2 text-sm text-stone-200 ring-1 ring-white/10">
                {t("needsAttention")}: {kitchenQueueCount}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <MetricCard label={t("openOrders")} value={String(unpaidOrders.length)} />
              <MetricCard label={t("activeTables")} value={String(activeTableCount)} />
              <MetricCard label={t("readyNow")} value={String(readyOrderCount)} />
              <MetricCard label={t("todayRevenue")} value={formatCurrency(dailyRevenue)} />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {(["new", "preparing", "ready", "paid"] as OrderStatus[]).map((status, index) => (
              <motion.div
                key={status}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  delay: shouldReduceMotion ? 0 : index * 0.04,
                  duration: 0.2,
                }}
                className="rounded-lg bg-white p-4 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200"
              >
                <p className="text-sm font-semibold capitalize text-stone-500">
                  {translateStatus(language, status)}
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {orderCountByStatus(state.orders, status)}
                </p>
              </motion.div>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={!shouldReduceMotion}>
            {activeTab === "orders" ? (
              <motion.div
                key="orders"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <OrderBoard orders={state.orders} onStatus={handleStatus} />
              </motion.div>
            ) : null}

            {activeTab === "pos" ? (
              <motion.div
                key="pos"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <PosPanel
                  discount={discount}
                  orders={unpaidOrders}
                  paymentMethod={paymentMethod}
                  selectedOrder={selectedOrder}
                  setDiscount={setDiscount}
                  setSelectedOrderId={setSelectedOrderId}
                  onCheckout={handleCheckout}
                />
              </motion.div>
            ) : null}

            {activeTab === "menu" ? (
              <motion.div
                key="menu"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <MenuPanel
                  editingMenuItem={editingMenuItem}
                  menuItems={state.menuItems}
                  categories={state.categories}
                  onAvailability={handleAvailability}
                  onEdit={setEditingMenuItemId}
                  onSubmit={handleSaveMenuItem}
                />
              </motion.div>
            ) : null}

            {activeTab === "history" ? (
              <motion.div
                key="history"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <HistoryPanel
                  dailyRevenue={dailyRevenue}
                  itemSales={itemSales}
                  orders={state.orders}
                />
              </motion.div>
            ) : null}

            {activeTab === "tables" ? (
              <motion.div
                key="tables"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <TablesPanel
                  tableSessions={tableSessions}
                  onClose={handleCloseTable}
                  onOpen={handleOpenTable}
                  onReset={handleResetTable}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/8 p-3 ring-1 ring-white/10">
      <p className="text-xs font-semibold uppercase text-stone-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PosPanel({
  discount,
  orders,
  paymentMethod,
  selectedOrder,
  setDiscount,
  setSelectedOrderId,
  onCheckout,
}: {
  discount: string;
  orders: Order[];
  paymentMethod: PaymentMethod;
  selectedOrder?: Order;
  setDiscount: (value: string) => void;
  setSelectedOrderId: (value: string) => void;
  onCheckout: () => Promise<void>;
}) {
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();

  return (
    <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className={panelClass}>
        <div className="mb-4">
          <p className="text-sm font-semibold text-amber-800">{t("counterCheckout")}</p>
          <h2 className="text-lg font-semibold">{t("openOrders")}</h2>
          <p className="text-sm text-stone-500">{t("selectOrder")}</p>
        </div>
        <div className="space-y-2">
          {orders.map((order, index) => (
            <motion.button
              key={order.id}
              layout
              initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
              whileHover={shouldReduceMotion ? undefined : { x: 2 }}
              transition={{
                delay: shouldReduceMotion ? 0 : Math.min(index * 0.025, 0.14),
                duration: 0.18,
              }}
              type="button"
              onClick={() => setSelectedOrderId(order.id)}
              className={`w-full rounded-md p-3 text-left ring-1 transition ${
                selectedOrder?.id === order.id
                  ? "bg-stone-950 text-white ring-stone-950"
                  : "bg-stone-50 ring-stone-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {translateTableName(language, order.tableName)}
                </p>
                <span>{formatCurrency(order.totalCents)}</span>
              </div>
              <p className="mt-1 text-xs opacity-70">
                {order.items.length} {t("lines")} - {translateStatus(language, order.status)}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className={panelClass}>
        <h2 className="mb-4 text-lg font-semibold">{t("counterCheckout")}</h2>
        {selectedOrder ? (
          <div className="space-y-4">
            <Receipt order={selectedOrder} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-semibold text-stone-700">
                  {t("discount")}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-stone-700">
                  {t("payment")}
                </span>
                <div className="flex h-11 items-center rounded-md border border-stone-300 bg-stone-50 px-3 text-sm font-semibold text-stone-800">
                  {translatePaymentMethod(language, paymentMethod)} - {t("cashOnly")}
                </div>
              </label>
            </div>
            <button
              type="button"
              onClick={() => void onCheckout()}
              className="h-12 w-full rounded-md bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
            >
              {t("markPaid")}
            </button>
          </div>
        ) : (
          <p className="text-sm text-stone-500">{t("noOpenOrders")}</p>
        )}
      </div>
    </section>
  );
}

function MenuPanel({
  categories,
  editingMenuItem,
  menuItems,
  onAvailability,
  onEdit,
  onSubmit,
}: {
  categories: MenuMasterState["categories"];
  editingMenuItem?: MenuItem;
  menuItems: MenuItem[];
  onAvailability: (item: MenuItem) => Promise<void>;
  onEdit: (itemId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
}) {
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();
  const formKey = editingMenuItem?.id ?? "new-menu-item";
  const [uploadedImage, setUploadedImage] = useState<{
    formKey: string;
    url: string;
  } | null>(null);
  const [imageUploadError, setImageUploadError] = useState<{
    formKey: string;
    message: string;
  } | null>(null);
  const uploadedImageUrl = uploadedImage?.formKey === formKey ? uploadedImage.url : "";
  const currentImageUploadError =
    imageUploadError?.formKey === formKey ? imageUploadError.message : "";

  const previewImageUrl =
    uploadedImageUrl || editingMenuItem?.imageUrl || getMenuImageChoice("salad").url;
  const selectedPresetId = editingMenuItem
    ? menuImageChoices.find((choice) => choice.url === editingMenuItem.imageUrl)?.id
    : "salad";

  async function handleImageUpload(file?: File) {
    setImageUploadError(null);

    if (!file) {
      setUploadedImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageUploadError({ formKey, message: t("chooseImageFile") });
      return;
    }

    if (file.size > MAX_MENU_IMAGE_BYTES) {
      setImageUploadError({
        formKey,
        message: t("imageTooLarge"),
      });
      return;
    }

    const imageUrl = await readImageFileAsDataUrl(file);
    setUploadedImage({ formKey, url: imageUrl });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const didSave = await onSubmit(event);
    if (didSave) {
      setUploadedImage(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <div className={panelClass}>
        <h2 className="mb-4 text-lg font-semibold">{t("menuItems")}</h2>
        <div className="divide-y divide-stone-100">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                delay: shouldReduceMotion ? 0 : Math.min(index * 0.02, 0.16),
                duration: 0.18,
              }}
              className="grid gap-3 py-3 md:grid-cols-[56px_1fr_auto] md:items-center"
            >
              {(() => {
                const translatedItem = translateMenuItem(language, item);
                return (
                  <>
              <div
                className="size-14 rounded-md bg-cover bg-center ring-1 ring-stone-200"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
              <div className="min-w-0">
                <p className="font-semibold">{translatedItem.name}</p>
                <p className="line-clamp-1 text-sm text-stone-500">
                  {formatCurrency(item.priceCents)} - {translatedItem.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  className={`h-10 ${secondaryButtonClass}`}
                >
                  {t("edit")}
                </button>
                <button
                  type="button"
                  onClick={() => void onAvailability(item)}
                  className={`h-10 rounded-lg px-3 text-sm font-semibold ${
                    item.isAvailable
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                  }`}
                >
                  {item.isAvailable ? t("available") : t("outOfStock")}
                </button>
              </div>
                  </>
                );
              })()}
            </motion.div>
          ))}
        </div>
      </div>

      <motion.form
        key={formKey}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onSubmit={(event) => void handleSubmit(event)}
        className={panelClass}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Plus size={18} aria-hidden="true" />
            <h2 className="text-lg font-semibold">
              {editingMenuItem ? t("editMenuItem") : t("addMenuItem")}
            </h2>
          </div>
          {editingMenuItem ? (
            <button
              type="button"
              onClick={() => onEdit("")}
              className={`h-9 ${secondaryButtonClass}`}
            >
              {t("newItem")}
            </button>
          ) : null}
        </div>
        <input type="hidden" name="id" value={editingMenuItem?.id ?? ""} />
        <Field name="name" label={t("name")} defaultValue={editingMenuItem?.name} />
        <Field
          name="price"
          label={t("priceMmk")}
          type="number"
          step="1"
          defaultValue={editingMenuItem ? String(editingMenuItem.priceCents) : undefined}
        />
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold text-stone-700">
            {t("category")}
          </span>
          <select
            name="categoryId"
            defaultValue={editingMenuItem?.categoryId}
            className={inputClass}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {translateCategory(language, category.id, category.name)}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="description"
          label={t("description")}
          defaultValue={editingMenuItem?.description}
        />
        <input type="hidden" name="uploadedImageUrl" value={uploadedImageUrl} />
        <fieldset className="mb-3">
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
            <ImageIcon size={16} aria-hidden="true" />
            {t("image")}
          </legend>
          <div className="mb-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
            <div
              className="mb-3 h-36 rounded-md bg-cover bg-center ring-1 ring-stone-200"
              style={{ backgroundImage: `url(${previewImageUrl})` }}
              aria-label="Selected menu image preview"
            />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">{t("uploadImage")}</span>
              <input
                type="file"
                name="imageFile"
                accept="image/*"
                onChange={(event) => void handleImageUpload(event.target.files?.[0])}
                className="block w-full text-sm text-stone-700 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:text-sm file:font-semibold file:text-white"
              />
            </label>
            {uploadedImageUrl ? (
              <button
                type="button"
                onClick={() => setUploadedImage(null)}
                className={`mt-2 h-9 ${secondaryButtonClass}`}
              >
                {t("usePreset")}
              </button>
            ) : null}
            {currentImageUploadError ? (
              <p className="mt-2 text-sm text-rose-700">{currentImageUploadError}</p>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                {t("uploadHint")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {menuImageChoices.map((choice) => (
              <label
                key={choice.id}
                className="cursor-pointer rounded-lg border border-stone-200 bg-white p-2 has-[:checked]:border-stone-950 has-[:checked]:ring-2 has-[:checked]:ring-amber-500/20"
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="imageChoiceId"
                  value={choice.id}
                  defaultChecked={selectedPresetId === choice.id}
                />
                <span
                  className="mb-2 block h-20 rounded-md bg-cover bg-center"
                  style={{ backgroundImage: `url(${choice.url})` }}
                />
                <span className="block text-xs font-semibold">{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="mt-2 h-11 w-full rounded-md bg-stone-950 text-sm font-semibold text-white transition hover:bg-stone-800">
          {editingMenuItem ? t("saveChanges") : t("saveItem")}
        </button>
      </motion.form>
    </section>
  );
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function OrderBoard({
  orders,
  onStatus,
}: {
  orders: Order[];
  onStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}) {
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();
  const activeOrders = orders.filter(
    (order) => !["paid", "cancelled"].includes(order.status),
  );

  return (
    <section className="flex gap-3 overflow-x-auto pb-2">
      {orderBoardStatuses.map((status) => {
        const statusOrders = activeOrders.filter((order) => order.status === status);

        return (
          <div
            key={status}
            className="min-h-64 w-[280px] shrink-0 rounded-lg bg-white/70 p-3 ring-1 ring-stone-200"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold capitalize text-stone-700">
                {translateStatus(language, status)}
              </h2>
              <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-600">
                {statusOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {statusOrders.map((order, index) => (
                <motion.article
                  key={order.id}
                  layout
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  transition={{
                    delay: shouldReduceMotion ? 0 : Math.min(index * 0.035, 0.18),
                    duration: 0.2,
                  }}
                  className="rounded-lg bg-white p-3 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {translateTableName(language, order.tableName)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <StatusPill status={order.status} />
                  </div>

                  <div className="mb-3 space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className={quietPanelClass}>
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-medium">
                            {item.quantity}x{" "}
                            {translateMenuItemSnapshot(
                              language,
                              item.menuItemId,
                              item.name,
                            )}
                          </p>
                          <p className="text-sm font-semibold">
                            {formatCurrency(item.lineTotalCents)}
                          </p>
                        </div>
                        {item.selectedOptions.length ? (
                          <p className="mt-1 text-xs text-stone-500">
                            {item.selectedOptions.map((option) => option.name).join(", ")}
                          </p>
                        ) : null}
                        {item.note ? (
                          <p className="mt-1 text-xs text-amber-700">{item.note}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mb-3 flex items-center justify-between border-t border-stone-100 pt-3">
                    <span className="text-sm text-stone-500">{t("total")}</span>
                    <span className="font-semibold">{formatCurrency(order.totalCents)}</span>
                  </div>

                  <select
                    value={order.status}
                    onChange={(event) =>
                      void onStatus(order.id, event.target.value as OrderStatus)
                    }
                    className={`${inputClass} text-sm font-semibold`}
                    aria-label={`${t("changeStatus")} ${translateTableName(language, order.tableName)}`}
                  >
                    {statuses.map((nextStatus) => (
                      <option key={nextStatus} value={nextStatus}>
                        {translateStatus(language, nextStatus)}
                      </option>
                    ))}
                  </select>
                </motion.article>
              ))}
            </div>
          </div>
        );
      })}

      {!activeOrders.length ? (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          className="w-full rounded-lg bg-white p-6 text-center shadow-sm shadow-stone-300/50 ring-1 ring-stone-200"
        >
          <ChefHat className="mx-auto mb-2 text-stone-400" aria-hidden="true" />
          <p className="font-semibold">{t("noOrdersYet")}</p>
          <p className="text-sm text-stone-500">{t("newQrOrdersAppear")}</p>
        </motion.div>
      ) : null}
    </section>
  );
}

function HistoryPanel({
  dailyRevenue,
  itemSales,
  orders,
}: {
  dailyRevenue: number;
  itemSales: Array<{ name: string; quantity: number; revenueCents: number }>;
  orders: Order[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className={panelClass}>
        <h2 className="mb-4 text-lg font-semibold">{t("orderHistory")}</h2>
        <div className="space-y-2">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
              transition={{
                delay: shouldReduceMotion ? 0 : Math.min(index * 0.02, 0.16),
                duration: 0.18,
              }}
              className="grid gap-3 rounded-md bg-stone-50 p-3 ring-1 ring-stone-100 md:grid-cols-[1fr_auto_auto]"
            >
              <div>
                <p className="font-semibold">
                  {translateTableName(language, order.tableName)}
                </p>
                <p className="text-sm text-stone-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <StatusPill status={order.status} />
              <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className={panelClass}>
        <h2 className="mb-2 text-lg font-semibold">{t("salesSummary")}</h2>
        <p className="mb-4 text-3xl font-semibold">{formatCurrency(dailyRevenue)}</p>
        <div className="space-y-2">
          {itemSales.map((item, index) => (
            <motion.div
              key={item.name}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                delay: shouldReduceMotion ? 0 : Math.min(index * 0.02, 0.14),
                duration: 0.18,
              }}
              className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 ring-1 ring-stone-100"
            >
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-stone-500">
                  {item.quantity} {t("sold")}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {formatCurrency(item.revenueCents)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TablesPanel({
  tableSessions,
  onClose,
  onOpen,
  onReset,
}: {
  tableSessions: TableSessionSummary[];
  onClose: (tableId: string) => Promise<void>;
  onOpen: (tableId: string) => Promise<void>;
  onReset: (tableId: string) => Promise<void>;
}) {
  const shouldReduceMotion = useReducedMotion();
  const { language, t } = useLanguage();

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tableSessions.map((table, index) => {
        const url =
          typeof window === "undefined"
            ? `/t/${table.token}`
            : `${window.location.origin}/t/${table.token}`;
        const hasUnpaidOrders = table.unpaidOrderCount > 0;
        return (
          <motion.article
            key={table.tableId}
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            transition={{
              delay: shouldReduceMotion ? 0 : Math.min(index * 0.035, 0.16),
              duration: 0.2,
            }}
            className="rounded-lg bg-white p-5 shadow-sm shadow-stone-300/50 ring-1 ring-stone-200"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {translateTableName(language, table.tableName)}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {table.status === "open" ? t("openSession") : t("closedSession")}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  table.status === "open"
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-stone-100 text-stone-600 ring-1 ring-stone-200"
                }`}
              >
                {table.status}
              </span>
            </div>
            <p className="mb-4 mt-1 break-all text-sm text-stone-500">{url}</p>
            <div className="inline-block rounded-lg bg-white p-3 ring-1 ring-stone-200">
              <QRCodeSVG value={url} size={180} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className={quietPanelClass}>
                <dt className="text-stone-500">{t("openOrders")}</dt>
                <dd className="mt-1 font-semibold">{table.unpaidOrderCount}</dd>
              </div>
              <div className={quietPanelClass}>
                <dt className="text-stone-500">{t("latestOrder")}</dt>
                <dd className="mt-1 font-semibold">
                  {table.latestOrderAt
                    ? new Date(table.latestOrderAt).toLocaleTimeString()
                    : t("none")}
                </dd>
              </div>
            </dl>
            {hasUnpaidOrders ? (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                {t("settleBeforeReset")}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={table.status === "open"}
                onClick={() => void onOpen(table.tableId)}
                className="h-10 rounded-md bg-stone-950 px-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
              >
                {t("open")}
              </button>
              <button
                type="button"
                disabled={table.status === "closed" || hasUnpaidOrders}
                onClick={() => void onClose(table.tableId)}
                className="h-10 rounded-md bg-white px-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                {t("close")}
              </button>
              <button
                type="button"
                disabled={hasUnpaidOrders}
                onClick={() => void onReset(table.tableId)}
                className="h-10 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
              >
                {t("reset")}
              </button>
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}

function Receipt({ order }: { order: Order }) {
  const { language, t } = useLanguage();

  return (
    <div className="rounded-lg bg-stone-50 p-4 ring-1 ring-stone-100">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold">{translateTableName(language, order.tableName)}</p>
          <p className="text-xs text-stone-500">{t("receiptPreview")}</p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-sm">
            <span>
              {item.quantity}x{" "}
              {translateMenuItemSnapshot(language, item.menuItemId, item.name)}
            </span>
            <span className="font-medium">{formatCurrency(item.lineTotalCents)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm">
        <Line label={t("subtotal")} value={order.subtotalCents} />
        <Line label={t("service")} value={order.serviceCents} />
        <Line label={t("tax")} value={order.taxCents} />
        <Line label={t("discount")} value={-order.discountCents} />
        <div className="flex justify-between pt-2 text-base font-semibold">
          <span>{t("total")}</span>
          <span>{formatCurrency(order.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-stone-500">{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

function Field({
  defaultValue,
  label,
  name,
  step,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  step?: string;
  type?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-semibold text-stone-700">{label}</span>
      <input
        defaultValue={defaultValue}
        name={name}
        type={type}
        step={step}
        className={`${inputClass} text-base`}
      />
    </label>
  );
}
