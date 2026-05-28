import type { MenuItem, OrderStatus, PaymentMethod } from "./types";

export type Language = "en" | "my";

export const languageLabels: Record<Language, string> = {
  en: "English",
  my: "မြန်မာ",
};

export const defaultLanguage: Language = "en";

const dictionary = {
  en: {
    appName: "MenuMaster POS",
    qrOrderingDemo: "QR ordering demo",
    demoRestaurantLive: "Demo restaurant live",
    builtForOneRestaurant: "Built for one restaurant floor",
    landingDescription:
      "QR ordering, live kitchen status, checkout, menu stock, and table session controls in one familiar restaurant dashboard.",
    guestQrMenu: "Guest QR menu",
    adminPos: "Admin POS",
    tableResetControls: "Table reset controls",
    openCustomerQrMenu: "Open customer QR menu",
    customerQrDescription: "Simulates a guest scanning Table 7 and placing an order.",
    openAdminPos: "Open admin POS",
    adminDemoLogin:
      "Demo login uses admin@menumaster.demo and demo-admin unless Supabase env vars are configured.",
    twelveTables: "12 tables",
    qrSessionsDescription: "QR sessions can be opened, closed, or reset.",
    liveOrderStates: "Live order states",
    liveOrderStatesDescription: "Staff can move orders from new to paid.",
    demoSafeData: "Demo-safe data",
    demoSafeDataDescription: "Works locally without Supabase configuration.",
    staffAccess: "Staff access",
    fastControls: "Fast controls for the floor.",
    signInDescription:
      "Sign in to manage live orders, checkout, menu availability, and QR table sessions without changing the guest flow.",
    adminSignIn: "Admin sign in",
    menuMasterDemoDashboard: "MenuMaster demo dashboard",
    demoCredentials:
      "Demo credentials are prefilled. Use a real Supabase auth setup when adding more staff.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    adminDashboard: "Admin dashboard",
    dashboardDescription:
      "Live floor control, checkout, menu stock, and QR table sessions.",
    refresh: "Refresh",
    signOut: "Sign out",
    orders: "Orders",
    pos: "POS",
    menu: "Menu",
    history: "History",
    tables: "Tables",
    floorOverview: "Floor overview",
    openOrders: "Open orders",
    activeTables: "Active tables",
    readyNow: "Ready now",
    todayRevenue: "Today revenue",
    kitchenQueue: "Kitchen queue",
    needsAttention: "Needs attention",
    counterCheckout: "Counter checkout",
    selectOrder: "Select an order, review the bill, apply discount, then mark paid.",
    discount: "Discount",
    payment: "Payment",
    markPaid: "Mark paid",
    noOpenOrders: "No open orders to checkout.",
    menuItems: "Menu items",
    addMenuItem: "Add menu item",
    editMenuItem: "Edit menu item",
    newItem: "New item",
    name: "Name",
    price: "Price",
    priceMmk: "Price (MMK)",
    category: "Category",
    description: "Description",
    image: "Image",
    uploadImage: "Upload image",
    usePreset: "Use preset instead",
    uploadHint: "Uploaded images are stored in Supabase Storage when connected.",
    saveItem: "Save item",
    saveChanges: "Save changes",
    available: "Available",
    outOfStock: "Out of stock",
    edit: "Edit",
    orderHistory: "Order history",
    salesSummary: "Sales summary",
    sold: "sold",
    openSession: "Open session",
    closedSession: "Closed session",
    open: "Open",
    close: "Close",
    reset: "Reset",
    latestOrder: "Latest order",
    none: "None",
    settleBeforeReset:
      "Settle or cancel open orders before closing or resetting this table.",
    receiptPreview: "Receipt preview",
    subtotal: "Subtotal",
    service: "Service",
    tax: "Tax",
    total: "Total",
    loadingAdmin: "Loading admin...",
    loadingMenu: "Loading menu...",
    invalidQr: "Invalid table QR",
    invalidQrDescription: "This QR token does not match a table in the demo restaurant.",
    browseSendKitchen: "Browse, add notes, and send straight to the kitchen.",
    addToCart: "Add to cart",
    cart: "Cart",
    items: "items",
    kitchenNote: "Kitchen note",
    standard: "Standard",
    placeOrder: "Place order",
    reviewOrder: "Review order",
    backToMenu: "Back to menu",
    orderReview: "Order review",
    reviewBeforeSend: "Check quantities and kitchen notes before sending.",
    cashOnly: "Cash only",
    sending: "Sending...",
    latestOrderLabel: "Latest order",
    thisTableHistory: "This table history",
    noOrdersForTable: "No orders for this table yet.",
    addItemsToStart: "Add menu items to start an order.",
    orderTotal: "Order total",
    lines: "lines",
    changeStatus: "Change status",
    noOrdersYet: "No orders yet",
    newQrOrdersAppear: "New QR orders will appear here.",
    chooseImageFile: "Choose an image file.",
    imageTooLarge: "Choose an image smaller than 1.5 MB for this demo.",
    requiredMenuFields: "Menu item name, category, price, and image are required.",
    unableToSaveMenu: "Unable to save menu item.",
    unableToReadImage: "Unable to read image file.",
    unableToUpdateMenu: "Unable to update menu.",
    unableToRecordPayment: "Unable to record payment.",
    unableToUpdateOrder: "Unable to update order.",
    unableToOpenTable: "Unable to open table.",
    unableToCloseTable: "Unable to close table.",
    unableToResetTable: "Unable to reset table.",
    unableToSubmitOrder: "Unable to submit order.",
    localDemoLogin: "Use admin@menumaster.demo and demo-admin for local demo mode.",
  },
  my: {
    appName: "MenuMaster POS",
    qrOrderingDemo: "QR မှာယူမှု စမ်းသပ်မှု",
    demoRestaurantLive: "စမ်းသပ်ဆိုင် ဖွင့်ထားသည်",
    builtForOneRestaurant: "မြန်မာစားသောက်ဆိုင် တစ်ဆိုင်စာ",
    landingDescription:
      "QR မှာယူမှု၊ မီးဖိုချောင် အခြေအနေ၊ ငွေရှင်း၊ မီနူးလက်ကျန်နှင့် စားပွဲ session များကို dashboard တစ်ခုတည်းတွင် စီမံနိုင်သည်။",
    guestQrMenu: "ဧည့်သည် QR မီနူး",
    adminPos: "Admin POS",
    tableResetControls: "စားပွဲ reset ထိန်းချုပ်မှု",
    openCustomerQrMenu: "ဧည့်သည် QR မီနူး ဖွင့်မည်",
    customerQrDescription: "Table 7 မှ QR scan လုပ်ပြီး မှာယူသည့်အတိုင်း စမ်းကြည့်ရန်။",
    openAdminPos: "Admin POS ဖွင့်မည်",
    adminDemoLogin:
      "Supabase env မသတ်မှတ်ထားပါက admin@menumaster.demo နှင့် demo-admin ကို သုံးပါ။",
    twelveTables: "စားပွဲ ၁၂ လုံး",
    qrSessionsDescription: "QR session များကို ဖွင့်၊ ပိတ်၊ reset လုပ်နိုင်သည်။",
    liveOrderStates: "Order အခြေအနေများ",
    liveOrderStatesDescription: "Order ကို new မှ paid အထိ ပြောင်းနိုင်သည်။",
    demoSafeData: "စမ်းသပ်ဒေတာ",
    demoSafeDataDescription: "Supabase မလိုဘဲ local တွင် အလုပ်လုပ်သည်။",
    staffAccess: "ဝန်ထမ်း ဝင်ရောက်မှု",
    fastControls: "Floor အတွက် မြန်သော ထိန်းချုပ်မှုများ။",
    signInDescription:
      "Live order၊ checkout၊ menu availability နှင့် QR table session များကို စီမံရန် ဝင်ပါ။",
    adminSignIn: "Admin ဝင်ရန်",
    menuMasterDemoDashboard: "MenuMaster စမ်းသပ် dashboard",
    demoCredentials:
      "Demo login ကို ဖြည့်ထားပြီးသားဖြစ်သည်။ ဝန်ထမ်းများထပ်တိုးပါက Supabase auth သုံးပါ။",
    email: "အီးမေးလ်",
    password: "စကားဝှက်",
    signIn: "ဝင်ရန်",
    signingIn: "ဝင်နေသည်...",
    adminDashboard: "Admin စီမံခန့်ခွဲမှု",
    dashboardDescription:
      "စားပွဲအခြေအနေ၊ ငွေရှင်း၊ မီနူးလက်ကျန်နှင့် QR session များကို စီမံပါ။",
    refresh: "ပြန်တင်ရန်",
    signOut: "ထွက်ရန်",
    orders: "အော်ဒါများ",
    pos: "POS",
    menu: "မီနူး",
    history: "မှတ်တမ်း",
    tables: "စားပွဲများ",
    floorOverview: "ဆိုင်ခန်း အကျဉ်းချုပ်",
    openOrders: "ဖွင့်ထားသောအော်ဒါ",
    activeTables: "အသုံးပြုနေသော စားပွဲ",
    readyNow: "အဆင်သင့်",
    todayRevenue: "ယနေ့ဝင်ငွေ",
    kitchenQueue: "မီးဖိုချောင် စောင့်စာရင်း",
    needsAttention: "စောင့်ကြည့်ရန်",
    counterCheckout: "ကောင်တာ ငွေရှင်း",
    selectOrder: "အော်ဒါရွေး၊ ဘောင်ချာစစ်၊ လျှော့ဈေးထည့်ပြီး ငွေရှင်းပြီး လုပ်ပါ။",
    discount: "လျှော့ဈေး",
    payment: "ငွေပေးချေမှု",
    markPaid: "Paid လုပ်မည်",
    noOpenOrders: "ငွေရှင်းရန် order မရှိပါ။",
    menuItems: "မီနူး item များ",
    addMenuItem: "မီနူး item ထည့်ရန်",
    editMenuItem: "မီနူး item ပြင်ရန်",
    newItem: "Item အသစ်",
    name: "အမည်",
    price: "ဈေးနှုန်း",
    priceMmk: "ဈေးနှုန်း (ကျပ်)",
    category: "အမျိုးအစား",
    description: "ဖော်ပြချက်",
    image: "ပုံ",
    uploadImage: "ပုံတင်ရန်",
    usePreset: "Preset သုံးမည်",
    uploadHint: "Supabase Storage ချိတ်ထားပါက ပုံများကို သိမ်းမည်။",
    saveItem: "Item သိမ်းမည်",
    saveChanges: "ပြင်ဆင်မှု သိမ်းမည်",
    available: "ရနိုင်သည်",
    outOfStock: "ကုန်နေသည်",
    edit: "ပြင်ရန်",
    orderHistory: "Order မှတ်တမ်း",
    salesSummary: "ရောင်းအား အကျဉ်းချုပ်",
    sold: "ရောင်းပြီး",
    openSession: "Session ဖွင့်ထားသည်",
    closedSession: "Session ပိတ်ထားသည်",
    open: "ဖွင့်ရန်",
    close: "ပိတ်ရန်",
    reset: "Reset",
    latestOrder: "နောက်ဆုံး order",
    none: "မရှိပါ",
    settleBeforeReset: "ဤစားပွဲကို ပိတ်/Reset မလုပ်မီ open order များကို ရှင်းပါ။",
    receiptPreview: "Receipt ကြည့်ရန်",
    subtotal: "စုစုပေါင်း",
    service: "Service",
    tax: "Tax",
    total: "စုစုပေါင်း",
    loadingAdmin: "Admin တင်နေသည်...",
    loadingMenu: "မီနူး တင်နေသည်...",
    invalidQr: "QR မမှန်ပါ",
    invalidQrDescription: "ဤ QR token သည် စမ်းသပ်ဆိုင်ရှိ စားပွဲနှင့် မကိုက်ပါ။",
    browseSendKitchen: "ရွေးချယ်၊ note ထည့်ပြီး မီးဖိုချောင်သို့ ပို့ပါ။",
    addToCart: "Cart ထဲထည့်မည်",
    cart: "Cart",
    items: "ခု",
    kitchenNote: "မီးဖိုချောင် note",
    standard: "ပုံမှန်",
    placeOrder: "Order ပို့မည်",
    reviewOrder: "Order စစ်မည်",
    backToMenu: "မီနူးသို့ ပြန်ရန်",
    orderReview: "Order စစ်ဆေးရန်",
    reviewBeforeSend: "မပို့မီ အရေအတွက်နှင့် မီးဖိုချောင် note များကို စစ်ပါ။",
    cashOnly: "ငွေသားသာ",
    sending: "ပို့နေသည်...",
    latestOrderLabel: "နောက်ဆုံး order",
    thisTableHistory: "ဤစားပွဲ မှတ်တမ်း",
    noOrdersForTable: "ဤစားပွဲတွင် order မရှိသေးပါ။",
    addItemsToStart: "Order စရန် မီနူး item ထည့်ပါ။",
    orderTotal: "Order စုစုပေါင်း",
    lines: "လိုင်း",
    changeStatus: "အခြေအနေ ပြောင်းရန်",
    noOrdersYet: "Order မရှိသေးပါ",
    newQrOrdersAppear: "QR order အသစ်များ ဤနေရာတွင် ပေါ်လာမည်။",
    chooseImageFile: "ပုံ file ရွေးပါ။",
    imageTooLarge: "ဤ demo အတွက် 1.5 MB ထက်ငယ်သော ပုံကို ရွေးပါ။",
    requiredMenuFields: "မီနူး item အမည်၊ အမျိုးအစား၊ ဈေးနှုန်း၊ ပုံ လိုအပ်သည်။",
    unableToSaveMenu: "မီနူး item သိမ်းမရပါ။",
    unableToReadImage: "ပုံဖတ်မရပါ။",
    unableToUpdateMenu: "မီနူး ပြင်မရပါ။",
    unableToRecordPayment: "ငွေပေးချေမှု မှတ်မရပါ။",
    unableToUpdateOrder: "Order ပြင်မရပါ။",
    unableToOpenTable: "စားပွဲ ဖွင့်မရပါ။",
    unableToCloseTable: "စားပွဲ ပိတ်မရပါ။",
    unableToResetTable: "စားပွဲ reset လုပ်မရပါ။",
    unableToSubmitOrder: "Order ပို့မရပါ။",
    localDemoLogin: "Local demo အတွက် admin@menumaster.demo နှင့် demo-admin ကို သုံးပါ။",
  },
} as const;

