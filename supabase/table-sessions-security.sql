create table if not exists table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references restaurant_tables(id) on delete cascade,
  session_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists idx_table_sessions_one_active
on table_sessions (table_id)
where closed_at is null;

create index if not exists idx_table_sessions_table_open
on table_sessions (table_id, opened_at desc);

alter table orders add column if not exists table_session_id uuid references table_sessions(id) on delete set null;
create index if not exists idx_orders_table_session_created on orders(table_session_id, created_at desc);
create index if not exists idx_order_items_order_id on order_items(order_id);

insert into table_sessions (table_id)
select restaurant_tables.id
from restaurant_tables
where not exists (
  select 1
  from table_sessions
  where table_sessions.table_id = restaurant_tables.id
    and table_sessions.closed_at is null
);

update orders
set table_session_id = table_sessions.id
from table_sessions
where orders.table_id = table_sessions.table_id
  and orders.table_session_id is null
  and table_sessions.closed_at is null;

alter table table_sessions enable row level security;

drop policy if exists "admin table sessions" on table_sessions;
create policy "admin table sessions"
on table_sessions
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "public insert orders" on orders;
drop policy if exists "public read orders demo" on orders;
drop policy if exists "admin read orders" on orders;
create policy "admin read orders"
on orders for select
using (auth.role() = 'authenticated');

drop policy if exists "admin insert orders" on orders;
create policy "admin insert orders"
on orders for insert
with check (auth.role() = 'authenticated');

drop policy if exists "admin update orders" on orders;
create policy "admin update orders"
on orders for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "public insert order items" on order_items;
drop policy if exists "public read order items demo" on order_items;
drop policy if exists "admin order items" on order_items;
create policy "admin order items"
on order_items
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create or replace function public.order_with_items_json(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', orders.id,
    'restaurantId', orders.restaurant_id,
    'tableId', orders.table_id,
    'tableSessionId', orders.table_session_id,
    'tableName', orders.table_name,
    'status', orders.status,
    'subtotalCents', orders.subtotal_cents,
    'serviceCents', orders.service_cents,
    'taxCents', orders.tax_cents,
    'discountCents', orders.discount_cents,
    'totalCents', orders.total_cents,
    'createdAt', orders.created_at,
    'paidAt', orders.paid_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', order_items.id,
            'orderId', order_items.order_id,
            'menuItemId', order_items.menu_item_id,
            'name', order_items.name,
            'quantity', order_items.quantity,
            'note', order_items.note,
            'unitPriceCents', order_items.unit_price_cents,
            'lineTotalCents', order_items.line_total_cents,
            'selectedOptions', order_items.selected_options,
            'priceSnapshot', order_items.price_snapshot
          )
          order by order_items.created_at
        )
        from order_items
        where order_items.order_id = orders.id
      ),
      '[]'::jsonb
    )
  )
  from orders
  where orders.id = p_order_id;
$$;

create or replace function public.get_customer_state(p_table_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  selected_table restaurant_tables%rowtype;
  selected_restaurant restaurants%rowtype;
  selected_session table_sessions%rowtype;
begin
  select *
  into selected_table
  from restaurant_tables
  where token = p_table_token;

  if selected_table.id is null then
    return null;
  end if;

  select *
  into selected_restaurant
  from restaurants
  where id = selected_table.restaurant_id;

  select *
  into selected_session
  from table_sessions
  where table_id = selected_table.id
    and closed_at is null
  order by opened_at desc
  limit 1;

  if selected_session.id is null then
    insert into table_sessions (table_id)
    values (selected_table.id)
    returning * into selected_session;
  end if;

  return jsonb_build_object(
    'restaurant', jsonb_build_object(
      'id', selected_restaurant.id,
      'name', selected_restaurant.name,
      'slug', selected_restaurant.slug,
      'serviceRate', selected_restaurant.service_rate,
      'taxRate', selected_restaurant.tax_rate
    ),
    'tables', jsonb_build_array(jsonb_build_object(
      'id', selected_table.id,
      'restaurantId', selected_table.restaurant_id,
      'name', selected_table.name,
      'token', selected_table.token
    )),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', menu_categories.id,
          'restaurantId', menu_categories.restaurant_id,
          'name', menu_categories.name,
          'sortOrder', menu_categories.sort_order
        )
        order by menu_categories.sort_order
      )
      from menu_categories
      where menu_categories.restaurant_id = selected_restaurant.id
    ), '[]'::jsonb),
    'menuItems', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', menu_items.id,
          'restaurantId', menu_items.restaurant_id,
          'categoryId', menu_items.category_id,
          'name', menu_items.name,
          'description', menu_items.description,
          'priceCents', menu_items.price_cents,
          'imageUrl', menu_items.image_url,
          'isAvailable', menu_items.is_available,
          'sortOrder', menu_items.sort_order,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', menu_item_options.id,
                'menuItemId', menu_item_options.menu_item_id,
                'name', menu_item_options.name,
                'priceDeltaCents', menu_item_options.price_delta_cents
              )
              order by menu_item_options.created_at
            )
            from menu_item_options
            where menu_item_options.menu_item_id = menu_items.id
          ), '[]'::jsonb)
        )
        order by menu_items.sort_order, menu_items.name
      )
      from menu_items
      where menu_items.restaurant_id = selected_restaurant.id
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(public.order_with_items_json(orders.id) order by orders.created_at desc)
      from orders
      where orders.table_session_id = selected_session.id
    ), '[]'::jsonb),
    'payments', '[]'::jsonb
  );
