"use client";

import { DEMO_STATE_VERSION, demoState } from "./demo-data";
import { buildMenuImagePath, getMenuImageBucket } from "./menu-image-upload";
import {
  calculateOrderTotal,
  createOrderItemSnapshot,
  formatCurrency,
} from "./pos";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "./supabase";
import type {
  CartItem,
  MenuItem,
  MenuMasterState,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  RestaurantTable,
} from "./types";

const STORAGE_KEY = "menumaster-demo-state";
const ADMIN_KEY = "menumaster-demo-admin";

type LocalStorageState = {
  version: number;
  state: MenuMasterState;
};

type SupabaseRow = Record<string, unknown>;

function cloneDemoState(): MenuMasterState {
  return JSON.parse(JSON.stringify(demoState)) as MenuMasterState;
}

function getLocalState(): MenuMasterState {
  if (typeof window === "undefined") {
    return cloneDemoState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const state = cloneDemoState();
    saveLocalState(state);
    return state;
  }

  const parsed = JSON.parse(raw) as MenuMasterState | LocalStorageState;
  if ("version" in parsed && parsed.version === DEMO_STATE_VERSION) {
    return parsed.state;
  }

  const state = cloneDemoState();
  saveLocalState(state);
  return state;
}

function saveLocalState(state: MenuMasterState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: DEMO_STATE_VERSION, state }),
    );
  }
}

function mapMenuItem(row: SupabaseRow, options: SupabaseRow[]): MenuItem {
  return {
    id: String(row.id),
    restaurantId: String(row.restaurant_id),
    categoryId: String(row.category_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    priceCents: Number(row.price_cents),
    imageUrl: String(row.image_url ?? ""),
    isAvailable: Boolean(row.is_available),
    sortOrder: Number(row.sort_order ?? 0),
    options: options
      .filter((option) => option.menu_item_id === row.id)
      .map((option) => ({
        id: String(option.id),
        menuItemId: String(option.menu_item_id),
        name: String(option.name),
        priceDeltaCents: Number(option.price_delta_cents ?? 0),
      })),
  };
}

function mapOrder(row: SupabaseRow, items: SupabaseRow[]): Order {
  return {
    id: String(row.id),
    restaurantId: String(row.restaurant_id),
    tableId: String(row.table_id),
    tableName: String(row.table_name ?? "Table"),
    status: row.status as OrderStatus,
    subtotalCents: Number(row.subtotal_cents ?? 0),
    serviceCents: Number(row.service_cents ?? 0),
    taxCents: Number(row.tax_cents ?? 0),
    discountCents: Number(row.discount_cents ?? 0),
    totalCents: Number(row.total_cents ?? 0),
    createdAt: String(row.created_at),
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    items: items
      .filter((item) => item.order_id === row.id)
      .map((item) => ({
        id: String(item.id),
        orderId: String(item.order_id),
        menuItemId: String(item.menu_item_id),
        name: String(item.name),
        quantity: Number(item.quantity),
        note: item.note ? String(item.note) : undefined,
        unitPriceCents: Number(item.unit_price_cents),
        lineTotalCents: Number(item.line_total_cents),
        selectedOptions: Array.isArray(item.selected_options)
          ? (item.selected_options as OrderItem["selectedOptions"])
          : [],
      })),
  };
}

function mapPayment(row: SupabaseRow): Payment {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    amountCents: Number(row.amount_cents),
    method: row.method as PaymentMethod,
    createdAt: String(row.created_at),
  };
}

