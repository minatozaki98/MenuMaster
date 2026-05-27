import { describe, expect, it } from "vitest";
import {
  calculateOrderTotal,
  createOrderItemSnapshot,
  isOrderable,
} from "./pos";

describe("POS order helpers", () => {
  it("stores order item totals from the submitted menu price snapshot", () => {
    const item = createOrderItemSnapshot({
      menuItemId: "item-pad-thai",
      name: "House Burger",
      basePriceCents: 12900,
      quantity: 2,
      selectedOptions: [
        { id: "spice-medium", name: "Medium spice", priceDeltaCents: 0 },
        { id: "double-patty", name: "Double patty", priceDeltaCents: 3500 },
      ],
      note: "No peanuts",
    });

    expect(item.unitPriceCents).toBe(16400);
    expect(item.lineTotalCents).toBe(32800);
    expect(item.priceSnapshot).toEqual({
      basePriceCents: 12900,
      selectedOptions: [
        { id: "spice-medium", name: "Medium spice", priceDeltaCents: 0 },
        { id: "double-patty", name: "Double patty", priceDeltaCents: 3500 },
      ],
    });
  });

  it("calculates subtotal, service, tax, discount, and final payable total", () => {
    const result = calculateOrderTotal({
      items: [
        { lineTotalCents: 10000 },
        { lineTotalCents: 25000 },
      ],
      serviceRate: 0.1,
      taxRate: 0.07,
      discountCents: 5000,
    });

    expect(result).toEqual({
      subtotalCents: 35000,
      serviceCents: 3500,
      taxCents: 2345,
      discountCents: 5000,
      totalCents: 35845,
    });
  });

  it("does not allow unavailable menu items to be ordered", () => {
    expect(isOrderable({ isAvailable: true })).toBe(true);
    expect(isOrderable({ isAvailable: false })).toBe(false);
  });
});