end;
$$;

create or replace function public.submit_customer_order(p_table_token text, p_cart jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  selected_table restaurant_tables%rowtype;
  selected_restaurant restaurants%rowtype;
  selected_session table_sessions%rowtype;
  new_order_id uuid := gen_random_uuid();
  cart_line jsonb;
  selected_item menu_items%rowtype;
  option_ids text[];
  selected_options jsonb;
  option_total integer;
  matched_option_count integer;
  quantity integer;
  note text;
  unit_price integer;
  line_total integer;
  subtotal integer := 0;
  service_amount integer := 0;
  tax_amount integer := 0;
  total_amount integer := 0;
begin
  if p_cart is null or jsonb_typeof(p_cart) <> 'array' or jsonb_array_length(p_cart) = 0 then
    raise exception 'Cart is empty.';
  end if;

  select *
  into selected_table
  from restaurant_tables
  where token = p_table_token;

  if selected_table.id is null then
    raise exception 'Invalid table token.';
  end if;

  select *
  into selected_restaurant
  from restaurants
  where id = selected_table.restaurant_id;

  select *
  into selected_session
  from table_sessions
  where table_id = selected_table.id
    and closed_at is null
  order by opened_at desc
  limit 1;

  if selected_session.id is null then
    insert into table_sessions (table_id)
    values (selected_table.id)
    returning * into selected_session;
  end if;

  insert into orders (
    id,
    restaurant_id,
    table_id,
    table_session_id,
    table_name,
    status,
    subtotal_cents,
    service_cents,
    tax_cents,
    discount_cents,
    total_cents
  )
  values (
    new_order_id,
    selected_restaurant.id,
    selected_table.id,
    selected_session.id,
    selected_table.name,
    'new',
    0,
    0,
    0,
    0,
    0
  );

  for cart_line in select * from jsonb_array_elements(p_cart)
  loop
    quantity := greatest(1, least(99, coalesce((cart_line->>'quantity')::integer, 1)));
    note := nullif(left(coalesce(cart_line->>'note', ''), 300), '');
    if jsonb_typeof(coalesce(cart_line->'optionIds', '[]'::jsonb)) <> 'array' then
      raise exception 'Item options must be an array.';
    end if;

    option_ids := array(
      select jsonb_array_elements_text(coalesce(cart_line->'optionIds', '[]'::jsonb))
    );

    select *
    into selected_item
    from menu_items
    where id = (cart_line->>'menuItemId')::uuid
      and restaurant_id = selected_restaurant.id
      and is_available = true;

    if selected_item.id is null then
      raise exception 'One or more items are no longer available.';
    end if;

    if cardinality(option_ids) > 0 then
      select count(*)
      into matched_option_count
      from menu_item_options
      where menu_item_options.menu_item_id = selected_item.id
        and menu_item_options.id::text = any(option_ids);

      if matched_option_count <> cardinality(option_ids) then
        raise exception 'One or more item options are invalid.';
      end if;
    end if;

    select
      coalesce(sum(menu_item_options.price_delta_cents), 0),
      coalesce(jsonb_agg(
        jsonb_build_object(
          'id', menu_item_options.id,
          'menuItemId', menu_item_options.menu_item_id,
          'name', menu_item_options.name,
          'priceDeltaCents', menu_item_options.price_delta_cents
        )
      ), '[]'::jsonb)
    into option_total, selected_options
    from menu_item_options
    where menu_item_options.menu_item_id = selected_item.id
      and menu_item_options.id::text = any(option_ids);

    unit_price := selected_item.price_cents + option_total;
    line_total := unit_price * quantity;
    subtotal := subtotal + line_total;

    insert into order_items (
      id,
      order_id,
      menu_item_id,
      name,
      quantity,
      note,
      unit_price_cents,
      line_total_cents,
      selected_options,
      price_snapshot
    )
    values (
      gen_random_uuid(),
      new_order_id,
      selected_item.id,
      selected_item.name,
      quantity,
      note,
      unit_price,
      line_total,
      selected_options,
      jsonb_build_object(
        'basePriceCents', selected_item.price_cents,
        'selectedOptions', selected_options
      )
    );
  end loop;

  service_amount := round(subtotal * selected_restaurant.service_rate);
  tax_amount := round((subtotal + service_amount) * selected_restaurant.tax_rate);
  total_amount := subtotal + service_amount + tax_amount;

  update orders
  set
    subtotal_cents = subtotal,
    service_cents = service_amount,
    tax_cents = tax_amount,
    total_cents = total_amount
  where id = new_order_id;

  return public.order_with_items_json(new_order_id);
end;
$$;

grant execute on function public.get_customer_state(text) to anon, authenticated;
grant execute on function public.submit_customer_order(text, jsonb) to anon, authenticated;
