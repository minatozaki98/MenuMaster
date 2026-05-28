create extension if not exists "pgcrypto";

do $$ begin
  create type order_status as enum (
    'new',
    'accepted',
    'preparing',
    'ready',
    'served',
    'paid',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('cash', 'card', 'qr_transfer');
exception
  when duplicate_object then null;
end $$;

create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  service_rate numeric(5, 4) not null default 0,
  tax_rate numeric(5, 4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references menu_categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  image_url text not null default '',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists menu_item_options (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  price_delta_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id uuid not null references restaurant_tables(id) on delete restrict,
  table_name text not null,
  status order_status not null default 'new',
  subtotal_cents integer not null default 0,
  service_cents integer not null default 0,
  tax_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  note text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  selected_options jsonb not null default '[]'::jsonb,
  price_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  method payment_method not null,
  created_at timestamptz not null default now()
);

create table if not exists stock_events (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  is_available boolean not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table restaurants enable row level security;
alter table restaurant_tables enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table menu_item_options enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table stock_events enable row level security;

drop policy if exists "public read restaurants" on restaurants;
create policy "public read restaurants" on restaurants for select using (true);

drop policy if exists "public read tables" on restaurant_tables;
create policy "public read tables" on restaurant_tables for select using (true);

drop policy if exists "public read categories" on menu_categories;
create policy "public read categories" on menu_categories for select using (true);

drop policy if exists "public read menu items" on menu_items;
create policy "public read menu items" on menu_items for select using (true);

drop policy if exists "admin write menu items" on menu_items;
create policy "admin write menu items" on menu_items
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "public read menu options" on menu_item_options;
create policy "public read menu options" on menu_item_options for select using (true);

drop policy if exists "public insert orders" on orders;
create policy "public insert orders" on orders for insert with check (true);

drop policy if exists "public read orders demo" on orders;
create policy "public read orders demo" on orders for select using (true);

drop policy if exists "admin update orders" on orders;
create policy "admin update orders" on orders for update using (auth.role() = 'authenticated');

drop policy if exists "public insert order items" on order_items;
create policy "public insert order items" on order_items for insert with check (true);

drop policy if exists "public read order items demo" on order_items;
create policy "public read order items demo" on order_items for select using (true);

drop policy if exists "admin payments" on payments;
create policy "admin payments" on payments
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "admin stock events" on stock_events;
create policy "admin stock events" on stock_events
for all using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table order_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table payments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table menu_items;
  end if;
end $$;

insert into restaurants (id, name, slug, service_rate, tax_rate)
values ('00000000-0000-0000-0000-000000000001', 'MenuMaster Yangon Restaurant', 'menumaster-yangon-restaurant', 0.1, 0.07)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  service_rate = excluded.service_rate,
  tax_rate = excluded.tax_rate;

insert into restaurant_tables (id, restaurant_id, name, token)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Table 7', 'table-7-demo'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Table 12', 'table-12-demo')
on conflict (id) do nothing;

insert into restaurant_tables (id, restaurant_id, name, token)
values
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000001', 'Table 1', 'table-1-demo'),
  ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000001', 'Table 2', 'table-2-demo'),
  ('00000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000001', 'Table 3', 'table-3-demo'),
  ('00000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000001', 'Table 4', 'table-4-demo'),
  ('00000000-0000-0000-0000-000000000115', '00000000-0000-0000-0000-000000000001', 'Table 5', 'table-5-demo'),
  ('00000000-0000-0000-0000-000000000116', '00000000-0000-0000-0000-000000000001', 'Table 6', 'table-6-demo'),
  ('00000000-0000-0000-0000-000000000118', '00000000-0000-0000-0000-000000000001', 'Table 8', 'table-8-demo'),
  ('00000000-0000-0000-0000-000000000119', '00000000-0000-0000-0000-000000000001', 'Table 9', 'table-9-demo'),
  ('00000000-0000-0000-0000-000000000120', '00000000-0000-0000-0000-000000000001', 'Table 10', 'table-10-demo'),
  ('00000000-0000-0000-0000-000000000121', '00000000-0000-0000-0000-000000000001', 'Table 11', 'table-11-demo')
on conflict (token) do nothing;

insert into menu_categories (id, restaurant_id, name, sort_order)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Bar Bites', 1),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'Pub Classics', 2),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Drinks', 3),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'Desserts', 4)
on conflict (id) do update set
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into menu_items (id, restaurant_id, category_id, name, description, price_cents, image_url, is_available, sort_order)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'Buffalo Wings', 'Crispy wings tossed in buffalo sauce with ranch dip.', 8900, 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80', true, 1),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', 'House Burger', 'Beef patty, cheddar, pickles, lettuce, tomato, and pub sauce.', 12900, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80', true, 1),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', 'Loaded Fries', 'Fries with cheese sauce, bacon, scallions, and sour cream.', 9900, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=80', false, 2),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', 'House Lager', 'Crisp draft lager served cold.', 4500, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80', true, 1),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'Loaded Nachos', 'Tortilla chips, cheddar, salsa, jalapenos, sour cream, and guacamole.', 7600, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80', true, 2),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 'Mozzarella Sticks', 'Golden mozzarella sticks with warm marinara sauce.', 7800, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80', true, 3),
  ('00000000-0000-0000-0000-000000000307', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', 'Fish and Chips', 'Beer-battered fish with fries, tartar sauce, and lemon.', 13500, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80', true, 3),
  ('00000000-0000-0000-0000-000000000308', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', 'Grilled Salmon', 'Charred salmon with herb potatoes, greens, and lemon butter.', 17900, 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&q=80', true, 4),
  ('00000000-0000-0000-0000-000000000309', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', 'Ribeye Steak', 'Seared ribeye with roasted vegetables and pepper sauce.', 24500, 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=80', true, 5),
  ('00000000-0000-0000-0000-000000000310', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', 'Cold Brew Coffee', 'Slow-steeped coffee served over ice.', 5200, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80', true, 2),
  ('00000000-0000-0000-0000-000000000311', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203', 'Gin and Tonic', 'House gin, tonic, lime, and ice.', 7900, 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80', true, 3),
  ('00000000-0000-0000-0000-000000000312', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000204', 'Sticky Toffee Pudding', 'Warm date sponge with toffee sauce and vanilla ice cream.', 6900, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80', true, 1),
  ('00000000-0000-0000-0000-000000000313', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000204', 'Chocolate Brownie', 'Warm brownie with chocolate sauce and whipped cream.', 6400, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80', true, 2)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  image_url = excluded.image_url,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;

