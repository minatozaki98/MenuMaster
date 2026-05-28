export type SelectedOptionSnapshot = {
  id: string;
  name: string;
  priceDeltaCents: number;
};

export type OrderItemSnapshotInput = {
  menuItemId: string;
  name: string;
  basePriceCents: number;
  quantity: number;
  selectedOptions?: SelectedOptionSnapshot[];
  note?: string;
};

export type OrderItemSnapshot = {
  menuItemId: string;
  name: string;
  quantity: number;
  note?: string;
  unitPriceCents: number;
  lineTotalCents: number;
  priceSnapshot: {
    basePriceCents: number;
    selectedOptions: SelectedOptionSnapshot[];
  };
};

export type OrderTotalInput = {
  items: Array<{ lineTotalCents: number }>;
  serviceRate?: number;
  taxRate?: number;
  discountCents?: number;
};

export type OrderTotal = {
  subtotalCents: number;
  serviceCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
};

export function createOrderItemSnapshot({
  menuItemId,
  name,
  basePriceCents,
  quantity,
  selectedOptions = [],
  note,
}: OrderItemSnapshotInput): OrderItemSnapshot {
  const optionTotalCents = selectedOptions.reduce(
    (sum, option) => sum + option.priceDeltaCents,
    0,
  );
  const unitPriceCents = basePriceCents + optionTotalCents;

  return {
    menuItemId,
    name,
    quantity,
    note,
    unitPriceCents,
    lineTotalCents: unitPriceCents * quantity,
    priceSnapshot: {
      basePriceCents,
      selectedOptions,
    },
  };
}

export function calculateOrderTotal({
  items,
  serviceRate = 0,
  taxRate = 0,
  discountCents = 0,
}: OrderTotalInput): OrderTotal {
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const serviceCents = Math.round(subtotalCents * serviceRate);
  const taxableCents = Math.max(subtotalCents + serviceCents - discountCents, 0);
  const taxCents = Math.round(taxableCents * taxRate);
  const totalCents = taxableCents + taxCents;

  return {
    subtotalCents,
    serviceCents,
    taxCents,
    discountCents,
    totalCents,
  };
}

export function isOrderable(item: { isAvailable: boolean }) {
  return item.isAvailable;
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MMK",
    maximumFractionDigits: 0,
  }).format(cents);
}