export async function loadMenuMasterState(): Promise<MenuMasterState> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return getLocalState();
  }

  const [
    restaurants,
    tables,
    categories,
    menuItems,
    options,
    orders,
    orderItems,
    payments,
  ] = await Promise.all([
    supabase.from("restaurants").select("*").limit(1).single(),
    supabase.from("restaurant_tables").select("*").order("name"),
    supabase.from("menu_categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*").order("sort_order"),
    supabase.from("menu_item_options").select("*"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("order_items").select("*"),
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
  ]);

  if (
    restaurants.error ||
    tables.error ||
    categories.error ||
    menuItems.error ||
    options.error ||
    orders.error ||
    orderItems.error ||
    payments.error
  ) {
    return getLocalState();
  }

  return {
    restaurant: {
      id: String(restaurants.data.id),
      name: String(restaurants.data.name),
      slug: String(restaurants.data.slug),
      serviceRate: Number(restaurants.data.service_rate ?? 0),
      taxRate: Number(restaurants.data.tax_rate ?? 0),
    },
    tables: (tables.data ?? []).map((table) => ({
      id: String(table.id),
      restaurantId: String(table.restaurant_id),
      name: String(table.name),
      token: String(table.token),
    })),
    categories: (categories.data ?? []).map((category) => ({
      id: String(category.id),
      restaurantId: String(category.restaurant_id),
      name: String(category.name),
      sortOrder: Number(category.sort_order ?? 0),
    })),
    menuItems: (menuItems.data ?? []).map((item) =>
      mapMenuItem(item, options.data ?? []),
    ),
    orders: (orders.data ?? []).map((order) =>
      mapOrder(order, orderItems.data ?? []),
    ),
    payments: (payments.data ?? []).map(mapPayment),
  };
}

export function findTableByToken(state: MenuMasterState, token: string) {
  return state.tables.find((table) => table.token === token);
}

export function isDemoAdminSignedIn() {
  if (hasSupabaseConfig()) {
    return false;
  }

  return typeof window !== "undefined" && window.localStorage.getItem(ADMIN_KEY) === "1";
}

export async function signInAdmin(email: string, password: string) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if (email !== "admin@menumaster.demo" || password !== "demo-admin") {
    throw new Error("Use admin@menumaster.demo and demo-admin for local demo mode.");
  }

  window.localStorage.setItem(ADMIN_KEY, "1");
}

export async function signOutAdmin() {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  window.localStorage.removeItem(ADMIN_KEY);
}

export async function getAdminSession() {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  }

  return isDemoAdminSignedIn();
}

export async function submitOrder(table: RestaurantTable, cart: CartItem[]) {
  const state = await loadMenuMasterState();
  const orderItems = cart.map((cartItem) => {
    const menuItem = state.menuItems.find((item) => item.id === cartItem.menuItemId);
    if (!menuItem || !menuItem.isAvailable) {
      throw new Error("One or more items are no longer available.");
    }

    const selectedOptions = menuItem.options.filter((option) =>
      cartItem.optionIds.includes(option.id),
    );
    const snapshot = createOrderItemSnapshot({
      menuItemId: menuItem.id,
      name: menuItem.name,
      basePriceCents: menuItem.priceCents,
      quantity: cartItem.quantity,
      selectedOptions,
      note: cartItem.note,
    });

    return {
      ...snapshot,
      id: crypto.randomUUID(),
      orderId: "",
      selectedOptions,
    };
  });
  const totals = calculateOrderTotal({
    items: orderItems,
    serviceRate: state.restaurant.serviceRate,
    taxRate: state.restaurant.taxRate,
  });
  const orderId = crypto.randomUUID();
  const order: Order = {
    id: orderId,
    restaurantId: state.restaurant.id,
    tableId: table.id,
    tableName: table.name,
    status: "new",
    createdAt: new Date().toISOString(),
    items: orderItems.map((item) => ({ ...item, orderId })),
    ...totals,
  };

  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error: orderError } = await supabase.from("orders").insert({
      id: order.id,
      restaurant_id: order.restaurantId,
      table_id: order.tableId,
      table_name: order.tableName,
      status: order.status,
      subtotal_cents: order.subtotalCents,
      service_cents: order.serviceCents,
      tax_cents: order.taxCents,
      discount_cents: order.discountCents,
      total_cents: order.totalCents,
    });
    if (orderError) {
      throw new Error(orderError.message);
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      order.items.map((item) => ({
        id: item.id,
        order_id: order.id,
        menu_item_id: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        unit_price_cents: item.unitPriceCents,
        line_total_cents: item.lineTotalCents,
        selected_options: item.selectedOptions,
        price_snapshot: item.priceSnapshot,
      })),
    );
    if (itemsError) {
      throw new Error(itemsError.message);
    }
  } else {
    state.orders = [order, ...state.orders];
    saveLocalState(state);
  }

  return order;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const state = getLocalState();
  state.orders = state.orders.map((order) =>
    order.id === orderId ? { ...order, status } : order,
  );
  saveLocalState(state);
}

