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
import type {
  MenuItem,
  MenuMasterState,
  Order,
  OrderStatus,
  PaymentMethod,
  TableSessionSummary,
} from "@/lib/types";
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
const MAX_MENU_IMAGE_BYTES = 1_500_000;

type AdminTab = "orders" | "pos" | "menu" | "history" | "tables";

export function AdminDashboard() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [state, setState] = useState<MenuMasterState | null>(null);
  const [tableSessions, setTableSessions] = useState<TableSessionSummary[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>("orders");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [editingMenuItemId, setEditingMenuItemId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
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

  async function handleStatus(orderId: string, status: OrderStatus) {
    setError("");
    try {
      await updateOrderStatus(orderId, status);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update order.");
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
        Math.round(Number(discount || "0") * 100),
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record payment.");
    }
  }

  async function handleAvailability(item: MenuItem) {
    setError("");
    try {
      await updateMenuAvailability(item.id, !item.isAvailable);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update menu.");
    }
  }

  async function handleOpenTable(tableId: string) {
    setError("");
    try {
      await openTableSession(tableId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open table.");
    }
  }

  async function handleCloseTable(tableId: string) {
    setError("");
    try {
      await closeTableSession(tableId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to close table.");
    }
  }

  async function handleResetTable(tableId: string) {
    setError("");
    try {
      await resetTableSession(tableId);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reset table.");
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
      setError("Menu item name, category, price, and image are required.");
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
      setError(caught instanceof Error ? caught.message : "Unable to save menu item.");
      return false;
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    router.push("/admin/login");
  }

  if (!state) {
    return <main className="min-h-dvh bg-slate-100 p-6">Loading admin...</main>;
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "pos", label: "POS", icon: Banknote },
    { id: "menu", label: "Menu", icon: Settings2 },
    { id: "history", label: "History", icon: History },
    { id: "tables", label: "Tables", icon: QrCode },
  ];

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Admin dashboard</p>
            <h1 className="text-2xl font-semibold">{state.restaurant.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="flex h-11 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white"
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition lg:w-full ${
                  activeTab === tab.id
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <section className="space-y-4">
          {error ? (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

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
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              >
                <p className="text-sm font-medium capitalize text-slate-500">{status}</p>
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
                  setPaymentMethod={setPaymentMethod}
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

function PosPanel({
  discount,
  orders,
  paymentMethod,
  selectedOrder,
  setDiscount,
  setPaymentMethod,
  setSelectedOrderId,
  onCheckout,
}: {
  discount: string;
  orders: Order[];
  paymentMethod: PaymentMethod;
  selectedOrder?: Order;
  setDiscount: (value: string) => void;
  setPaymentMethod: (value: PaymentMethod) => void;
  setSelectedOrderId: (value: string) => void;
  onCheckout: () => Promise<void>;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-3 text-lg font-semibold">Open orders</h2>
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
              className={`w-full rounded-xl p-3 text-left ring-1 ${
                selectedOrder?.id === order.id
                  ? "bg-slate-950 text-white ring-slate-950"
                  : "bg-slate-50 ring-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{order.tableName}</p>
                <span>{formatCurrency(order.totalCents)}</span>
              </div>
              <p className="mt-1 text-xs opacity-70">
                {order.items.length} lines - {order.status}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold">Checkout</h2>
        {selectedOrder ? (
          <div className="space-y-4">
            <Receipt order={selectedOrder} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-medium">Discount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 px-3"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">Payment</span>
                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 px-3"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="qr_transfer">QR transfer</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => void onCheckout()}
              className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Mark paid
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No open orders to checkout.</p>
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
      setImageUploadError({ formKey, message: "Choose an image file." });
      return;
    }

    if (file.size > MAX_MENU_IMAGE_BYTES) {
      setImageUploadError({
        formKey,
        message: "Choose an image smaller than 1.5 MB for this demo.",
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
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold">Menu items</h2>
        <div className="divide-y divide-slate-100">
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
              <div
                className="size-14 rounded-xl bg-cover bg-center ring-1 ring-slate-200"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
              <div className="min-w-0">
                <p className="font-semibold">{item.name}</p>
                <p className="line-clamp-1 text-sm text-slate-500">
                  {formatCurrency(item.priceCents)} - {item.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  className="h-10 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  Edit
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
                  {item.isAvailable ? "Available" : "Out of stock"}
                </button>
              </div>
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
        className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Plus size={18} aria-hidden="true" />
            <h2 className="text-lg font-semibold">
              {editingMenuItem ? "Edit menu item" : "Add menu item"}
            </h2>
          </div>
          {editingMenuItem ? (
            <button
              type="button"
              onClick={() => onEdit("")}
              className="h-9 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700"
            >
              New item
            </button>
          ) : null}
        </div>
        <input type="hidden" name="id" value={editingMenuItem?.id ?? ""} />
        <Field name="name" label="Name" defaultValue={editingMenuItem?.name} />
        <Field
          name="price"
          label="Price"
          type="number"
          step="0.01"
          defaultValue={editingMenuItem ? String(editingMenuItem.priceCents / 100) : undefined}
        />
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">Category</span>
          <select
            name="categoryId"
            defaultValue={editingMenuItem?.categoryId}
            className="h-11 w-full rounded-lg border border-slate-300 px-3"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          name="description"
          label="Description"
          defaultValue={editingMenuItem?.description}
        />
        <input type="hidden" name="uploadedImageUrl" value={uploadedImageUrl} />
        <fieldset className="mb-3">
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ImageIcon size={16} aria-hidden="true" />
            Image
          </legend>
          <div className="mb-3 rounded-xl border border-dashed border-slate-300 p-3">
            <div
              className="mb-3 h-36 rounded-lg bg-cover bg-center ring-1 ring-slate-200"
              style={{ backgroundImage: `url(${previewImageUrl})` }}
              aria-label="Selected menu image preview"
            />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Upload image</span>
              <input
                type="file"
                name="imageFile"
                accept="image/*"
                onChange={(event) => void handleImageUpload(event.target.files?.[0])}
                className="block w-full text-sm text-slate-700 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:text-sm file:font-semibold file:text-white"
              />
            </label>
            {uploadedImageUrl ? (
              <button
                type="button"
                onClick={() => setUploadedImage(null)}
                className="mt-2 h-9 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700"
              >
                Use preset instead
              </button>
            ) : null}
            {currentImageUploadError ? (
              <p className="mt-2 text-sm text-rose-700">{currentImageUploadError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Uploaded images are stored in Supabase Storage when connected.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {menuImageChoices.map((choice) => (
              <label
                key={choice.id}
                className="cursor-pointer rounded-xl border border-slate-200 p-2 has-[:checked]:border-slate-950 has-[:checked]:ring-2 has-[:checked]:ring-slate-950/10"
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="imageChoiceId"
                  value={choice.id}
                  defaultChecked={selectedPresetId === choice.id}
                />
                <span
                  className="mb-2 block h-20 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${choice.url})` }}
                />
                <span className="block text-xs font-semibold">{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="mt-2 h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white">
          {editingMenuItem ? "Save changes" : "Save item"}
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

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {orders.map((order, index) => (
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
          className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{order.tableName}</p>
              <p className="text-sm text-slate-500">
                {new Date(order.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <StatusPill status={order.status} />
          </div>

          <div className="mb-4 space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">
                    {item.quantity}x {item.name}
                  </p>
                  <p className="font-semibold">{formatCurrency(item.lineTotalCents)}</p>
                </div>
                {item.selectedOptions.length ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {item.selectedOptions.map((option) => option.name).join(", ")}
                  </p>
                ) : null}
                {item.note ? <p className="mt-1 text-xs text-amber-700">{item.note}</p> : null}
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-semibold">{formatCurrency(order.totalCents)}</span>
          </div>

          <select
            value={order.status}
            onChange={(event) =>
              void onStatus(order.id, event.target.value as OrderStatus)
            }
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold"
            aria-label={`Change status for ${order.tableName}`}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </motion.article>
      ))}

      {!orders.length ? (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200"
        >
          <ChefHat className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm text-slate-500">New QR orders will appear here.</p>
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

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-4 text-lg font-semibold">Order history</h2>
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
              className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_auto_auto]"
            >
              <div>
                <p className="font-semibold">{order.tableName}</p>
                <p className="text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <StatusPill status={order.status} />
              <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="mb-2 text-lg font-semibold">Sales summary</h2>
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
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-slate-500">{item.quantity} sold</p>
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
            className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{table.tableName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {table.status === "open" ? "Open session" : "Closed session"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  table.status === "open"
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                {table.status}
              </span>
            </div>
            <p className="mb-4 mt-1 break-all text-sm text-slate-500">{url}</p>
            <div className="inline-block rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <QRCodeSVG value={url} size={180} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Open orders</dt>
                <dd className="mt-1 font-semibold">{table.unpaidOrderCount}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Latest order</dt>
                <dd className="mt-1 font-semibold">
                  {table.latestOrderAt
                    ? new Date(table.latestOrderAt).toLocaleTimeString()
                    : "None"}
                </dd>
              </div>
            </dl>
            {hasUnpaidOrders ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                Settle or cancel open orders before closing or resetting this table.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={table.status === "open"}
                onClick={() => void onOpen(table.tableId)}
                className="h-10 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                Open
              </button>
              <button
                type="button"
                disabled={table.status === "closed" || hasUnpaidOrders}
                onClick={() => void onClose(table.tableId)}
                className="h-10 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Close
              </button>
              <button
                type="button"
                disabled={hasUnpaidOrders}
                onClick={() => void onReset(table.tableId)}
                className="h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                Reset
              </button>
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}

function Receipt({ order }: { order: Order }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold">{order.tableName}</p>
          <p className="text-xs text-slate-500">Receipt preview</p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-sm">
            <span>
              {item.quantity}x {item.name}
            </span>
            <span className="font-medium">{formatCurrency(item.lineTotalCents)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
        <Line label="Subtotal" value={order.subtotalCents} />
        <Line label="Service" value={order.serviceCents} />
        <Line label="Tax" value={order.taxCents} />
        <Line label="Discount" value={-order.discountCents} />
        <div className="flex justify-between pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(order.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
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
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        defaultValue={defaultValue}
        name={name}
        type={type}
        step={step}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-slate-950"
      />
    </label>
  );
}