type TranslationKey = keyof typeof dictionary.en;

const statusLabels: Record<Language, Record<OrderStatus, string>> = {
  en: {
    new: "new",
    accepted: "accepted",
    preparing: "preparing",
    ready: "ready",
    served: "served",
    paid: "paid",
    cancelled: "cancelled",
  },
  my: {
    new: "အသစ်",
    accepted: "လက်ခံပြီး",
    preparing: "ပြင်ဆင်နေ",
    ready: "အဆင်သင့်",
    served: "ပေးပြီး",
    paid: "ငွေရှင်းပြီး",
    cancelled: "ပယ်ဖျက်ပြီး",
  },
};

const paymentMethodLabels: Record<Language, Record<PaymentMethod, string>> = {
  en: {
    cash: "Cash",
    card: "Card",
    qr_transfer: "QR transfer",
  },
  my: {
    cash: "ငွေသား",
    card: "ကတ်",
    qr_transfer: "QR ငွေလွှဲ",
  },
};

const categoryLabels: Record<string, string> = {
  "cat-starters": "အမြည်း",
  "cat-mains": "အဓိကဟင်း",
  "cat-drinks": "အချိုရည်",
  "cat-desserts": "အချိုပွဲ",
};

const menuItemLabels: Record<string, { name: string; description: string }> = {
  "item-satay": {
    name: "Buffalo ကြက်တောင်ပံ",
    description: "ကြွပ်ရွသော ကြက်တောင်ပံကို buffalo sauce နှင့် ranch dip ဖြင့်။",
  },
  "item-papaya-salad": {
    name: "Nachos အစုံ",
    description: "Tortilla chips၊ cheese၊ salsa၊ jalapenos၊ sour cream နှင့် guacamole။",
  },
  "item-tom-yum": {
    name: "Mozzarella ချောင်းကြော်",
    description: "ရွှေရောင်ကြွပ်သော mozzarella sticks နှင့် marinara sauce။",
  },
  "item-pad-thai": {
    name: "House Burger",
    description: "Beef patty၊ cheddar၊ pickles၊ lettuce၊ tomato နှင့် pub sauce။",
  },
  "item-curry": {
    name: "Loaded Fries",
    description: "Fries၊ cheese sauce၊ bacon၊ scallions နှင့် sour cream။",
  },
  "item-crispy-pork": {
    name: "Fish and Chips",
    description: "Beer-battered fish၊ fries၊ tartar sauce နှင့် lemon။",
  },
  "item-grilled-salmon": {
    name: "Grilled Salmon",
    description: "Salmon ကင်၊ herb potatoes၊ greens နှင့် lemon butter။",
  },
  "item-ribeye": {
    name: "Ribeye Steak",
    description: "Ribeye steak၊ roasted vegetables နှင့် pepper sauce။",
  },
  "item-iced-tea": {
    name: "House Lager",
    description: "အေးမြသော draft lager။",
  },
  "item-cold-brew": {
    name: "Cold Brew Coffee",
    description: "အေးမြသော slow-steeped coffee။",
  },
  "item-lime-soda": {
    name: "Gin and Tonic",
    description: "House gin၊ tonic၊ lime နှင့် ice။",
  },
  "item-mango-sticky-rice": {
    name: "Sticky Toffee Pudding",
    description: "Date sponge ပူပူ၊ toffee sauce နှင့် vanilla ice cream။",
  },
  "item-coconut-cake": {
    name: "Chocolate Brownie",
    description: "Brownie ပူပူ၊ chocolate sauce နှင့် whipped cream။",
  },
};

