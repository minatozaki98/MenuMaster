export type OrderStatus =
  | "new"
  | "accepted"
  | "preparing"
  | "ready"
  | "served"
  | "paid"
  | "cancelled";

export type PaymentMethod = "cash" | "card" | "qr_transfer";

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  serviceRate: number;
  taxRate: number;
};

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  name: string;
  token: string;
};

export type MenuCategory = {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
};

export type MenuOption = {
  id: string;
  menuItemId: string;
  name: string;
  priceDeltaCents: number;
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  isAvailable: boolean;
  sortOrder: number;
  options: MenuOption[];
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  note?: string;
  unitPriceCents: number;
  lineTotalCents: number;
  selectedOptions: MenuOption[];
  priceSnapshot?: {
    basePriceCents: number;
    selectedOptions: Array<{
      id: string;
      name: string;
      priceDeltaCents: number;
    }>;
  };
};

export type Order = {
  id: string;
  restaurantId: string;
  tableId: string;
  tableName: string;
  status: OrderStatus;
  subtotalCents: number;
  serviceCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  paidAt?: string;
  items: OrderItem[];
};

export type Payment = {
  id: string;
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  createdAt: string;
};

export type MenuMasterState = {
  restaurant: Restaurant;
  tables: RestaurantTable[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  payments: Payment[];
};

export type CartItem = {
  menuItemId: string;
  quantity: number;
  optionIds: string[];
  note: string;
};
