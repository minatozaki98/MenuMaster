# MenuMaster Real Demo Plan

## Summary

Build a real database-backed demo for a restaurant QR ordering and POS web app. Customers scan a table-specific QR code, order from the menu, and staff receive the order in an admin/POS dashboard. This is not a full production POS yet; it is a realistic demo with real persistence, admin login, realtime order updates, menu management, manual payment checkout, and history.

## Key Decisions

- Stack: Next.js, TypeScript, Tailwind CSS, shadcn-style components, Supabase Postgres, and Vercel.
- Database: relational SQL for reliable relationships between restaurants, tables, menu items, orders, order items, and payments.
- Backend: Supabase Postgres, Auth, Storage, and Realtime.
- Auth: single admin login for v1.
- QR model: one QR per table.
- Payment: manual POS payment recording.
- App shape: one web app with separate customer and admin routes.

## Core Features

- Customer table route at `/t/[tableToken]`.
- Admin route at `/admin`, protected by Supabase Auth.
- Menu browsing, options, notes, cart, and order submission.
- Realtime admin order board.
- Menu admin with availability/out-of-stock controls.
- POS checkout with manual payment methods.
- Order, payment, and sales history.

## Data Model

Use Supabase Postgres tables:

- `restaurants`
- `restaurant_tables`
- `menu_categories`
- `menu_items`
- `menu_item_options`
- `orders`
- `order_items`
- `payments`
- `stock_events`

## Implementation Phases

1. Create this project plan markdown file.
2. Scaffold the Next.js app.
3. Add Supabase schema and seed data.
4. Build the customer QR ordering flow.
5. Build admin login and protected shell.
6. Build realtime order board.
7. Build menu admin.
8. Build POS checkout.
9. Build history and sales summary.
10. Add verification and deployment notes.
