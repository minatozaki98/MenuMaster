import { describe, expect, it } from "vitest";
import { demoState } from "./demo-data";
import {
  closeLocalTableSession,
  ensureLocalTableSessions,
  resetLocalTableSession,
  summarizeTableSessions,
} from "./table-sessions";

describe("table session helpers", () => {
  it("assigns legacy orders to an active session for their table", () => {
    const state = ensureLocalTableSessions(demoState, {
      now: "2026-05-28T02:00:00.000Z",
      createId: (prefix) => `${prefix}-1`,
    });
    const order = state.orders.find((candidate) => candidate.id === "order-demo-1");
    const session = state.tableSessions.find(
      (candidate) => candidate.tableId === "table-12" && !candidate.closedAt,
    );

    expect(session).toBeDefined();
    expect(order?.tableSessionId).toBe(session?.id);
  });

  it("resets a paid table session and hides old orders from the active customer view", () => {
    const seeded = ensureLocalTableSessions(
      {
        ...demoState,
        orders: demoState.orders.map((order) => ({ ...order, status: "paid" as const })),
      },
      {
        now: "2026-05-28T02:00:00.000Z",
        createId: (prefix, tableId) => `${prefix}-${tableId}-old`,
      },
    );
    const reset = resetLocalTableSession(seeded, "table-12", {
      now: "2026-05-28T03:00:00.000Z",
      createId: (prefix, tableId) => `${prefix}-${tableId}-new`,
    });
    const oldOrder = reset.state.orders.find((order) => order.id === "order-demo-1");
    const activeSession = reset.state.tableSessions.find(
      (session) => session.tableId === "table-12" && !session.closedAt,
    );

    expect(reset.state.tableSessions).toHaveLength(seeded.tableSessions.length + 1);
    expect(oldOrder?.tableSessionId).not.toBe(activeSession?.id);
    expect(reset.customerOrders).toEqual([]);
  });

  it("blocks closing or resetting a table with unpaid active orders", () => {
    const state = ensureLocalTableSessions(demoState, {
      now: "2026-05-28T02:00:00.000Z",
      createId: (prefix, tableId) => `${prefix}-${tableId}`,
    });

    expect(() =>
      closeLocalTableSession(state, "table-12", {
        now: "2026-05-28T03:00:00.000Z",
        createId: (prefix, tableId) => `${prefix}-${tableId}-closed`,
      }),
    ).toThrow("Settle or cancel open orders before closing this table.");

    expect(() =>
      resetLocalTableSession(state, "table-12", {
        now: "2026-05-28T03:00:00.000Z",
        createId: (prefix, tableId) => `${prefix}-${tableId}-reset`,
      }),
    ).toThrow("Settle or cancel open orders before resetting this table.");
  });

  it("summarizes table status for admin controls", () => {
    const state = ensureLocalTableSessions(demoState, {
      now: "2026-05-28T02:00:00.000Z",
      createId: (prefix, tableId) => `${prefix}-${tableId}`,
    });

    expect(summarizeTableSessions(state)).toContainEqual(
      expect.objectContaining({
        tableId: "table-12",
        tableName: "Table 12",
        status: "open",
        unpaidOrderCount: 1,
        latestOrderAt: expect.any(String),
      }),
    );
  });
});
