import type { MenuMasterState, Order, TableSession, TableSessionSummary } from "./types";

type LocalSessionOptions = {
  now?: string;
  createId?: (prefix: string, tableId: string) => string;
};

const UNPAID_STATUSES = new Set(["new", "accepted", "preparing", "ready", "served"]);

function currentIso(options: LocalSessionOptions) {
  return options.now ?? new Date().toISOString();
}

function defaultCreateId(prefix: string, tableId: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${tableId}-${Date.now()}`;
}

function createTableSession(tableId: string, options: LocalSessionOptions): TableSession {
  const createId = options.createId ?? defaultCreateId;
  return {
    id: createId("session", tableId),
    tableId,
    sessionToken: createId("token", tableId),
    openedAt: currentIso(options),
  };
}

function isUnpaid(order: Order) {
  return UNPAID_STATUSES.has(order.status);
}

function customerOrdersForActiveSession(state: MenuMasterState, tableId: string) {
  const activeSession = state.tableSessions.find(
    (session) => session.tableId === tableId && !session.closedAt,
  );

  if (!activeSession) {
    return [];
  }

  return state.orders.filter((order) => order.tableSessionId === activeSession.id);
}

export function ensureLocalTableSessions(
  state: MenuMasterState,
  options: LocalSessionOptions = {},
): MenuMasterState {
  if (state.tableSessions.length) {
    return state;
  }

  const tableSessions = state.tables.map((table) =>
    createTableSession(table.id, options),
  );

  return {
    ...state,
    tableSessions,
    orders: state.orders.map((order) => {
      if (order.tableSessionId) {
        return order;
      }

      const activeSession = tableSessions.find(
        (session) => session.tableId === order.tableId && !session.closedAt,
      );
      return activeSession ? { ...order, tableSessionId: activeSession.id } : order;
    }),
  };
}

export function openLocalTableSession(
  state: MenuMasterState,
  tableId: string,
  options: LocalSessionOptions = {},
) {
  const initialized = ensureLocalTableSessions(state, options);
  const activeSession = initialized.tableSessions.find(
    (session) => session.tableId === tableId && !session.closedAt,
  );

  if (activeSession) {
    return { state: initialized, session: activeSession };
  }

  const session = createTableSession(tableId, options);
  return {
    state: {
      ...initialized,
      tableSessions: [...initialized.tableSessions, session],
    },
    session,
  };
}

export function closeLocalTableSession(
  state: MenuMasterState,
  tableId: string,
  options: LocalSessionOptions = {},
) {
  const initialized = ensureLocalTableSessions(state, options);
  const activeSession = initialized.tableSessions.find(
    (session) => session.tableId === tableId && !session.closedAt,
  );

  if (!activeSession) {
    return initialized;
  }

  const hasUnpaidOrders = initialized.orders.some(
    (order) => order.tableSessionId === activeSession.id && isUnpaid(order),
  );
  if (hasUnpaidOrders) {
    throw new Error("Settle or cancel open orders before closing this table.");
  }

  const closedAt = currentIso(options);
  return {
    ...initialized,
    tableSessions: initialized.tableSessions.map((session) =>
      session.id === activeSession.id ? { ...session, closedAt } : session,
    ),
  };
}

export function resetLocalTableSession(
  state: MenuMasterState,
  tableId: string,
  options: LocalSessionOptions = {},
) {
  const initialized = ensureLocalTableSessions(state, options);
  const activeSession = initialized.tableSessions.find(
    (session) => session.tableId === tableId && !session.closedAt,
  );
  const hasUnpaidOrders =
    activeSession &&
    initialized.orders.some(
      (order) => order.tableSessionId === activeSession.id && isUnpaid(order),
    );

  if (hasUnpaidOrders) {
    throw new Error("Settle or cancel open orders before resetting this table.");
  }

  const closedAt = currentIso(options);
  const closedState = activeSession
    ? {
        ...initialized,
        tableSessions: initialized.tableSessions.map((session) =>
          session.id === activeSession.id ? { ...session, closedAt } : session,
        ),
      }
    : initialized;
  const opened = openLocalTableSession(closedState, tableId, options);

  return {
    state: opened.state,
    customerOrders: customerOrdersForActiveSession(opened.state, tableId),
  };
}

export function activeCustomerOrdersForTable(state: MenuMasterState, tableId: string) {
  const initialized = ensureLocalTableSessions(state);
  return customerOrdersForActiveSession(initialized, tableId);
}

export function summarizeTableSessions(state: MenuMasterState): TableSessionSummary[] {
  const initialized = ensureLocalTableSessions(state);

  return initialized.tables.map((table) => {
    const sessions = initialized.tableSessions
      .filter((session) => session.tableId === table.id)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
    const activeSession = sessions.find((session) => !session.closedAt);
    const latestSession = activeSession ?? sessions[0];
    const sessionOrders = activeSession
      ? initialized.orders.filter((order) => order.tableSessionId === activeSession.id)
      : [];

    return {
      tableId: table.id,
      tableName: table.name,
      token: table.token,
      status: activeSession ? "open" : "closed",
      activeSessionId: activeSession?.id,
      openedAt: activeSession?.openedAt,
      closedAt: latestSession?.closedAt,
      unpaidOrderCount: sessionOrders.filter(isUnpaid).length,
      latestOrderAt: sessionOrders
        .map((order) => order.createdAt)
        .sort()
        .at(-1),
    };
  });
}
