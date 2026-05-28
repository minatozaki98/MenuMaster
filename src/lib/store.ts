"use client";

import { DEMO_STATE_VERSION, demoState } from "./demo-data";
import { buildMenuImagePath, getMenuImageBucket } from "./menu-image-upload";
import {
  calculateOrderTotal,
  createOrderItemSnapshot,
  formatCurrency,
} from "./pos";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "./supabase";
import {
  activeCustomerOrdersForTable,
  closeLocalTableSession,
  ensureLocalTableSessions,
  openLocalTableSession,
  resetLocalTableSession,
  summarizeTableSessions,
} from "./table-sessions";
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
  TableSession,
  TableSessionSummary,
} from "./types";

const STORAGE_KEY = "menumaster-demo-state";
const ADMIN_KEY = "menumaster-demo-admin";

type LocalStorageState = {
  version: number;
  state: MenuMasterState;
};

type SupabaseRow = Record<string, unknown>;

function isRow(value: unknown): value is SupabaseRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRows(value: unknown): SupabaseRow[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

function rowValue(row: SupabaseRow, snakeKey: string, camelKey = snakeKey) {
  return row[camelKey] ?? row[snakeKey];
}

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

function emptyCustomerState(): MenuMasterState {
  return {
    ...cloneDemoState(),
    tables: [],
    tableSessions: [],
    orders: [],
    payments: [],
  };
}

function mapMenuOption(row: SupabaseRow) {
  return {
    id: String(row.id),
    menuItemId: String(rowValue(row, "menu_item_id", "menuItemId")),
    name: String(row.name),
    priceDeltaCents: Number(rowValue(row, "price_delta_cents", "priceDeltaCents") ?? 0),
  };
}

function mapMenuItem(row: SupabaseRow, options: SupabaseRow[]): MenuItem {
  const embeddedOptions = asRows(row.options);
  const optionRows = embeddedOptions.length
    ? embeddedOptions
    : options.filter(
        (option) =>
          rowValue(option, "menu_item_id", "menuItemId") ===
          rowValue(row, "id"),
      );

  return {
    id: String(row.id),
    restaurantId: String(rowValue(row, "restaurant_id", "restaurantId")),
    categoryId: String(rowValue(row, "category_id", "categoryId")),
    name: String(row.name),
    description: String(row.description ?? ""),
    priceCents: Number(rowValue(row, "price_cents", "priceCents")),
    imageUrl: String(rowValue(row, "image_url", "imageUrl") ?? ""),
    isAvailable: Boolean(rowValue(row, "is_available", "isAvailable")),
    sortOrder: Number(rowValue(row, "sort_order", "sortOrder") ?? 0),
    options: optionRows.map(mapMenuOption),
  };
}

function mapOrder(row: SupabaseRow, items: SupabaseRow[]): Order {
  const embeddedItems = asRows(row.items);
  const itemRows = embeddedItems.length
    ? embeddedItems
    : items.filter((item) => rowValue(item, "order_id", "orderId") === row.id);
  const tableSessionId = rowValue(row, "table_session_id", "tableSessionId");

  return {
    id: String(row.id),
    restaurantId: String(rowValue(row, "restaurant_id", "restaurantId")),
    tableId: String(rowValue(row, "table_id", "tableId")),
    tableSessionId: tableSessionId ? String(tableSessionId) : undefined,
    tableName: String(rowValue(row, "table_name", "tableName") ?? "Table"),
    status: row.status as OrderStatus,
    subtotalCents: Number(rowValue(row, "subtotal_cents", "subtotalCents") ?? 0),
    serviceCents: Number(rowValue(row, "service_cents", "serviceCents") ?? 0),
    taxCents: Number(rowValue(row, "tax_cents", "taxCents") ?? 0),
    discountCents: Number(rowValue(row, "discount_cents", "discountCents") ?? 0),
    totalCents: Number(rowValue(row, "total_cents", "totalCents") ?? 0),
    createdAt: String(rowValue(row, "created_at", "createdAt")),
    paidAt: rowValue(row, "paid_at", "paidAt")
      ? String(rowValue(row, "paid_at", "paidAt"))
      : undefined,
    items: itemRows.map((item) => {
      const selectedOptions = rowValue(
        item,
        "selected_options",
        "selectedOptions",
      );
      const priceSnapshot = rowValue(item, "price_snapshot", "priceSnapshot");

      return {
        id: String(item.id),
        orderId: String(rowValue(item, "order_id", "orderId")),
        menuItemId: String(rowValue(item, "menu_item_id", "menuItemId")),
        name: String(item.name),
        quantity: Number(item.quantity),
        note: item.note ? String(item.note) : undefined,
        unitPriceCents: Number(rowValue(item, "unit_price_cents", "unitPriceCents")),
        lineTotalCents: Number(rowValue(item, "line_total_cents", "lineTotalCents")),
        selectedOptions: Array.isArray(selectedOptions)
          ? (selectedOptions as OrderItem["selectedOptions"])
          : [],
        priceSnapshot: isRow(priceSnapshot)
          ? (priceSnapshot as OrderItem["priceSnapshot"])
          : undefined,
      };
    }),
  };
}

function mapPayment(row: SupabaseRow): Payment {
  return {
    id: String(row.id),
    orderId: String(rowValue(row, "order_id", "orderId")),
    amountCents: Number(rowValue(row, "amount_cents", "amountCents")),
    method: row.method as PaymentMethod,
    createdAt: String(rowValue(row, "created_at", "createdAt")),
  };
}

function mapTableSession(row: SupabaseRow): TableSession {
  return {
    id: String(row.id),
    tableId: String(rowValue(row, "table_id", "tableId")),
    sessionToken: String(rowValue(row, "session_token", "sessionToken")),
    openedAt: String(rowValue(row, "opened_at", "openedAt")),
    closedAt: rowValue(row, "closed_at", "closedAt")
      ? String(rowValue(row, "closed_at", "closedAt"))
      : undefined,
  };
}

function mapTableSessionSummary(row: SupabaseRow): TableSessionSummary {
  const activeSessionId = rowValue(row, "active_session_id", "activeSessionId");
  const openedAt = rowValue(row, "opened_at", "openedAt");
  const closedAt = rowValue(row, "closed_at", "closedAt");
  const latestOrderAt = rowValue(row, "latest_order_at", "latestOrderAt");

  return {
    tableId: String(rowValue(row, "table_id", "tableId")),
    tableName: String(rowValue(row, "table_name", "tableName")),
    token: String(row.token),
    status: row.status === "open" ? "open" : "closed",
    activeSessionId: activeSessionId ? String(activeSessionId) : undefined,
    openedAt: openedAt ? String(openedAt) : undefined,
    closedAt: closedAt ? String(closedAt) : undefined,
    unpaidOrderCount: Number(
      rowValue(row, "unpaid_order_count", "unpaidOrderCount") ?? 0,
    ),
    latestOrderAt: latestOrderAt ? String(latestOrderAt) : undefined,
  };
}

function mapMenuMasterStatePayload(payload: unknown): MenuMasterState {
  if (!isRow(payload) || !isRow(payload.restaurant)) {
    throw new Error("Customer menu state response was not valid.");
  }

  const restaurant = payload.restaurant;
  return {
    restaurant: {
      id: String(restaurant.id),
      name: String(restaurant.name),
      slug: String(restaurant.slug),
      serviceRate: Number(rowValue(restaurant, "service_rate", "serviceRate") ?? 0),
      taxRate: Number(rowValue(restaurant, "tax_rate", "taxRate") ?? 0),
    },
    tables: asRows(payload.tables).map((table) => ({
      id: String(table.id),
      restaurantId: String(rowValue(table, "restaurant_id", "restaurantId")),
      name: String(table.name),
      token: String(table.token),
    })),
    tableSessions: asRows(payload.tableSessions).map(mapTableSession),
    categories: asRows(payload.categories).map((category) => ({
      id: String(category.id),
      restaurantId: String(rowValue(category, "restaurant_id", "restaurantId")),
      name: String(category.name),
      sortOrder: Number(rowValue(category, "sort_order", "sortOrder") ?? 0),
    })),
    menuItems: asRows(payload.menuItems).map((item) => mapMenuItem(item, [])),
    orders: asRows(payload.orders).map((order) => mapOrder(order, [])),
    payments: asRows(payload.payments).map(mapPayment),
  };
}

export async function loadMenuMasterState(): Promise<MenuMasterState> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    const state = ensureLocalTableSessions(getLocalState());
    saveLocalState(state);
    return state;
  }

  const [
    restaurants,
    tables,
    tableSessions,
    categories,
    menuItems,
    options,
    orders,
    orderItems,
    payments,
  ] = await Promise.all([
    supabase.from("restaurants").select("*").limit(1).single(),
    supabase.from("restaurant_tables").select("*").order("name"),
    supabase.from("table_sessions").select("*").order("opened_at", {
      ascending: false,
    }),
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
    tableSessions.error ||
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
    tableSessions: (tableSessions.data ?? []).map(mapTableSession),
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

export async function loadCustomerMenuState(tableToken: string): Promise<MenuMasterState> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    const state = getLocalState();
    const table = findTableByToken(state, tableToken);
    if (!table) {
      return emptyCustomerState();
    }
    const opened = openLocalTableSession(state, table.id);
    saveLocalState(opened.state);

    return {
      ...opened.state,
      tables: [table],
      orders: activeCustomerOrdersForTable(opened.state, table.id),
      payments: [],
    };
  }

  const { data, error } = await supabase.rpc("get_customer_state", {
    p_table_token: tableToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return emptyCustomerState();
  }

  return mapMenuMasterStatePayload(data);
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
  let state = await loadMenuMasterState();
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
  const supabase = createBrowserSupabaseClient();
  let tableSessionId: string | undefined;
  if (!supabase) {
    const opened = openLocalTableSession(state, table.id);
    state = opened.state;
    tableSessionId = opened.session.id;
  }
  const order: Order = {
    id: orderId,
    restaurantId: state.restaurant.id,
    tableId: table.id,
    tableSessionId,
    tableName: table.name,
    status: "new",
    createdAt: new Date().toISOString(),
    items: orderItems.map((item) => ({ ...item, orderId })),
    ...totals,
  };

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

export async function submitCustomerOrder(tableToken: string, cart: CartItem[]) {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    const state = getLocalState();
    const table = findTableByToken(state, tableToken);
    if (!table) {
      throw new Error("Invalid table token.");
    }

    return submitOrder(table, cart);
  }

  const { data, error } = await supabase.rpc("submit_customer_order", {
    p_table_token: tableToken,
    p_cart: cart.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      optionIds: item.optionIds,
      note: item.note,
    })),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!isRow(data)) {
    throw new Error("Order response was not valid.");
  }

  return mapOrder(data, []);
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

export async function loadTableSessionSummaries(): Promise<TableSessionSummary[]> {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("get_admin_table_sessions");
    if (error) {
      throw new Error(error.message);
    }
    return asRows(data).map(mapTableSessionSummary);
  }

  const state = ensureLocalTableSessions(getLocalState());
  saveLocalState(state);
  return summarizeTableSessions(state);
}

export async function openTableSession(tableId: string) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase.rpc("open_table_session", {
      p_table_id: tableId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const opened = openLocalTableSession(getLocalState(), tableId);
  saveLocalState(opened.state);
}

export async function closeTableSession(tableId: string) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase.rpc("close_table_session", {
      p_table_id: tableId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const state = closeLocalTableSession(getLocalState(), tableId);
  saveLocalState(state);
}

export async function resetTableSession(tableId: string) {
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { error } = await supabase.rpc("reset_table_session", {
      p_table_id: tableId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const reset = resetLocalTableSession(getLocalState(), tableId);
  saveLocalState(reset.state);
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