export async function updateMenuAvailability(menuItemId: string, isAvailable: boolean) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: isAvailable })
      .eq("id", menuItemId);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const state = getLocalState();
  state.menuItems = state.menuItems.map((item) =>
    item.id === menuItemId ? { ...item, isAvailable } : item,
  );
  saveLocalState(state);
}

export async function saveMenuItem(menuItem: MenuItem) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("menu_items").upsert({
      id: menuItem.id,
      restaurant_id: menuItem.restaurantId,
      category_id: menuItem.categoryId,
      name: menuItem.name,
      description: menuItem.description,
      price_cents: menuItem.priceCents,
      image_url: menuItem.imageUrl,
      is_available: menuItem.isAvailable,
      sort_order: menuItem.sortOrder,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const state = getLocalState();
  const exists = state.menuItems.some((item) => item.id === menuItem.id);
  state.menuItems = exists
    ? state.menuItems.map((item) => (item.id === menuItem.id ? menuItem : item))
    : [...state.menuItems, menuItem];
  saveLocalState(state);
}

export async function uploadMenuImage(menuItemId: string, file: File) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    return readFileAsDataUrl(file);
  }

  const path = buildMenuImagePath(menuItemId, file, crypto.randomUUID());
  const { error } = await supabase.storage
    .from(getMenuImageBucket())
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(getMenuImageBucket()).getPublicUrl(path);
  return data.publicUrl;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

export async function checkoutOrder(
  orderId: string,
  method: PaymentMethod,
  discountCents = 0,
) {
  const state = await loadMenuMasterState();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) {
    throw new Error("Order not found.");
  }

  const totals = calculateOrderTotal({
    items: order.items,
    serviceRate: state.restaurant.serviceRate,
    taxRate: state.restaurant.taxRate,
    discountCents,
  });
  const paidAt = new Date().toISOString();
  const payment: Payment = {
    id: crypto.randomUUID(),
    orderId,
    amountCents: totals.totalCents,
    method,
    createdAt: paidAt,
  };

  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: paidAt,
        discount_cents: totals.discountCents,
        service_cents: totals.serviceCents,
        tax_cents: totals.taxCents,
        total_cents: totals.totalCents,
      })
      .eq("id", orderId);
    if (orderError) {
      throw new Error(orderError.message);
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      id: payment.id,
      order_id: payment.orderId,
      amount_cents: payment.amountCents,
      method: payment.method,
    });
    if (paymentError) {
      throw new Error(paymentError.message);
    }
    return;
  }

  state.orders = state.orders.map((candidate) =>
    candidate.id === orderId
      ? { ...candidate, ...totals, status: "paid", paidAt }
      : candidate,
  );
  state.payments = [payment, ...state.payments];
  saveLocalState(state);
}

export function orderCountByStatus(orders: Order[], status: OrderStatus) {
  return orders.filter((order) => order.status === status).length;
}

export function revenueToday(orders: Order[]) {
  const today = new Date().toISOString().slice(0, 10);
  return orders
    .filter((order) => order.status === "paid" && order.paidAt?.startsWith(today))
    .reduce((sum, order) => sum + order.totalCents, 0);
}

export function salesByMenuItem(orders: Order[]) {
  const sales = new Map<string, { name: string; quantity: number; revenueCents: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const current = sales.get(item.menuItemId) ?? {
        name: item.name,
        quantity: 0,
        revenueCents: 0,
      };
      current.quantity += item.quantity;
      current.revenueCents += item.lineTotalCents;
      sales.set(item.menuItemId, current);
    }
  }

  return Array.from(sales.values()).sort((a, b) => b.revenueCents - a.revenueCents);
}

export { formatCurrency };