insert into menu_item_options (id, menu_item_id, name, price_delta_cents)
values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', 'Extra ranch', 1200),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000302', 'Add bacon', 1800),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000302', 'Double patty', 3500),
  ('00000000-0000-0000-0000-000000000404', '00000000-0000-0000-0000-000000000303', 'Extra bacon', 1800),
  ('00000000-0000-0000-0000-000000000405', '00000000-0000-0000-0000-000000000304', 'Pint', 0),
  ('00000000-0000-0000-0000-000000000406', '00000000-0000-0000-0000-000000000305', 'No jalapenos', 0),
  ('00000000-0000-0000-0000-000000000407', '00000000-0000-0000-0000-000000000305', 'Extra jalapenos', 0),
  ('00000000-0000-0000-0000-000000000408', '00000000-0000-0000-0000-000000000306', 'Extra marinara', 800),
  ('00000000-0000-0000-0000-000000000409', '00000000-0000-0000-0000-000000000307', 'Extra tartar', 900),
  ('00000000-0000-0000-0000-000000000410', '00000000-0000-0000-0000-000000000308', 'Extra lemon butter', 900),
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000309', 'Add fries', 2200),
  ('00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000310', 'Oat milk', 800),
  ('00000000-0000-0000-0000-000000000413', '00000000-0000-0000-0000-000000000312', 'Extra ice cream', 1800)
on conflict (id) do update set
  name = excluded.name,
  price_delta_cents = excluded.price_delta_cents;