const optionLabels: Record<string, string> = {
  "opt-satay-extra": "Ranch ထပ်ထည့်",
  "opt-salad-mild": "Jalapenos မထည့်",
  "opt-salad-extra-spicy": "Jalapenos ပိုထည့်",
  "opt-tom-yum-creamy": "Marinara ထပ်ထည့်",
  "opt-pad-spicy": "Bacon ထည့်",
  "opt-burger-double": "Double patty",
  "opt-curry-rice": "Bacon ထပ်ထည့်",
  "opt-pork-egg": "Tartar ထပ်ထည့်",
  "opt-salmon-sauce": "Lemon butter ထပ်ထည့်",
  "opt-ribeye-fries": "Fries ထည့်",
  "opt-tea-less-sugar": "Pint",
  "opt-cold-brew-oat": "Oat milk",
  "opt-mango-extra": "Ice cream ထပ်ထည့်",
};

export function translate(language: Language, key: TranslationKey) {
  return dictionary[language][key] ?? dictionary.en[key];
}

export function translateStatus(language: Language, status: OrderStatus) {
  return statusLabels[language][status];
}

export function translatePaymentMethod(language: Language, method: PaymentMethod) {
  return paymentMethodLabels[language][method];
}

export function translateCategory(language: Language, id: string, fallback: string) {
  return language === "my" ? categoryLabels[id] ?? fallback : fallback;
}

export function translateMenuItem(language: Language, item: MenuItem) {
  if (language === "en") {
    return { name: item.name, description: item.description };
  }

  return menuItemLabels[item.id] ?? { name: item.name, description: item.description };
}

export function translateMenuItemSnapshot(
  language: Language,
  menuItemId: string,
  fallback: string,
) {
  return language === "my" ? menuItemLabels[menuItemId]?.name ?? fallback : fallback;
}

export function translateOption(language: Language, id: string, fallback: string) {
  return language === "my" ? optionLabels[id] ?? fallback : fallback;
}

export function translateTableName(language: Language, tableName: string) {
  if (language === "en") {
    return tableName;
  }

  const number = tableName.match(/\d+/)?.[0];
  return number ? `စားပွဲ ${number}` : tableName;
}
