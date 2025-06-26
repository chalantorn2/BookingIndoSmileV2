create table public.information (
  id bigserial not null,
  category character varying(100) not null,
  value text not null,
  description text null,
  phone character varying(50) null,
  active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint information_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_information_category on public.information using btree (category) TABLESPACE pg_default;

create index IF not exists idx_information_active on public.information using btree (active) TABLESPACE pg_default;

create trigger update_information_updated_at BEFORE
update on information for EACH row
execute FUNCTION update_updated_at_column ();

create table public.invoices (
  id bigserial not null,
  invoice_name character varying(255) null,
  invoice_date date null,
  payment_ids jsonb null,
  total_amount numeric(10, 2) null default 0,
  total_cost numeric(10, 2) null default 0,
  total_selling_price numeric(10, 2) null default 0,
  total_profit numeric(10, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint invoices_pkey primary key (id)
) TABLESPACE pg_default;

create trigger update_invoices_updated_at BEFORE
update on invoices for EACH row
execute FUNCTION update_updated_at_column ();

create table public.orders (
  id bigserial not null,
  reference_id character varying(255) null,
  first_name character varying(255) null,
  last_name character varying(255) null,
  agent_name character varying(255) null,
  agent_id bigint null,
  pax character varying(50) null,
  pax_adt integer null default 0,
  pax_chd integer null default 0,
  pax_inf integer null default 0,
  start_date date null,
  end_date date null,
  note text null,
  completed boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint orders_pkey primary key (id),
  constraint orders_reference_id_key unique (reference_id),
  constraint orders_agent_id_fkey foreign KEY (agent_id) references information (id)
) TABLESPACE pg_default;

create index IF not exists idx_orders_reference_id on public.orders using btree (reference_id) TABLESPACE pg_default;

create index IF not exists idx_orders_created_at on public.orders using btree (created_at) TABLESPACE pg_default;

create trigger update_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();

create table public.payments (
  id bigserial not null,
  payment_id character varying(255) null,
  order_id bigint null,
  first_name character varying(255) null,
  last_name character varying(255) null,
  agent_name character varying(255) null,
  pax character varying(50) null,
  bookings jsonb null,
  total_cost numeric(10, 2) null default 0,
  total_selling_price numeric(10, 2) null default 0,
  total_profit numeric(10, 2) null default 0,
  invoiced boolean null default false,
  ref character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_payment_id_key unique (payment_id),
  constraint payments_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_payments_order_id on public.payments using btree (order_id) TABLESPACE pg_default;

create trigger update_payments_updated_at BEFORE
update on payments for EACH row
execute FUNCTION update_updated_at_column ();

create table public.sequences (
  id bigserial not null,
  key character varying(255) not null,
  value integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint sequences_pkey primary key (id),
  constraint sequences_key_key unique (key)
) TABLESPACE pg_default;

create trigger update_sequences_updated_at BEFORE
update on sequences for EACH row
execute FUNCTION update_updated_at_column ();

create table public.tour_bookings (
  id bigserial not null,
  order_id bigint null,
  reference_id character varying(255) null,
  tour_date date not null,
  tour_pickup_time character varying null,
  tour_type character varying(255) null,
  tour_detail text null,
  tour_hotel character varying(255) null,
  tour_room_no character varying(100) null,
  tour_contact_no character varying(50) null,
  send_to character varying(255) null,
  pax integer null default 0,
  pax_adt integer null default 0,
  pax_chd integer null default 0,
  pax_inf integer null default 0,
  cost_price numeric(10, 2) null default 0,
  selling_price numeric(10, 2) null default 0,
  payment_status character varying(50) null default 'not_paid'::character varying,
  payment_date date null,
  payment_note text null,
  voucher_created boolean null default false,
  status character varying(50) null default 'pending'::character varying,
  note text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint tour_bookings_pkey primary key (id),
  constraint tour_bookings_reference_id_key unique (reference_id),
  constraint tour_bookings_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint tour_bookings_payment_status_check check (
    (
      (payment_status)::text = any (
        (
          array[
            'paid'::character varying,
            'not_paid'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint tour_bookings_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'booked'::character varying,
            'in_progress'::character varying,
            'completed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tour_bookings_order_id on public.tour_bookings using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_tour_bookings_tour_date on public.tour_bookings using btree (tour_date) TABLESPACE pg_default;

create trigger update_tour_bookings_updated_at BEFORE
update on tour_bookings for EACH row
execute FUNCTION update_updated_at_column ();

create table public.transfer_bookings (
  id bigserial not null,
  order_id bigint null,
  reference_id character varying(255) null,
  transfer_date date not null,
  transfer_time character varying null,
  transfer_type character varying(255) null,
  transfer_detail text null,
  pickup_location character varying(255) null,
  drop_location character varying(255) null,
  transfer_flight character varying(100) null,
  transfer_ftime character varying null,
  send_to character varying(255) null,
  car_model character varying(255) null,
  phone_number character varying(50) null,
  pax integer null default 0,
  pax_adt integer null default 0,
  pax_chd integer null default 0,
  pax_inf integer null default 0,
  cost_price numeric(10, 2) null default 0,
  selling_price numeric(10, 2) null default 0,
  payment_status character varying(50) null default 'not_paid'::character varying,
  payment_date date null,
  payment_note text null,
  voucher_created boolean null default false,
  status character varying(50) null default 'pending'::character varying,
  note text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint transfer_bookings_pkey primary key (id),
  constraint transfer_bookings_reference_id_key unique (reference_id),
  constraint transfer_bookings_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint transfer_bookings_payment_status_check check (
    (
      (payment_status)::text = any (
        (
          array[
            'paid'::character varying,
            'not_paid'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint transfer_bookings_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'booked'::character varying,
            'in_progress'::character varying,
            'completed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_transfer_bookings_order_id on public.transfer_bookings using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_transfer_bookings_transfer_date on public.transfer_bookings using btree (transfer_date) TABLESPACE pg_default;

create trigger update_transfer_bookings_updated_at BEFORE
update on transfer_bookings for EACH row
execute FUNCTION update_updated_at_column ();

create table public.users (
  id bigserial not null,
  username character varying(255) not null,
  password_hash text not null,
  fullname character varying(255) null,
  role character varying(50) null default 'user'::character varying,
  active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_username_key unique (username),
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'user'::character varying,
            'admin'::character varying,
            'dev'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();

create table public.vouchers (
  id bigserial not null,
  year_number character varying(10) null,
  sequence_number character varying(10) null,
  booking_id bigint null,
  booking_type character varying(50) null,
  customer_name character varying(255) null,
  contact_person character varying(255) null,
  customer_signature text null,
  accommodation text null,
  accommodation_at character varying(255) null,
  accommodation_pax integer null,
  accommodation_check_in date null,
  accommodation_check_out date null,
  accommodation_room character varying(100) null,
  accommodation_night integer null,
  accommodation_price numeric(10, 2) null,
  transfer text null,
  transfer_from character varying(255) null,
  transfer_to character varying(255) null,
  transfer_by character varying(255) null,
  transfer_pax integer null,
  transfer_date date null,
  transfer_time time without time zone null,
  transfer_price numeric(10, 2) null,
  transfer_pickup_time time without time zone null,
  transfer_type character varying(255) null,
  transfer_detail text null,
  transfer_license_plate character varying(100) null,
  transfer_flight character varying(100) null,
  transfer_ftime time without time zone null,
  tour text null,
  tour_name character varying(255) null,
  tour_pax integer null,
  tour_by character varying(255) null,
  tour_date date null,
  tour_price numeric(10, 2) null,
  tour_pickup_at character varying(255) null,
  tour_detail text null,
  tour_pickup_time time without time zone null,
  payment_option character varying(255) null,
  payment_amount numeric(10, 2) null,
  remark text null,
  issue_by character varying(255) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint vouchers_pkey primary key (id),
  constraint vouchers_booking_type_check check (
    (
      (booking_type)::text = any (
        (
          array[
            'tour'::character varying,
            'transfer'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_vouchers_booking on public.vouchers using btree (booking_id, booking_type) TABLESPACE pg_default;

create trigger update_vouchers_updated_at BEFORE
update on vouchers for EACH row
execute FUNCTION update_updated_at_column ();