# MenuMaster

MenuMaster is a database-backed demo for restaurant QR ordering and POS workflows.

## What is included

- Customer table QR route: `/t/table-7-demo`
- Admin/POS route: `/admin`
- Menu browsing with options, notes, cart, and out-of-stock state
- Realtime-ready order board
- Manual POS checkout for cash, card, or QR transfer
- Menu admin with add/edit item, selectable/uploaded images, and availability toggle
- Order history, payment history, and item sales summary
- Supabase Postgres schema and seed data

## Live demo

- Production: `https://menumaster-demo.vercel.app`
- Customer QR demo: `https://menumaster-demo.vercel.app/t/table-7-demo`
- Admin demo: `https://menumaster-demo.vercel.app/admin`

## Local development

```powershell
npm install
npm run dev
```

Open:

- Customer demo: `http://localhost:3000/t/table-7-demo`
- Admin demo: `http://localhost:3000/admin`

If Supabase env vars are not configured, the app runs in local demo mode. Demo admin login:

- Email: `admin@menumaster.demo`
- Password: `demo-admin`

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Run `supabase/storage.sql` in the Supabase SQL editor for the `menu-images` bucket.
4. Run `supabase/table-sessions-security.sql` in the Supabase SQL editor to add table sessions, table-token customer RPCs, and tighter order RLS.
5. Create an auth user for admin login.
6. Copy `.env.example` to `.env.local`.
7. Fill:

```powershell
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

8. Restart the dev server.

Customer ordering is table-token scoped through Supabase RPC functions. Admin order, payment, and menu writes require an authenticated Supabase user. Before production, add real staff roles and rate limiting for anonymous customer order submission.

## Scripts

```powershell
npm run dev
npm run lint
npm run build
npm test
```
