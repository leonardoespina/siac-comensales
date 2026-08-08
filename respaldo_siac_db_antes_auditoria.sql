--
-- PostgreSQL database dump
--

\restrict FjahNCIhiffxfNQtafAru53II8oSA2oGlGeyf6HGCG5p7ov4NyTEaEurlNfpBj4

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: TransactionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CONFIRMED'
);


ALTER TYPE public."TransactionStatus" OWNER TO postgres;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TransactionType" AS ENUM (
    'RECEPTION',
    'TRANSFER',
    'ADJUSTMENT',
    'CONSUMPTION',
    'LOSS',
    'SUPPORT'
);


ALTER TYPE public."TransactionType" OWNER TO postgres;

--
-- Name: WarehouseType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WarehouseType" AS ENUM (
    'CENTRAL',
    'LOCAL'
);


ALTER TYPE public."WarehouseType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id integer,
    details text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: biometric_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.biometric_records (
    id integer NOT NULL,
    diner_id integer NOT NULL,
    templates text[],
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.biometric_records OWNER TO postgres;

--
-- Name: biometric_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.biometric_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.biometric_records_id_seq OWNER TO postgres;

--
-- Name: biometric_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.biometric_records_id_seq OWNED BY public.biometric_records.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: dependencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dependencies (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.dependencies OWNER TO postgres;

--
-- Name: dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dependencies_id_seq OWNER TO postgres;

--
-- Name: dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dependencies_id_seq OWNED BY public.dependencies.id;


--
-- Name: diner_request_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diner_request_details (
    id integer NOT NULL,
    request_id integer NOT NULL,
    diner_id integer NOT NULL,
    ration_type text DEFAULT 'NORMAL'::text NOT NULL
);


ALTER TABLE public.diner_request_details OWNER TO postgres;

--
-- Name: diner_request_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diner_request_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diner_request_details_id_seq OWNER TO postgres;

--
-- Name: diner_request_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diner_request_details_id_seq OWNED BY public.diner_request_details.id;


--
-- Name: diner_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diner_requests (
    id integer NOT NULL,
    date date NOT NULL,
    shift_type text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_by_id integer NOT NULL,
    approved_by_id integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    dining_room_id integer
);


ALTER TABLE public.diner_requests OWNER TO postgres;

--
-- Name: diner_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diner_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diner_requests_id_seq OWNER TO postgres;

--
-- Name: diner_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diner_requests_id_seq OWNED BY public.diner_requests.id;


--
-- Name: diners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diners (
    id integer NOT NULL,
    cedula text NOT NULL,
    name text NOT NULL,
    ration_type text DEFAULT 'NORMAL'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    squad_id integer NOT NULL,
    fingerprint text,
    qr_code text,
    subdependency_id integer NOT NULL,
    position_id integer,
    dining_room_id integer
);


ALTER TABLE public.diners OWNER TO postgres;

--
-- Name: diners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diners_id_seq OWNER TO postgres;

--
-- Name: diners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diners_id_seq OWNED BY public.diners.id;


--
-- Name: dining_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dining_rooms (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    warehouse_id integer
);


ALTER TABLE public.dining_rooms OWNER TO postgres;

--
-- Name: dining_rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dining_rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dining_rooms_id_seq OWNER TO postgres;

--
-- Name: dining_rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dining_rooms_id_seq OWNED BY public.dining_rooms.id;


--
-- Name: institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.institutions (
    id integer NOT NULL,
    name text NOT NULL,
    type text,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.institutions OWNER TO postgres;

--
-- Name: institutions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.institutions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.institutions_id_seq OWNER TO postgres;

--
-- Name: institutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.institutions_id_seq OWNED BY public.institutions.id;


--
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules (
    id integer NOT NULL,
    name text NOT NULL,
    code text NOT NULL
);


ALTER TABLE public.modules OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.modules_id_seq OWNER TO postgres;

--
-- Name: modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.modules_id_seq OWNED BY public.modules.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    link text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.positions OWNER TO postgres;

--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.positions_id_seq OWNER TO postgres;

--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category_id integer NOT NULL,
    unit_id integer NOT NULL,
    minimum_stock numeric(10,2) DEFAULT 0 NOT NULL,
    maximum_stock numeric(10,2),
    is_perishable boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    reference_price numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    module_id integer NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_read boolean DEFAULT false NOT NULL,
    can_update boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO postgres;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    user_id integer NOT NULL,
    start_time timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp(3) without time zone,
    status text DEFAULT 'OPEN'::text NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    shift_type text DEFAULT 'DIURNO'::text NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_id_seq OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: squads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.squads (
    id integer NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.squads OWNER TO postgres;

--
-- Name: squads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.squads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.squads_id_seq OWNER TO postgres;

--
-- Name: squads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.squads_id_seq OWNED BY public.squads.id;


--
-- Name: stocks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocks (
    id integer NOT NULL,
    warehouse_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stocks OWNER TO postgres;

--
-- Name: stocks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stocks_id_seq OWNER TO postgres;

--
-- Name: stocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stocks_id_seq OWNED BY public.stocks.id;


--
-- Name: subdependencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subdependencies (
    id integer NOT NULL,
    name text NOT NULL,
    dependency_id integer NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.subdependencies OWNER TO postgres;

--
-- Name: subdependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subdependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subdependencies_id_seq OWNER TO postgres;

--
-- Name: subdependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subdependencies_id_seq OWNED BY public.subdependencies.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    document text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: transaction_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_details (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    expiration_date date,
    discrepancy_reason character varying(255),
    expected_quantity numeric(10,2)
);


ALTER TABLE public.transaction_details OWNER TO postgres;

--
-- Name: transaction_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_details_id_seq OWNER TO postgres;

--
-- Name: transaction_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_details_id_seq OWNED BY public.transaction_details.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    type public."TransactionType" NOT NULL,
    status public."TransactionStatus" DEFAULT 'DRAFT'::public."TransactionStatus" NOT NULL,
    source_id integer,
    destination_id integer,
    supplier_id integer,
    created_by_id integer NOT NULL,
    approved_by_id integer,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    shift_id integer,
    institution_id integer,
    reference_number text
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name text NOT NULL,
    abbreviation text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.units_id_seq OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    password_hash text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    cedula text NOT NULL,
    warehouse_id integer,
    subdependency_id integer,
    dependency_id integer,
    dining_room_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    name text NOT NULL,
    type public."WarehouseType" DEFAULT 'LOCAL'::public."WarehouseType" NOT NULL,
    location text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouses_id_seq OWNER TO postgres;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: biometric_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_records ALTER COLUMN id SET DEFAULT nextval('public.biometric_records_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: dependencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependencies ALTER COLUMN id SET DEFAULT nextval('public.dependencies_id_seq'::regclass);


--
-- Name: diner_request_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_request_details ALTER COLUMN id SET DEFAULT nextval('public.diner_request_details_id_seq'::regclass);


--
-- Name: diner_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_requests ALTER COLUMN id SET DEFAULT nextval('public.diner_requests_id_seq'::regclass);


--
-- Name: diners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diners ALTER COLUMN id SET DEFAULT nextval('public.diners_id_seq'::regclass);


--
-- Name: dining_rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dining_rooms ALTER COLUMN id SET DEFAULT nextval('public.dining_rooms_id_seq'::regclass);


--
-- Name: institutions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions ALTER COLUMN id SET DEFAULT nextval('public.institutions_id_seq'::regclass);


--
-- Name: modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules ALTER COLUMN id SET DEFAULT nextval('public.modules_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: positions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: squads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.squads ALTER COLUMN id SET DEFAULT nextval('public.squads_id_seq'::regclass);


--
-- Name: stocks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocks ALTER COLUMN id SET DEFAULT nextval('public.stocks_id_seq'::regclass);


--
-- Name: subdependencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subdependencies ALTER COLUMN id SET DEFAULT nextval('public.subdependencies_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: transaction_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_details ALTER COLUMN id SET DEFAULT nextval('public.transaction_details_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, entity, entity_id, details, created_at) FROM stdin;
426	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 13:16:33.544
427	1	CREATE	USER	17	Usuario creado: 18073921	2026-06-29 13:30:37.712
428	1	CREATE	USER	18	Usuario creado: 17073921	2026-06-29 13:31:32.168
429	1	CREATE	USER	19	Usuario creado: 16073921	2026-06-29 13:46:54.195
430	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 13:50:28.071
431	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 13:51:38.08
432	18	CREATE	TRANSACTION	46	Importación Excel de 57 filas.	2026-06-29 13:52:23.084
433	18	UPDATE_STATUS	TRANSACTION	46	Recepción cambió a estado: PENDING	2026-06-29 13:52:34.632
434	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 13:52:53.53
435	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 13:53:16.288
436	1	UPDATE	ROLE	2	Rol actualizado: GERENTES COMERDOR	2026-06-29 13:53:48.387
437	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 13:53:59.309
438	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 13:54:33.092
439	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 13:54:43.409
440	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 14:00:18.52
441	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 14:00:29.297
442	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 14:00:40.536
443	1	UPDATE_STATUS	TRANSACTION	46	Recepción cambió a estado: APPROVED	2026-06-29 14:00:50.898
444	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 14:01:30.226
445	18	UPDATE_STATUS	TRANSACTION	46	Recepción cambió a estado: CONFIRMED	2026-06-29 14:02:14.389
446	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 14:02:48.098
447	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 14:06:15.756
448	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 14:40:57.403
449	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 14:41:18.842
450	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 14:42:00.029
451	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 14:42:18.903
452	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 14:47:05.522
453	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 14:47:21.232
454	1	UPDATE	USER	19	Usuario actualizado: 16073921	2026-06-29 14:51:26.302
455	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 14:51:38.83
456	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 14:59:32.833
457	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 15:12:30.779
458	1	UPDATE	ROLE	3	Rol actualizado: SUPERVISOR COMEDOR	2026-06-29 15:13:28.936
459	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 15:25:50.35
460	1	UPDATE	ROLE	3	Rol actualizado: SUPERVISOR COMEDOR	2026-06-29 15:26:13.003
461	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 15:27:07.404
462	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 15:27:18.017
463	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 15:28:15.878
464	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 15:46:21.929
465	1	UPDATE	ROLE	3	Rol actualizado: SUPERVISOR COMEDOR	2026-06-29 15:50:46.744
466	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 15:53:57.211
467	17	LOGIN	AUTH	17	Inicio de sesión desde la web	2026-06-29 15:55:20.191
468	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 15:55:34.435
469	18	LOGIN	AUTH	18	Inicio de sesión desde la web	2026-06-29 15:56:54.73
470	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 15:57:07.091
471	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 16:00:33.634
472	1	UPDATE	ROLE	3	Rol actualizado: SUPERVISOR COMEDOR	2026-06-29 16:00:51.922
473	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 16:10:37.742
474	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 18:58:15.614
475	19	LOGIN	AUTH	19	Inicio de sesión desde la web	2026-06-29 19:00:39.66
476	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 19:00:52.232
477	1	CREATE	ROLE	5	Rol creado: GERENTE COMENSALES	2026-06-29 19:02:47.88
478	1	CREATE	USER	20	Usuario creado: 15073921	2026-06-29 20:17:03.797
479	20	LOGIN	AUTH	20	Inicio de sesión desde la web	2026-06-29 20:17:36.442
480	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 20:19:33.57
481	1	UPDATE	ROLE	5	Rol actualizado: GERENTE COMENSALES	2026-06-29 20:29:50.159
482	20	LOGIN	AUTH	20	Inicio de sesión desde la web	2026-06-29 20:30:16.581
483	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 20:30:47.144
484	1	UPDATE	ROLE	5	Rol actualizado: GERENTE COMENSALES	2026-06-29 20:31:39.366
485	1	UPDATE	ROLE	5	Rol actualizado: GERENTE COMENSALES	2026-06-29 20:35:25.216
486	20	LOGIN	AUTH	20	Inicio de sesión desde la web	2026-06-29 20:35:36.416
487	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 20:37:25.496
488	1	UPDATE	ROLE	5	Rol actualizado: GERENTE COMENSALES	2026-06-29 20:40:15.828
489	20	LOGIN	AUTH	20	Inicio de sesión desde la web	2026-06-29 20:42:37.528
490	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 21:13:28.468
491	20	LOGIN	AUTH	20	Inicio de sesión desde la web	2026-06-29 21:23:15.525
492	1	LOGIN	AUTH	1	Inicio de sesión desde la web	2026-06-29 21:24:03.173
493	1	UPDATE	ROLE	5	Rol actualizado: GERENTE COMENSALES	2026-06-29 21:24:51.164
494	20	LOGIN	AUTH	20	Inicio de sesión desde la web	2026-06-29 21:27:04.767
\.


--
-- Data for Name: biometric_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.biometric_records (id, diner_id, templates, active, created_at, updated_at) FROM stdin;
17	1008	{"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\nAAAAAAAAAAAAAAAA="}	t	2026-06-28 13:18:25.205	2026-06-28 13:18:25.205
22	1006	{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}	t	2026-06-28 15:05:01.627	2026-06-28 15:05:01.627
23	1005	{"APjqAMgq43NcwEE3CatxMOMUVZJSuwCOQkkAjDn4PZnbFtX8XFzFPqqkQ0ab3rHDyrWHiky8\nod04EqCMyAZc8/ew2v9bpeVqJQNZuftCCW4+P/nrh9U6Mw6vVcLX9qVLeXUSAP0+rDWndwTI\n7qCvxqMxdw1VXj0NaFx/cjfyJInKmVMU1M4vclX05Ex7Fhw60eZ77Ki41F0rtbTVkpl6BdK8\n7rTXWj+pRawAasOOcz27Sqn9OPPvvfHHiqadNUzlJ2uIwAccFCooHKnEZqk5bcpX0S28d5jA\n+mCNYW9fhqrtJUNsPUZn2GA90geIb28A+OkAyCrjc1zAQTcJq3FwxhRVkgB6N4HODSJ0ZcTc\nzvq3zWSNZdZNqmVwL0BvDRB2wSMPLioO6UkwjAWm7aC/Cmkf/Aql3u2OurnqOiNDWDDZEnBL\n6g2dolKEcGDEIlhB+JIgWsh6hoZfdGMCuAePO6MqjV10hyFSPiObFD16LZ4AVoLz03UDU4gu\nUepNwAvyqEhEL9mkBH6EwdwC0eAGHclyyju86pAS+mlKwjFO8uJbdi1PEt6MYzrYGS0posPS\neYyHBqGLmObdgEVVvH2K5zfjYNrvE8Ut7K7taV6cZsCt8lK3AMKTOPa0ZulvAPj8AMgq43Nc\nwEE3CatxsOcUVZJdYIhMwZKDRFcDC3skzNZLA1dRdzT3DAdMYLWRWwSBQcHpJxzP/8NGRv8t\n8SQet0jHmi7B1Z2Sufhu1/2vCqNltJKohLRv9EkYtUN5KcXb0bYgfRlUBD35pQu9PJkWwjaj\nDLfzM4N4g4WkgTOh4b32j8GEOUZjUE4KNzkLaH7rhWpATCb/KQ72nd5N2eVrE0zPz5PG4GYY\n4ZEAJGSkymM5/yC+Anc9vYIpJTinFLqtU11ng/K//T/Kh1Zjr0H343z2++pCMfLG54BE/JD0\n82Cel9wEbFw5Y7jFZt3mk+R3EGrMpGY4B67gsP73Ym8A6NcAyCrjc1zAQTcJq3Fw1xRVkjyh\nNXm7VfH333T3zze560kHp6FzxNGJiuafggb3fKdVYRriuM4cWLEz0cioKDp/PfvL5xfWqFwQ\nwrxvpkz3+EEXCWm2O4Qy0s3gCfM4e9NNLZKEeA6kYeWaIEndNbqeceFtLeawtDtZlzGcMB02\nu49i+KVAggx0PgYsgPwo1ug2euFvT874OVpBEFawt5rnD7pYfQdXUPGEaV+/4dE0lFSvOOpq\n3UBr7dSKNKtRH8FwwC7T70cFm/7kX1eJQ7WFdxMVXpLqg+dvAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAA\n=",APj8AMgq43NcwEE3Catx8NkUVZI/S5TbdSUhn8KPyU0X07BOwYJLOdB90/956MZ+marKPOhC5fGC+I6Bkc/mcCvvWLtp84JD7cSjp6TRHAtJa+mV2JkA+k524KMdhHzUj+0P27eZei8QNKHnTyngsC+oAI/HvwWPcCYu1GTms4d08QDiFAiCN2duxjz10joeaNRqIhqCw2QvqD0v5nQTd/lwcM1HHrkAaNZhgB1f2EFnBSq/HKFYH+L8QhnoV7hzU0JaY5zR3hhR/19SboCkR/YXGXxWe4PHkdofUZVMxjdlYtrv3VusEj4JMYyPm0CZC2VV0NEN7zDPYEJQm6KUMW8A+OgAyCrjc1zAQTcJq3Hw2RRVkjhL79v0Oz7vJ0strkvC/Blw45rF46S+UvinKkfVRs3BXwOrdX2N3k2R8OuxnU1BXrHmbHgbZHqmYktcKXTe6NlG8ebsrxk+4EzUPkTCP8pF9MJW29SGwireIwkdbdnhPDda6BFtXQQ0OuXBLIdmbtfPH7UcMvzMUnO7taN1ZSzD1zJn9IjWg9MlZ7J6PhE5KfIbJiqvZ9cAt3rSV6yXbdowXVCResB6sntiRuKRibb8XebDAaLgHlEklD+SXsXlslufCi5eF7MbQxi3UQL8mgnHCcWV41Mg328A+PsAyCrjc1zAQTcJq3HwxxRVkhnq5CowlUw7DByvgpizYBdtdX7zppY/0K5tFvyntDqEEuYLE6Wdi0tCWb82QnTzABDG9CTFVer6DBB2FjqCdrtNH2Sk+RFB5/xZLi6bi2zYPxpETGpLC5XsBfhjgpgDSetRxxjLjK8m6EFc2H+f/sw+joLIOEr9mP35ObqYPYX2nFIudD8KTnuhJwbDiGLj2gUv0sBFkHIfGGULBLcID2oSmEQxCCnk4QOBR4dPGzkqLJHbafQr7wmiuZ3YjLYd78hiptFowAsP5RjJVg9K9TS/cj0GwUPiC9E8YbZYaKf737GbV1gLe9U/intvAOj1AMgq43NcwEE3CatxcN8UVZLmOwXtKbPCt4DJSbrO0qx1Zl4Pp3jTwyk27RMBVJkiC1dRzaUah84zMR/RIpIU0bvOvR5/ASjAAIujQYKpYICkLd3sQNUaI9pBdMInQBsisCBKWL7COV4sxUNwy23U3j9NGZ/MsTxwvSOPK4T7WFccgXVfJktMyfU1R+mUaSzituGZAG0SLxJrYO8SmC7hbMDF1agqlxwbpM4tK0FmiJneHJVVPAZ/yQBIArAn9/pKS/B+pxlG9Cn6TzpWX3tbf7iAfKa4lQ2HQ2Y5J9TR4GVS/aKHVkMuxGye1eF1tyA4RUStWYoKbwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=}	t	2026-06-28 15:05:26.284	2026-06-28 15:28:59.388
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, description, active, created_at, updated_at) FROM stdin;
47	ACEITES Y MANTECAS	\N	t	2026-06-29 13:52:22.888	2026-06-29 13:52:22.888
48	CONDIMENTOS Y SALSAS	\N	t	2026-06-29 13:52:22.918	2026-06-29 13:52:22.918
49	VÍVERES GENERALES	\N	t	2026-06-29 13:52:22.924	2026-06-29 13:52:22.924
50	GRANOS Y CEREALES	\N	t	2026-06-29 13:52:22.928	2026-06-29 13:52:22.928
51	GRANOS SECOS	\N	t	2026-06-29 13:52:22.939	2026-06-29 13:52:22.939
52	LÁCTEOS	\N	t	2026-06-29 13:52:22.964	2026-06-29 13:52:22.964
53	BEBIDAS	\N	t	2026-06-29 13:52:22.994	2026-06-29 13:52:22.994
\.


--
-- Data for Name: dependencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dependencies (id, name, active) FROM stdin;
2	Gerencia de Operaciones	t
3	GERENCIA DE TECNOLOGIA DE LA INFORMACION	t
1	Gerencia General	t
\.


--
-- Data for Name: diner_request_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.diner_request_details (id, request_id, diner_id, ration_type) FROM stdin;
\.


--
-- Data for Name: diner_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.diner_requests (id, date, shift_type, status, created_by_id, approved_by_id, created_at, updated_at, dining_room_id) FROM stdin;
\.


--
-- Data for Name: diners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.diners (id, cedula, name, ration_type, active, squad_id, fingerprint, qr_code, subdependency_id, position_id, dining_room_id) FROM stdin;
3	99108145	Trabajador Prueba 1	NORMAL	t	3	\N	\N	8	\N	\N
4	99780083	Trabajador Prueba 2	NORMAL	t	3	\N	\N	7	\N	\N
5	99081011	Trabajador Prueba 3	NORMAL	t	3	\N	\N	7	\N	\N
6	99014410	Trabajador Prueba 4	NORMAL	t	1	\N	\N	8	\N	\N
7	99301468	Trabajador Prueba 5	NORMAL	t	4	\N	\N	5	\N	\N
8	99301334	Trabajador Prueba 6	NORMAL	t	1	\N	\N	8	\N	\N
9	99417316	Trabajador Prueba 7	NORMAL	t	3	\N	\N	7	\N	\N
10	99387331	Trabajador Prueba 8	NORMAL	t	3	\N	\N	7	\N	\N
11	99855773	Trabajador Prueba 9	NORMAL	t	2	\N	\N	8	\N	\N
12	99517812	Trabajador Prueba 10	DIET	t	4	\N	\N	8	\N	\N
13	99090388	Trabajador Prueba 11	NORMAL	t	4	\N	\N	6	\N	\N
14	99997430	Trabajador Prueba 12	DIET	t	3	\N	\N	7	\N	\N
15	99628035	Trabajador Prueba 13	NORMAL	t	2	\N	\N	8	\N	\N
16	99045384	Trabajador Prueba 14	NORMAL	t	1	\N	\N	8	\N	\N
17	99039888	Trabajador Prueba 15	NORMAL	t	3	\N	\N	8	\N	\N
18	99646823	Trabajador Prueba 16	NORMAL	t	3	\N	\N	7	\N	\N
19	99150147	Trabajador Prueba 17	NORMAL	t	4	\N	\N	7	\N	\N
20	99504922	Trabajador Prueba 18	DIET	t	4	\N	\N	6	\N	\N
21	99655762	Trabajador Prueba 19	NORMAL	t	2	\N	\N	6	\N	\N
22	99697265	Trabajador Prueba 20	NORMAL	t	2	\N	\N	5	\N	\N
23	99741683	Trabajador Prueba 21	NORMAL	t	2	\N	\N	8	\N	\N
24	99009438	Trabajador Prueba 22	DIET	t	2	\N	\N	6	\N	\N
25	99324665	Trabajador Prueba 23	NORMAL	t	2	\N	\N	7	\N	\N
26	99073609	Trabajador Prueba 24	NORMAL	t	4	\N	\N	7	\N	\N
27	99553170	Trabajador Prueba 25	NORMAL	t	4	\N	\N	7	\N	\N
28	99743091	Trabajador Prueba 26	NORMAL	t	1	\N	\N	6	\N	\N
29	99932330	Trabajador Prueba 27	DIET	t	1	\N	\N	6	\N	\N
30	99059095	Trabajador Prueba 28	DIET	t	1	\N	\N	5	\N	\N
31	99685919	Trabajador Prueba 29	NORMAL	t	4	\N	\N	5	\N	\N
32	99870215	Trabajador Prueba 30	NORMAL	t	1	\N	\N	7	\N	\N
33	99721838	Trabajador Prueba 31	NORMAL	t	1	\N	\N	5	\N	\N
34	99499615	Trabajador Prueba 32	DIET	t	4	\N	\N	6	\N	\N
35	99758903	Trabajador Prueba 33	NORMAL	t	1	\N	\N	5	\N	\N
36	99363983	Trabajador Prueba 34	NORMAL	t	3	\N	\N	5	\N	\N
37	99484922	Trabajador Prueba 35	NORMAL	t	2	\N	\N	8	\N	\N
38	99981046	Trabajador Prueba 36	DIET	t	4	\N	\N	5	\N	\N
39	99219561	Trabajador Prueba 37	NORMAL	t	4	\N	\N	7	\N	\N
40	99355868	Trabajador Prueba 38	NORMAL	t	3	\N	\N	8	\N	\N
41	99331411	Trabajador Prueba 39	NORMAL	t	4	\N	\N	5	\N	\N
42	99553415	Trabajador Prueba 40	NORMAL	t	3	\N	\N	6	\N	\N
43	99718377	Trabajador Prueba 41	NORMAL	t	3	\N	\N	8	\N	\N
44	99071088	Trabajador Prueba 42	NORMAL	t	1	\N	\N	7	\N	\N
45	99482468	Trabajador Prueba 43	NORMAL	t	1	\N	\N	6	\N	\N
46	99707563	Trabajador Prueba 44	DIET	t	1	\N	\N	6	\N	\N
47	99498396	Trabajador Prueba 45	NORMAL	t	2	\N	\N	8	\N	\N
48	99357394	Trabajador Prueba 46	NORMAL	t	1	\N	\N	8	\N	\N
49	99000890	Trabajador Prueba 47	NORMAL	t	3	\N	\N	5	\N	\N
50	99907890	Trabajador Prueba 48	NORMAL	t	3	\N	\N	8	\N	\N
51	99466274	Trabajador Prueba 49	NORMAL	t	3	\N	\N	8	\N	\N
52	99967209	Trabajador Prueba 50	NORMAL	t	3	\N	\N	5	\N	\N
54	95000002	Trabajador Masivo 2	DIET	t	1	\N	\N	7	\N	\N
55	95000003	Trabajador Masivo 3	NORMAL	t	3	\N	\N	7	\N	\N
56	95000004	Trabajador Masivo 4	NORMAL	t	4	\N	\N	7	\N	\N
57	95000005	Trabajador Masivo 5	NORMAL	t	3	\N	\N	7	\N	\N
58	95000006	Trabajador Masivo 6	NORMAL	t	4	\N	\N	8	\N	\N
59	95000007	Trabajador Masivo 7	NORMAL	t	3	\N	\N	7	\N	\N
60	95000008	Trabajador Masivo 8	NORMAL	t	4	\N	\N	6	\N	\N
61	95000009	Trabajador Masivo 9	NORMAL	t	3	\N	\N	6	\N	\N
63	95000011	Trabajador Masivo 11	NORMAL	t	1	\N	\N	7	\N	\N
64	95000012	Trabajador Masivo 12	DIET	t	1	\N	\N	6	\N	\N
65	95000013	Trabajador Masivo 13	NORMAL	t	4	\N	\N	8	\N	\N
66	95000014	Trabajador Masivo 14	DIET	t	4	\N	\N	6	\N	\N
67	95000015	Trabajador Masivo 15	NORMAL	t	4	\N	\N	5	\N	\N
68	95000016	Trabajador Masivo 16	NORMAL	t	3	\N	\N	8	\N	\N
69	95000017	Trabajador Masivo 17	NORMAL	t	3	\N	\N	8	\N	\N
70	95000018	Trabajador Masivo 18	NORMAL	t	4	\N	\N	8	\N	\N
71	95000019	Trabajador Masivo 19	NORMAL	t	4	\N	\N	7	\N	\N
72	95000020	Trabajador Masivo 20	NORMAL	t	1	\N	\N	5	\N	\N
73	95000021	Trabajador Masivo 21	DIET	t	4	\N	\N	8	\N	\N
74	95000022	Trabajador Masivo 22	NORMAL	t	2	\N	\N	8	\N	\N
75	95000023	Trabajador Masivo 23	DIET	t	1	\N	\N	6	\N	\N
76	95000024	Trabajador Masivo 24	NORMAL	t	4	\N	\N	5	\N	\N
77	95000025	Trabajador Masivo 25	NORMAL	t	3	\N	\N	7	\N	\N
78	95000026	Trabajador Masivo 26	DIET	t	4	\N	\N	5	\N	\N
79	95000027	Trabajador Masivo 27	NORMAL	t	2	\N	\N	6	\N	\N
80	95000028	Trabajador Masivo 28	NORMAL	t	4	\N	\N	7	\N	\N
81	95000029	Trabajador Masivo 29	NORMAL	t	1	\N	\N	7	\N	\N
82	95000030	Trabajador Masivo 30	NORMAL	t	4	\N	\N	6	\N	\N
83	95000031	Trabajador Masivo 31	NORMAL	t	1	\N	\N	6	\N	\N
84	95000032	Trabajador Masivo 32	DIET	t	1	\N	\N	8	\N	\N
85	95000033	Trabajador Masivo 33	NORMAL	t	3	\N	\N	5	\N	\N
86	95000034	Trabajador Masivo 34	NORMAL	t	2	\N	\N	8	\N	\N
87	95000035	Trabajador Masivo 35	NORMAL	t	1	\N	\N	7	\N	\N
88	95000036	Trabajador Masivo 36	NORMAL	t	1	\N	\N	7	\N	\N
89	95000037	Trabajador Masivo 37	NORMAL	t	1	\N	\N	7	\N	\N
90	95000038	Trabajador Masivo 38	NORMAL	t	2	\N	\N	6	\N	\N
53	95000001	Trabajador Masivo 1	NORMAL	t	4	\N	\N	5	2	\N
62	95000010	Trabajador Masivo 10	NORMAL	t	4	\N	\N	7	5	\N
91	95000039	Trabajador Masivo 39	DIET	t	1	\N	\N	8	\N	\N
92	95000040	Trabajador Masivo 40	DIET	t	4	\N	\N	8	\N	\N
93	95000041	Trabajador Masivo 41	NORMAL	t	3	\N	\N	5	\N	\N
94	95000042	Trabajador Masivo 42	NORMAL	t	2	\N	\N	7	\N	\N
95	95000043	Trabajador Masivo 43	NORMAL	t	4	\N	\N	5	\N	\N
96	95000044	Trabajador Masivo 44	NORMAL	t	4	\N	\N	5	\N	\N
97	95000045	Trabajador Masivo 45	DIET	t	4	\N	\N	8	\N	\N
98	95000046	Trabajador Masivo 46	NORMAL	t	1	\N	\N	7	\N	\N
99	95000047	Trabajador Masivo 47	NORMAL	t	1	\N	\N	5	\N	\N
100	95000048	Trabajador Masivo 48	NORMAL	t	2	\N	\N	8	\N	\N
101	95000049	Trabajador Masivo 49	DIET	t	3	\N	\N	5	\N	\N
102	95000050	Trabajador Masivo 50	DIET	t	2	\N	\N	7	\N	\N
103	95000051	Trabajador Masivo 51	NORMAL	t	4	\N	\N	8	\N	\N
104	95000052	Trabajador Masivo 52	NORMAL	t	3	\N	\N	6	\N	\N
105	95000053	Trabajador Masivo 53	DIET	t	3	\N	\N	5	\N	\N
106	95000054	Trabajador Masivo 54	NORMAL	t	3	\N	\N	5	\N	\N
107	95000055	Trabajador Masivo 55	NORMAL	t	4	\N	\N	6	\N	\N
108	95000056	Trabajador Masivo 56	NORMAL	t	4	\N	\N	5	\N	\N
109	95000057	Trabajador Masivo 57	NORMAL	t	1	\N	\N	8	\N	\N
110	95000058	Trabajador Masivo 58	NORMAL	t	2	\N	\N	8	\N	\N
111	95000059	Trabajador Masivo 59	NORMAL	t	4	\N	\N	7	\N	\N
112	95000060	Trabajador Masivo 60	DIET	t	1	\N	\N	5	\N	\N
113	95000061	Trabajador Masivo 61	NORMAL	t	4	\N	\N	5	\N	\N
114	95000062	Trabajador Masivo 62	NORMAL	t	2	\N	\N	6	\N	\N
115	95000063	Trabajador Masivo 63	NORMAL	t	3	\N	\N	5	\N	\N
116	95000064	Trabajador Masivo 64	NORMAL	t	4	\N	\N	6	\N	\N
117	95000065	Trabajador Masivo 65	NORMAL	t	3	\N	\N	7	\N	\N
118	95000066	Trabajador Masivo 66	NORMAL	t	4	\N	\N	5	\N	\N
119	95000067	Trabajador Masivo 67	NORMAL	t	3	\N	\N	6	\N	\N
120	95000068	Trabajador Masivo 68	NORMAL	t	3	\N	\N	5	\N	\N
121	95000069	Trabajador Masivo 69	DIET	t	1	\N	\N	5	\N	\N
122	95000070	Trabajador Masivo 70	NORMAL	t	2	\N	\N	7	\N	\N
123	95000071	Trabajador Masivo 71	DIET	t	2	\N	\N	6	\N	\N
124	95000072	Trabajador Masivo 72	NORMAL	t	2	\N	\N	7	\N	\N
125	95000073	Trabajador Masivo 73	NORMAL	t	2	\N	\N	6	\N	\N
126	95000074	Trabajador Masivo 74	DIET	t	1	\N	\N	6	\N	\N
127	95000075	Trabajador Masivo 75	DIET	t	3	\N	\N	8	\N	\N
128	95000076	Trabajador Masivo 76	DIET	t	2	\N	\N	7	\N	\N
129	95000077	Trabajador Masivo 77	NORMAL	t	1	\N	\N	6	\N	\N
130	95000078	Trabajador Masivo 78	DIET	t	4	\N	\N	8	\N	\N
131	95000079	Trabajador Masivo 79	NORMAL	t	4	\N	\N	8	\N	\N
132	95000080	Trabajador Masivo 80	NORMAL	t	1	\N	\N	7	\N	\N
133	95000081	Trabajador Masivo 81	NORMAL	t	1	\N	\N	8	\N	\N
134	95000082	Trabajador Masivo 82	DIET	t	1	\N	\N	5	\N	\N
135	95000083	Trabajador Masivo 83	DIET	t	4	\N	\N	5	\N	\N
136	95000084	Trabajador Masivo 84	NORMAL	t	2	\N	\N	6	\N	\N
137	95000085	Trabajador Masivo 85	NORMAL	t	2	\N	\N	7	\N	\N
138	95000086	Trabajador Masivo 86	NORMAL	t	3	\N	\N	5	\N	\N
139	95000087	Trabajador Masivo 87	DIET	t	2	\N	\N	5	\N	\N
140	95000088	Trabajador Masivo 88	NORMAL	t	4	\N	\N	6	\N	\N
141	95000089	Trabajador Masivo 89	DIET	t	4	\N	\N	8	\N	\N
142	95000090	Trabajador Masivo 90	NORMAL	t	3	\N	\N	8	\N	\N
143	95000091	Trabajador Masivo 91	NORMAL	t	1	\N	\N	7	\N	\N
144	95000092	Trabajador Masivo 92	NORMAL	t	4	\N	\N	5	\N	\N
145	95000093	Trabajador Masivo 93	NORMAL	t	1	\N	\N	8	\N	\N
146	95000094	Trabajador Masivo 94	NORMAL	t	1	\N	\N	8	\N	\N
147	95000095	Trabajador Masivo 95	NORMAL	t	2	\N	\N	5	\N	\N
148	95000096	Trabajador Masivo 96	NORMAL	t	1	\N	\N	6	\N	\N
149	95000097	Trabajador Masivo 97	NORMAL	t	1	\N	\N	8	\N	\N
150	95000098	Trabajador Masivo 98	NORMAL	t	4	\N	\N	5	\N	\N
151	95000099	Trabajador Masivo 99	NORMAL	t	3	\N	\N	7	\N	\N
152	95000100	Trabajador Masivo 100	NORMAL	t	1	\N	\N	5	\N	\N
153	95000101	Trabajador Masivo 101	NORMAL	t	4	\N	\N	8	\N	\N
154	95000102	Trabajador Masivo 102	NORMAL	t	1	\N	\N	6	\N	\N
155	95000103	Trabajador Masivo 103	NORMAL	t	2	\N	\N	7	\N	\N
156	95000104	Trabajador Masivo 104	NORMAL	t	2	\N	\N	5	\N	\N
157	95000105	Trabajador Masivo 105	NORMAL	t	2	\N	\N	6	\N	\N
158	95000106	Trabajador Masivo 106	NORMAL	t	2	\N	\N	5	\N	\N
159	95000107	Trabajador Masivo 107	NORMAL	t	4	\N	\N	8	\N	\N
160	95000108	Trabajador Masivo 108	NORMAL	t	1	\N	\N	6	\N	\N
161	95000109	Trabajador Masivo 109	NORMAL	t	2	\N	\N	5	\N	\N
162	95000110	Trabajador Masivo 110	DIET	t	1	\N	\N	5	\N	\N
164	95000112	Trabajador Masivo 112	NORMAL	t	3	\N	\N	6	\N	\N
165	95000113	Trabajador Masivo 113	NORMAL	t	3	\N	\N	5	\N	\N
166	95000114	Trabajador Masivo 114	NORMAL	t	2	\N	\N	6	\N	\N
167	95000115	Trabajador Masivo 115	NORMAL	t	1	\N	\N	7	\N	\N
168	95000116	Trabajador Masivo 116	NORMAL	t	4	\N	\N	5	\N	\N
169	95000117	Trabajador Masivo 117	NORMAL	t	3	\N	\N	8	\N	\N
170	95000118	Trabajador Masivo 118	NORMAL	t	2	\N	\N	6	\N	\N
171	95000119	Trabajador Masivo 119	NORMAL	t	3	\N	\N	8	\N	\N
172	95000120	Trabajador Masivo 120	NORMAL	t	2	\N	\N	6	\N	\N
173	95000121	Trabajador Masivo 121	NORMAL	t	3	\N	\N	8	\N	\N
174	95000122	Trabajador Masivo 122	NORMAL	t	4	\N	\N	6	\N	\N
175	95000123	Trabajador Masivo 123	NORMAL	t	1	\N	\N	8	\N	\N
176	95000124	Trabajador Masivo 124	DIET	t	1	\N	\N	6	\N	\N
177	95000125	Trabajador Masivo 125	NORMAL	t	1	\N	\N	8	\N	\N
178	95000126	Trabajador Masivo 126	NORMAL	t	2	\N	\N	5	\N	\N
179	95000127	Trabajador Masivo 127	NORMAL	t	3	\N	\N	5	\N	\N
180	95000128	Trabajador Masivo 128	DIET	t	1	\N	\N	6	\N	\N
181	95000129	Trabajador Masivo 129	NORMAL	t	3	\N	\N	7	\N	\N
182	95000130	Trabajador Masivo 130	NORMAL	t	2	\N	\N	5	\N	\N
183	95000131	Trabajador Masivo 131	DIET	t	2	\N	\N	5	\N	\N
184	95000132	Trabajador Masivo 132	NORMAL	t	1	\N	\N	7	\N	\N
185	95000133	Trabajador Masivo 133	NORMAL	t	4	\N	\N	5	\N	\N
186	95000134	Trabajador Masivo 134	NORMAL	t	3	\N	\N	8	\N	\N
187	95000135	Trabajador Masivo 135	DIET	t	1	\N	\N	6	\N	\N
188	95000136	Trabajador Masivo 136	NORMAL	t	1	\N	\N	7	\N	\N
189	95000137	Trabajador Masivo 137	NORMAL	t	1	\N	\N	8	\N	\N
190	95000138	Trabajador Masivo 138	NORMAL	t	2	\N	\N	8	\N	\N
191	95000139	Trabajador Masivo 139	NORMAL	t	4	\N	\N	8	\N	\N
192	95000140	Trabajador Masivo 140	NORMAL	t	4	\N	\N	8	\N	\N
193	95000141	Trabajador Masivo 141	NORMAL	t	2	\N	\N	5	\N	\N
194	95000142	Trabajador Masivo 142	DIET	t	1	\N	\N	5	\N	\N
195	95000143	Trabajador Masivo 143	NORMAL	t	4	\N	\N	6	\N	\N
196	95000144	Trabajador Masivo 144	NORMAL	t	3	\N	\N	6	\N	\N
197	95000145	Trabajador Masivo 145	DIET	t	2	\N	\N	8	\N	\N
198	95000146	Trabajador Masivo 146	NORMAL	t	4	\N	\N	8	\N	\N
199	95000147	Trabajador Masivo 147	NORMAL	t	3	\N	\N	8	\N	\N
200	95000148	Trabajador Masivo 148	DIET	t	4	\N	\N	8	\N	\N
201	95000149	Trabajador Masivo 149	NORMAL	t	3	\N	\N	8	\N	\N
202	95000150	Trabajador Masivo 150	NORMAL	t	2	\N	\N	6	\N	\N
203	95000151	Trabajador Masivo 151	NORMAL	t	4	\N	\N	6	\N	\N
204	95000152	Trabajador Masivo 152	NORMAL	t	4	\N	\N	5	\N	\N
205	95000153	Trabajador Masivo 153	NORMAL	t	4	\N	\N	6	\N	\N
206	95000154	Trabajador Masivo 154	NORMAL	t	3	\N	\N	7	\N	\N
207	95000155	Trabajador Masivo 155	NORMAL	t	2	\N	\N	7	\N	\N
208	95000156	Trabajador Masivo 156	NORMAL	t	1	\N	\N	6	\N	\N
209	95000157	Trabajador Masivo 157	DIET	t	3	\N	\N	8	\N	\N
210	95000158	Trabajador Masivo 158	NORMAL	t	4	\N	\N	5	\N	\N
211	95000159	Trabajador Masivo 159	NORMAL	t	3	\N	\N	8	\N	\N
212	95000160	Trabajador Masivo 160	NORMAL	t	3	\N	\N	8	\N	\N
213	95000161	Trabajador Masivo 161	NORMAL	t	2	\N	\N	6	\N	\N
214	95000162	Trabajador Masivo 162	DIET	t	2	\N	\N	7	\N	\N
215	95000163	Trabajador Masivo 163	NORMAL	t	3	\N	\N	6	\N	\N
216	95000164	Trabajador Masivo 164	NORMAL	t	1	\N	\N	8	\N	\N
217	95000165	Trabajador Masivo 165	NORMAL	t	3	\N	\N	5	\N	\N
218	95000166	Trabajador Masivo 166	NORMAL	t	3	\N	\N	7	\N	\N
219	95000167	Trabajador Masivo 167	NORMAL	t	1	\N	\N	6	\N	\N
220	95000168	Trabajador Masivo 168	DIET	t	1	\N	\N	6	\N	\N
221	95000169	Trabajador Masivo 169	NORMAL	t	3	\N	\N	8	\N	\N
222	95000170	Trabajador Masivo 170	NORMAL	t	4	\N	\N	8	\N	\N
223	95000171	Trabajador Masivo 171	NORMAL	t	2	\N	\N	8	\N	\N
224	95000172	Trabajador Masivo 172	DIET	t	1	\N	\N	8	\N	\N
225	95000173	Trabajador Masivo 173	NORMAL	t	4	\N	\N	6	\N	\N
226	95000174	Trabajador Masivo 174	NORMAL	t	2	\N	\N	6	\N	\N
227	95000175	Trabajador Masivo 175	NORMAL	t	1	\N	\N	5	\N	\N
228	95000176	Trabajador Masivo 176	NORMAL	t	2	\N	\N	5	\N	\N
229	95000177	Trabajador Masivo 177	DIET	t	3	\N	\N	7	\N	\N
230	95000178	Trabajador Masivo 178	NORMAL	t	3	\N	\N	7	\N	\N
231	95000179	Trabajador Masivo 179	NORMAL	t	3	\N	\N	5	\N	\N
232	95000180	Trabajador Masivo 180	NORMAL	t	2	\N	\N	6	\N	\N
233	95000181	Trabajador Masivo 181	NORMAL	t	3	\N	\N	7	\N	\N
234	95000182	Trabajador Masivo 182	NORMAL	t	1	\N	\N	6	\N	\N
235	95000183	Trabajador Masivo 183	NORMAL	t	1	\N	\N	6	\N	\N
236	95000184	Trabajador Masivo 184	DIET	t	3	\N	\N	5	\N	\N
237	95000185	Trabajador Masivo 185	DIET	t	2	\N	\N	5	\N	\N
238	95000186	Trabajador Masivo 186	NORMAL	t	1	\N	\N	7	\N	\N
239	95000187	Trabajador Masivo 187	NORMAL	t	4	\N	\N	5	\N	\N
240	95000188	Trabajador Masivo 188	NORMAL	t	1	\N	\N	7	\N	\N
241	95000189	Trabajador Masivo 189	NORMAL	t	3	\N	\N	5	\N	\N
242	95000190	Trabajador Masivo 190	NORMAL	t	4	\N	\N	5	\N	\N
243	95000191	Trabajador Masivo 191	DIET	t	4	\N	\N	8	\N	\N
244	95000192	Trabajador Masivo 192	NORMAL	t	4	\N	\N	7	\N	\N
245	95000193	Trabajador Masivo 193	NORMAL	t	4	\N	\N	6	\N	\N
246	95000194	Trabajador Masivo 194	NORMAL	t	4	\N	\N	7	\N	\N
247	95000195	Trabajador Masivo 195	DIET	t	4	\N	\N	7	\N	\N
248	95000196	Trabajador Masivo 196	NORMAL	t	1	\N	\N	7	\N	\N
249	95000197	Trabajador Masivo 197	NORMAL	t	1	\N	\N	7	\N	\N
250	95000198	Trabajador Masivo 198	NORMAL	t	4	\N	\N	8	\N	\N
251	95000199	Trabajador Masivo 199	NORMAL	t	4	\N	\N	7	\N	\N
252	95000200	Trabajador Masivo 200	NORMAL	t	4	\N	\N	7	\N	\N
253	95000201	Trabajador Masivo 201	NORMAL	t	2	\N	\N	7	\N	\N
254	95000202	Trabajador Masivo 202	NORMAL	t	4	\N	\N	6	\N	\N
255	95000203	Trabajador Masivo 203	NORMAL	t	3	\N	\N	5	\N	\N
256	95000204	Trabajador Masivo 204	NORMAL	t	4	\N	\N	7	\N	\N
257	95000205	Trabajador Masivo 205	NORMAL	t	2	\N	\N	5	\N	\N
258	95000206	Trabajador Masivo 206	NORMAL	t	2	\N	\N	8	\N	\N
259	95000207	Trabajador Masivo 207	DIET	t	3	\N	\N	7	\N	\N
260	95000208	Trabajador Masivo 208	NORMAL	t	3	\N	\N	8	\N	\N
261	95000209	Trabajador Masivo 209	NORMAL	t	3	\N	\N	7	\N	\N
262	95000210	Trabajador Masivo 210	DIET	t	4	\N	\N	8	\N	\N
263	95000211	Trabajador Masivo 211	NORMAL	t	3	\N	\N	7	\N	\N
264	95000212	Trabajador Masivo 212	NORMAL	t	1	\N	\N	7	\N	\N
265	95000213	Trabajador Masivo 213	NORMAL	t	4	\N	\N	7	\N	\N
266	95000214	Trabajador Masivo 214	DIET	t	1	\N	\N	6	\N	\N
267	95000215	Trabajador Masivo 215	NORMAL	t	4	\N	\N	7	\N	\N
268	95000216	Trabajador Masivo 216	NORMAL	t	1	\N	\N	5	\N	\N
269	95000217	Trabajador Masivo 217	NORMAL	t	2	\N	\N	5	\N	\N
270	95000218	Trabajador Masivo 218	NORMAL	t	3	\N	\N	6	\N	\N
271	95000219	Trabajador Masivo 219	NORMAL	t	2	\N	\N	8	\N	\N
272	95000220	Trabajador Masivo 220	NORMAL	t	2	\N	\N	5	\N	\N
273	95000221	Trabajador Masivo 221	NORMAL	t	2	\N	\N	5	\N	\N
274	95000222	Trabajador Masivo 222	DIET	t	3	\N	\N	6	\N	\N
275	95000223	Trabajador Masivo 223	NORMAL	t	4	\N	\N	8	\N	\N
276	95000224	Trabajador Masivo 224	NORMAL	t	2	\N	\N	8	\N	\N
277	95000225	Trabajador Masivo 225	DIET	t	4	\N	\N	5	\N	\N
278	95000226	Trabajador Masivo 226	NORMAL	t	2	\N	\N	8	\N	\N
279	95000227	Trabajador Masivo 227	NORMAL	t	3	\N	\N	5	\N	\N
280	95000228	Trabajador Masivo 228	NORMAL	t	1	\N	\N	5	\N	\N
281	95000229	Trabajador Masivo 229	DIET	t	2	\N	\N	5	\N	\N
282	95000230	Trabajador Masivo 230	NORMAL	t	2	\N	\N	5	\N	\N
283	95000231	Trabajador Masivo 231	NORMAL	t	2	\N	\N	8	\N	\N
284	95000232	Trabajador Masivo 232	NORMAL	t	4	\N	\N	8	\N	\N
285	95000233	Trabajador Masivo 233	NORMAL	t	4	\N	\N	8	\N	\N
286	95000234	Trabajador Masivo 234	NORMAL	t	1	\N	\N	7	\N	\N
287	95000235	Trabajador Masivo 235	NORMAL	t	4	\N	\N	7	\N	\N
288	95000236	Trabajador Masivo 236	NORMAL	t	4	\N	\N	6	\N	\N
289	95000237	Trabajador Masivo 237	NORMAL	t	2	\N	\N	7	\N	\N
290	95000238	Trabajador Masivo 238	NORMAL	t	2	\N	\N	8	\N	\N
291	95000239	Trabajador Masivo 239	NORMAL	t	2	\N	\N	5	\N	\N
292	95000240	Trabajador Masivo 240	NORMAL	t	3	\N	\N	6	\N	\N
293	95000241	Trabajador Masivo 241	NORMAL	t	3	\N	\N	8	\N	\N
294	95000242	Trabajador Masivo 242	NORMAL	t	2	\N	\N	6	\N	\N
295	95000243	Trabajador Masivo 243	NORMAL	t	4	\N	\N	5	\N	\N
296	95000244	Trabajador Masivo 244	NORMAL	t	4	\N	\N	7	\N	\N
297	95000245	Trabajador Masivo 245	DIET	t	2	\N	\N	5	\N	\N
298	95000246	Trabajador Masivo 246	NORMAL	t	1	\N	\N	7	\N	\N
299	95000247	Trabajador Masivo 247	NORMAL	t	3	\N	\N	8	\N	\N
300	95000248	Trabajador Masivo 248	NORMAL	t	1	\N	\N	7	\N	\N
301	95000249	Trabajador Masivo 249	NORMAL	t	2	\N	\N	8	\N	\N
302	95000250	Trabajador Masivo 250	NORMAL	t	4	\N	\N	6	\N	\N
303	95000251	Trabajador Masivo 251	NORMAL	t	4	\N	\N	6	\N	\N
304	95000252	Trabajador Masivo 252	NORMAL	t	1	\N	\N	7	\N	\N
305	95000253	Trabajador Masivo 253	NORMAL	t	2	\N	\N	6	\N	\N
306	95000254	Trabajador Masivo 254	NORMAL	t	2	\N	\N	8	\N	\N
308	95000256	Trabajador Masivo 256	NORMAL	t	2	\N	\N	8	\N	\N
309	95000257	Trabajador Masivo 257	NORMAL	t	1	\N	\N	8	\N	\N
310	95000258	Trabajador Masivo 258	NORMAL	t	4	\N	\N	6	\N	\N
311	95000259	Trabajador Masivo 259	NORMAL	t	3	\N	\N	5	\N	\N
312	95000260	Trabajador Masivo 260	NORMAL	t	2	\N	\N	6	\N	\N
313	95000261	Trabajador Masivo 261	NORMAL	t	4	\N	\N	8	\N	\N
314	95000262	Trabajador Masivo 262	NORMAL	t	2	\N	\N	6	\N	\N
315	95000263	Trabajador Masivo 263	DIET	t	3	\N	\N	5	\N	\N
316	95000264	Trabajador Masivo 264	NORMAL	t	2	\N	\N	5	\N	\N
317	95000265	Trabajador Masivo 265	NORMAL	t	3	\N	\N	6	\N	\N
318	95000266	Trabajador Masivo 266	NORMAL	t	3	\N	\N	5	\N	\N
319	95000267	Trabajador Masivo 267	NORMAL	t	2	\N	\N	7	\N	\N
320	95000268	Trabajador Masivo 268	NORMAL	t	4	\N	\N	6	\N	\N
321	95000269	Trabajador Masivo 269	NORMAL	t	2	\N	\N	8	\N	\N
322	95000270	Trabajador Masivo 270	DIET	t	4	\N	\N	6	\N	\N
323	95000271	Trabajador Masivo 271	DIET	t	3	\N	\N	5	\N	\N
324	95000272	Trabajador Masivo 272	NORMAL	t	4	\N	\N	6	\N	\N
325	95000273	Trabajador Masivo 273	NORMAL	t	4	\N	\N	8	\N	\N
326	95000274	Trabajador Masivo 274	NORMAL	t	2	\N	\N	7	\N	\N
327	95000275	Trabajador Masivo 275	NORMAL	t	3	\N	\N	6	\N	\N
328	95000276	Trabajador Masivo 276	DIET	t	4	\N	\N	6	\N	\N
329	95000277	Trabajador Masivo 277	NORMAL	t	2	\N	\N	8	\N	\N
330	95000278	Trabajador Masivo 278	DIET	t	4	\N	\N	7	\N	\N
331	95000279	Trabajador Masivo 279	NORMAL	t	4	\N	\N	8	\N	\N
332	95000280	Trabajador Masivo 280	NORMAL	t	2	\N	\N	6	\N	\N
333	95000281	Trabajador Masivo 281	NORMAL	t	3	\N	\N	7	\N	\N
334	95000282	Trabajador Masivo 282	NORMAL	t	2	\N	\N	6	\N	\N
335	95000283	Trabajador Masivo 283	NORMAL	t	2	\N	\N	6	\N	\N
336	95000284	Trabajador Masivo 284	NORMAL	t	4	\N	\N	5	\N	\N
337	95000285	Trabajador Masivo 285	DIET	t	3	\N	\N	7	\N	\N
338	95000286	Trabajador Masivo 286	NORMAL	t	1	\N	\N	5	\N	\N
339	95000287	Trabajador Masivo 287	NORMAL	t	4	\N	\N	6	\N	\N
340	95000288	Trabajador Masivo 288	NORMAL	t	4	\N	\N	8	\N	\N
341	95000289	Trabajador Masivo 289	DIET	t	3	\N	\N	5	\N	\N
342	95000290	Trabajador Masivo 290	NORMAL	t	1	\N	\N	6	\N	\N
343	95000291	Trabajador Masivo 291	DIET	t	4	\N	\N	6	\N	\N
344	95000292	Trabajador Masivo 292	DIET	t	3	\N	\N	5	\N	\N
345	95000293	Trabajador Masivo 293	NORMAL	t	1	\N	\N	8	\N	\N
346	95000294	Trabajador Masivo 294	NORMAL	t	1	\N	\N	8	\N	\N
347	95000295	Trabajador Masivo 295	NORMAL	t	4	\N	\N	7	\N	\N
348	95000296	Trabajador Masivo 296	DIET	t	4	\N	\N	7	\N	\N
349	95000297	Trabajador Masivo 297	NORMAL	t	2	\N	\N	8	\N	\N
350	95000298	Trabajador Masivo 298	NORMAL	t	3	\N	\N	7	\N	\N
351	95000299	Trabajador Masivo 299	DIET	t	3	\N	\N	7	\N	\N
352	95000300	Trabajador Masivo 300	NORMAL	t	3	\N	\N	6	\N	\N
353	95000301	Trabajador Masivo 301	NORMAL	t	2	\N	\N	6	\N	\N
354	95000302	Trabajador Masivo 302	NORMAL	t	2	\N	\N	6	\N	\N
355	95000303	Trabajador Masivo 303	NORMAL	t	2	\N	\N	6	\N	\N
356	95000304	Trabajador Masivo 304	NORMAL	t	1	\N	\N	6	\N	\N
357	95000305	Trabajador Masivo 305	DIET	t	3	\N	\N	6	\N	\N
358	95000306	Trabajador Masivo 306	NORMAL	t	3	\N	\N	8	\N	\N
359	95000307	Trabajador Masivo 307	DIET	t	4	\N	\N	5	\N	\N
360	95000308	Trabajador Masivo 308	NORMAL	t	2	\N	\N	8	\N	\N
361	95000309	Trabajador Masivo 309	NORMAL	t	1	\N	\N	8	\N	\N
362	95000310	Trabajador Masivo 310	NORMAL	t	3	\N	\N	6	\N	\N
363	95000311	Trabajador Masivo 311	NORMAL	t	4	\N	\N	8	\N	\N
364	95000312	Trabajador Masivo 312	NORMAL	t	4	\N	\N	7	\N	\N
365	95000313	Trabajador Masivo 313	DIET	t	1	\N	\N	7	\N	\N
366	95000314	Trabajador Masivo 314	DIET	t	2	\N	\N	5	\N	\N
367	95000315	Trabajador Masivo 315	NORMAL	t	4	\N	\N	8	\N	\N
368	95000316	Trabajador Masivo 316	NORMAL	t	4	\N	\N	5	\N	\N
369	95000317	Trabajador Masivo 317	NORMAL	t	4	\N	\N	8	\N	\N
370	95000318	Trabajador Masivo 318	NORMAL	t	4	\N	\N	7	\N	\N
371	95000319	Trabajador Masivo 319	NORMAL	t	2	\N	\N	6	\N	\N
372	95000320	Trabajador Masivo 320	NORMAL	t	1	\N	\N	6	\N	\N
373	95000321	Trabajador Masivo 321	NORMAL	t	3	\N	\N	5	\N	\N
374	95000322	Trabajador Masivo 322	NORMAL	t	4	\N	\N	5	\N	\N
375	95000323	Trabajador Masivo 323	NORMAL	t	3	\N	\N	8	\N	\N
376	95000324	Trabajador Masivo 324	NORMAL	t	2	\N	\N	8	\N	\N
377	95000325	Trabajador Masivo 325	NORMAL	t	2	\N	\N	6	\N	\N
378	95000326	Trabajador Masivo 326	NORMAL	t	2	\N	\N	6	\N	\N
379	95000327	Trabajador Masivo 327	NORMAL	t	3	\N	\N	6	\N	\N
380	95000328	Trabajador Masivo 328	NORMAL	t	4	\N	\N	7	\N	\N
381	95000329	Trabajador Masivo 329	DIET	t	1	\N	\N	7	\N	\N
382	95000330	Trabajador Masivo 330	NORMAL	t	2	\N	\N	8	\N	\N
383	95000331	Trabajador Masivo 331	NORMAL	t	1	\N	\N	6	\N	\N
384	95000332	Trabajador Masivo 332	NORMAL	t	4	\N	\N	6	\N	\N
385	95000333	Trabajador Masivo 333	DIET	t	3	\N	\N	5	\N	\N
386	95000334	Trabajador Masivo 334	NORMAL	t	1	\N	\N	6	\N	\N
387	95000335	Trabajador Masivo 335	NORMAL	t	4	\N	\N	8	\N	\N
388	95000336	Trabajador Masivo 336	NORMAL	t	1	\N	\N	6	\N	\N
389	95000337	Trabajador Masivo 337	DIET	t	1	\N	\N	5	\N	\N
390	95000338	Trabajador Masivo 338	NORMAL	t	4	\N	\N	5	\N	\N
391	95000339	Trabajador Masivo 339	NORMAL	t	4	\N	\N	8	\N	\N
392	95000340	Trabajador Masivo 340	NORMAL	t	3	\N	\N	8	\N	\N
393	95000341	Trabajador Masivo 341	NORMAL	t	1	\N	\N	6	\N	\N
394	95000342	Trabajador Masivo 342	DIET	t	4	\N	\N	5	\N	\N
395	95000343	Trabajador Masivo 343	NORMAL	t	1	\N	\N	8	\N	\N
396	95000344	Trabajador Masivo 344	NORMAL	t	1	\N	\N	6	\N	\N
397	95000345	Trabajador Masivo 345	NORMAL	t	2	\N	\N	7	\N	\N
398	95000346	Trabajador Masivo 346	NORMAL	t	4	\N	\N	8	\N	\N
399	95000347	Trabajador Masivo 347	NORMAL	t	2	\N	\N	7	\N	\N
400	95000348	Trabajador Masivo 348	NORMAL	t	2	\N	\N	5	\N	\N
401	95000349	Trabajador Masivo 349	NORMAL	t	3	\N	\N	8	\N	\N
402	95000350	Trabajador Masivo 350	NORMAL	t	1	\N	\N	7	\N	\N
403	95000351	Trabajador Masivo 351	DIET	t	1	\N	\N	8	\N	\N
404	95000352	Trabajador Masivo 352	NORMAL	t	3	\N	\N	6	\N	\N
405	95000353	Trabajador Masivo 353	DIET	t	3	\N	\N	7	\N	\N
406	95000354	Trabajador Masivo 354	NORMAL	t	3	\N	\N	6	\N	\N
407	95000355	Trabajador Masivo 355	DIET	t	2	\N	\N	8	\N	\N
408	95000356	Trabajador Masivo 356	NORMAL	t	2	\N	\N	7	\N	\N
409	95000357	Trabajador Masivo 357	NORMAL	t	1	\N	\N	6	\N	\N
410	95000358	Trabajador Masivo 358	NORMAL	t	4	\N	\N	6	\N	\N
411	95000359	Trabajador Masivo 359	DIET	t	1	\N	\N	7	\N	\N
412	95000360	Trabajador Masivo 360	DIET	t	4	\N	\N	8	\N	\N
413	95000361	Trabajador Masivo 361	NORMAL	t	4	\N	\N	7	\N	\N
414	95000362	Trabajador Masivo 362	NORMAL	t	3	\N	\N	5	\N	\N
415	95000363	Trabajador Masivo 363	NORMAL	t	3	\N	\N	7	\N	\N
416	95000364	Trabajador Masivo 364	DIET	t	2	\N	\N	7	\N	\N
417	95000365	Trabajador Masivo 365	NORMAL	t	2	\N	\N	7	\N	\N
418	95000366	Trabajador Masivo 366	DIET	t	2	\N	\N	5	\N	\N
419	95000367	Trabajador Masivo 367	NORMAL	t	1	\N	\N	8	\N	\N
420	95000368	Trabajador Masivo 368	NORMAL	t	4	\N	\N	5	\N	\N
421	95000369	Trabajador Masivo 369	NORMAL	t	1	\N	\N	5	\N	\N
422	95000370	Trabajador Masivo 370	NORMAL	t	3	\N	\N	6	\N	\N
423	95000371	Trabajador Masivo 371	NORMAL	t	3	\N	\N	5	\N	\N
424	95000372	Trabajador Masivo 372	NORMAL	t	3	\N	\N	8	\N	\N
425	95000373	Trabajador Masivo 373	NORMAL	t	1	\N	\N	5	\N	\N
426	95000374	Trabajador Masivo 374	DIET	t	1	\N	\N	8	\N	\N
427	95000375	Trabajador Masivo 375	NORMAL	t	2	\N	\N	8	\N	\N
428	95000376	Trabajador Masivo 376	NORMAL	t	1	\N	\N	6	\N	\N
429	95000377	Trabajador Masivo 377	NORMAL	t	2	\N	\N	7	\N	\N
430	95000378	Trabajador Masivo 378	NORMAL	t	1	\N	\N	7	\N	\N
431	95000379	Trabajador Masivo 379	NORMAL	t	2	\N	\N	8	\N	\N
432	95000380	Trabajador Masivo 380	NORMAL	t	1	\N	\N	5	\N	\N
433	95000381	Trabajador Masivo 381	NORMAL	t	4	\N	\N	6	\N	\N
434	95000382	Trabajador Masivo 382	NORMAL	t	1	\N	\N	5	\N	\N
435	95000383	Trabajador Masivo 383	NORMAL	t	4	\N	\N	6	\N	\N
436	95000384	Trabajador Masivo 384	NORMAL	t	2	\N	\N	7	\N	\N
437	95000385	Trabajador Masivo 385	NORMAL	t	1	\N	\N	5	\N	\N
438	95000386	Trabajador Masivo 386	NORMAL	t	2	\N	\N	7	\N	\N
439	95000387	Trabajador Masivo 387	NORMAL	t	4	\N	\N	6	\N	\N
440	95000388	Trabajador Masivo 388	NORMAL	t	1	\N	\N	8	\N	\N
441	95000389	Trabajador Masivo 389	NORMAL	t	2	\N	\N	6	\N	\N
442	95000390	Trabajador Masivo 390	DIET	t	4	\N	\N	8	\N	\N
443	95000391	Trabajador Masivo 391	NORMAL	t	3	\N	\N	6	\N	\N
444	95000392	Trabajador Masivo 392	DIET	t	4	\N	\N	6	\N	\N
445	95000393	Trabajador Masivo 393	NORMAL	t	4	\N	\N	7	\N	\N
446	95000394	Trabajador Masivo 394	NORMAL	t	1	\N	\N	6	\N	\N
447	95000395	Trabajador Masivo 395	DIET	t	3	\N	\N	5	\N	\N
448	95000396	Trabajador Masivo 396	NORMAL	t	3	\N	\N	7	\N	\N
449	95000397	Trabajador Masivo 397	NORMAL	t	1	\N	\N	5	\N	\N
450	95000398	Trabajador Masivo 398	NORMAL	t	1	\N	\N	7	\N	\N
451	95000399	Trabajador Masivo 399	NORMAL	t	4	\N	\N	7	\N	\N
452	95000400	Trabajador Masivo 400	NORMAL	t	4	\N	\N	6	\N	\N
453	95000401	Trabajador Masivo 401	NORMAL	t	4	\N	\N	8	\N	\N
454	95000402	Trabajador Masivo 402	NORMAL	t	2	\N	\N	8	\N	\N
455	95000403	Trabajador Masivo 403	NORMAL	t	1	\N	\N	5	\N	\N
456	95000404	Trabajador Masivo 404	NORMAL	t	3	\N	\N	8	\N	\N
457	95000405	Trabajador Masivo 405	NORMAL	t	2	\N	\N	6	\N	\N
458	95000406	Trabajador Masivo 406	NORMAL	t	2	\N	\N	6	\N	\N
459	95000407	Trabajador Masivo 407	DIET	t	4	\N	\N	7	\N	\N
460	95000408	Trabajador Masivo 408	NORMAL	t	4	\N	\N	8	\N	\N
461	95000409	Trabajador Masivo 409	NORMAL	t	1	\N	\N	6	\N	\N
462	95000410	Trabajador Masivo 410	NORMAL	t	4	\N	\N	7	\N	\N
463	95000411	Trabajador Masivo 411	NORMAL	t	3	\N	\N	5	\N	\N
464	95000412	Trabajador Masivo 412	NORMAL	t	3	\N	\N	7	\N	\N
465	95000413	Trabajador Masivo 413	NORMAL	t	2	\N	\N	7	\N	\N
466	95000414	Trabajador Masivo 414	NORMAL	t	4	\N	\N	5	\N	\N
467	95000415	Trabajador Masivo 415	NORMAL	t	1	\N	\N	8	\N	\N
468	95000416	Trabajador Masivo 416	NORMAL	t	1	\N	\N	7	\N	\N
469	95000417	Trabajador Masivo 417	DIET	t	2	\N	\N	7	\N	\N
470	95000418	Trabajador Masivo 418	NORMAL	t	2	\N	\N	6	\N	\N
471	95000419	Trabajador Masivo 419	DIET	t	2	\N	\N	8	\N	\N
472	95000420	Trabajador Masivo 420	NORMAL	t	4	\N	\N	8	\N	\N
473	95000421	Trabajador Masivo 421	NORMAL	t	2	\N	\N	5	\N	\N
474	95000422	Trabajador Masivo 422	NORMAL	t	2	\N	\N	6	\N	\N
475	95000423	Trabajador Masivo 423	NORMAL	t	4	\N	\N	7	\N	\N
476	95000424	Trabajador Masivo 424	NORMAL	t	3	\N	\N	6	\N	\N
477	95000425	Trabajador Masivo 425	NORMAL	t	3	\N	\N	7	\N	\N
478	95000426	Trabajador Masivo 426	DIET	t	4	\N	\N	7	\N	\N
479	95000427	Trabajador Masivo 427	DIET	t	2	\N	\N	5	\N	\N
480	95000428	Trabajador Masivo 428	NORMAL	t	4	\N	\N	8	\N	\N
481	95000429	Trabajador Masivo 429	DIET	t	3	\N	\N	5	\N	\N
482	95000430	Trabajador Masivo 430	NORMAL	t	4	\N	\N	6	\N	\N
483	95000431	Trabajador Masivo 431	NORMAL	t	2	\N	\N	8	\N	\N
484	95000432	Trabajador Masivo 432	NORMAL	t	2	\N	\N	8	\N	\N
485	95000433	Trabajador Masivo 433	NORMAL	t	2	\N	\N	7	\N	\N
486	95000434	Trabajador Masivo 434	NORMAL	t	2	\N	\N	6	\N	\N
487	95000435	Trabajador Masivo 435	NORMAL	t	1	\N	\N	8	\N	\N
488	95000436	Trabajador Masivo 436	NORMAL	t	1	\N	\N	6	\N	\N
489	95000437	Trabajador Masivo 437	NORMAL	t	2	\N	\N	5	\N	\N
490	95000438	Trabajador Masivo 438	DIET	t	1	\N	\N	5	\N	\N
491	95000439	Trabajador Masivo 439	DIET	t	4	\N	\N	8	\N	\N
492	95000440	Trabajador Masivo 440	NORMAL	t	2	\N	\N	5	\N	\N
493	95000441	Trabajador Masivo 441	DIET	t	1	\N	\N	7	\N	\N
494	95000442	Trabajador Masivo 442	DIET	t	4	\N	\N	7	\N	\N
495	95000443	Trabajador Masivo 443	NORMAL	t	3	\N	\N	5	\N	\N
496	95000444	Trabajador Masivo 444	NORMAL	t	4	\N	\N	6	\N	\N
497	95000445	Trabajador Masivo 445	NORMAL	t	2	\N	\N	5	\N	\N
498	95000446	Trabajador Masivo 446	NORMAL	t	3	\N	\N	7	\N	\N
499	95000447	Trabajador Masivo 447	NORMAL	t	3	\N	\N	8	\N	\N
500	95000448	Trabajador Masivo 448	NORMAL	t	1	\N	\N	6	\N	\N
501	95000449	Trabajador Masivo 449	DIET	t	4	\N	\N	6	\N	\N
502	95000450	Trabajador Masivo 450	DIET	t	3	\N	\N	5	\N	\N
503	95000451	Trabajador Masivo 451	NORMAL	t	2	\N	\N	8	\N	\N
504	95000452	Trabajador Masivo 452	DIET	t	1	\N	\N	8	\N	\N
505	95000453	Trabajador Masivo 453	NORMAL	t	2	\N	\N	5	\N	\N
506	95000454	Trabajador Masivo 454	NORMAL	t	2	\N	\N	6	\N	\N
507	95000455	Trabajador Masivo 455	DIET	t	4	\N	\N	5	\N	\N
508	95000456	Trabajador Masivo 456	NORMAL	t	3	\N	\N	6	\N	\N
509	95000457	Trabajador Masivo 457	NORMAL	t	4	\N	\N	5	\N	\N
510	95000458	Trabajador Masivo 458	NORMAL	t	2	\N	\N	5	\N	\N
511	95000459	Trabajador Masivo 459	NORMAL	t	2	\N	\N	8	\N	\N
512	95000460	Trabajador Masivo 460	NORMAL	t	1	\N	\N	7	\N	\N
513	95000461	Trabajador Masivo 461	DIET	t	4	\N	\N	7	\N	\N
514	95000462	Trabajador Masivo 462	NORMAL	t	4	\N	\N	8	\N	\N
515	95000463	Trabajador Masivo 463	NORMAL	t	3	\N	\N	6	\N	\N
516	95000464	Trabajador Masivo 464	NORMAL	t	3	\N	\N	6	\N	\N
517	95000465	Trabajador Masivo 465	NORMAL	t	2	\N	\N	8	\N	\N
518	95000466	Trabajador Masivo 466	DIET	t	2	\N	\N	5	\N	\N
519	95000467	Trabajador Masivo 467	NORMAL	t	3	\N	\N	7	\N	\N
520	95000468	Trabajador Masivo 468	DIET	t	2	\N	\N	6	\N	\N
521	95000469	Trabajador Masivo 469	NORMAL	t	2	\N	\N	6	\N	\N
522	95000470	Trabajador Masivo 470	DIET	t	2	\N	\N	6	\N	\N
523	95000471	Trabajador Masivo 471	DIET	t	1	\N	\N	8	\N	\N
524	95000472	Trabajador Masivo 472	NORMAL	t	1	\N	\N	7	\N	\N
525	95000473	Trabajador Masivo 473	NORMAL	t	1	\N	\N	8	\N	\N
526	95000474	Trabajador Masivo 474	NORMAL	t	2	\N	\N	7	\N	\N
527	95000475	Trabajador Masivo 475	NORMAL	t	2	\N	\N	7	\N	\N
528	95000476	Trabajador Masivo 476	NORMAL	t	2	\N	\N	7	\N	\N
529	95000477	Trabajador Masivo 477	DIET	t	2	\N	\N	8	\N	\N
530	95000478	Trabajador Masivo 478	NORMAL	t	1	\N	\N	8	\N	\N
531	95000479	Trabajador Masivo 479	NORMAL	t	3	\N	\N	5	\N	\N
532	95000480	Trabajador Masivo 480	NORMAL	t	2	\N	\N	8	\N	\N
533	95000481	Trabajador Masivo 481	DIET	t	2	\N	\N	7	\N	\N
534	95000482	Trabajador Masivo 482	NORMAL	t	4	\N	\N	7	\N	\N
535	95000483	Trabajador Masivo 483	NORMAL	t	4	\N	\N	6	\N	\N
536	95000484	Trabajador Masivo 484	NORMAL	t	1	\N	\N	6	\N	\N
537	95000485	Trabajador Masivo 485	NORMAL	t	1	\N	\N	5	\N	\N
538	95000486	Trabajador Masivo 486	NORMAL	t	3	\N	\N	8	\N	\N
539	95000487	Trabajador Masivo 487	NORMAL	t	3	\N	\N	5	\N	\N
540	95000488	Trabajador Masivo 488	NORMAL	t	1	\N	\N	8	\N	\N
541	95000489	Trabajador Masivo 489	NORMAL	t	3	\N	\N	7	\N	\N
542	95000490	Trabajador Masivo 490	NORMAL	t	3	\N	\N	6	\N	\N
543	95000491	Trabajador Masivo 491	NORMAL	t	1	\N	\N	7	\N	\N
544	95000492	Trabajador Masivo 492	NORMAL	t	3	\N	\N	6	\N	\N
545	95000493	Trabajador Masivo 493	DIET	t	3	\N	\N	6	\N	\N
546	95000494	Trabajador Masivo 494	NORMAL	t	4	\N	\N	5	\N	\N
547	95000495	Trabajador Masivo 495	NORMAL	t	2	\N	\N	6	\N	\N
548	95000496	Trabajador Masivo 496	NORMAL	t	2	\N	\N	6	\N	\N
549	95000497	Trabajador Masivo 497	NORMAL	t	4	\N	\N	8	\N	\N
550	95000498	Trabajador Masivo 498	NORMAL	t	2	\N	\N	6	\N	\N
551	95000499	Trabajador Masivo 499	DIET	t	3	\N	\N	6	\N	\N
552	95000500	Trabajador Masivo 500	NORMAL	t	4	\N	\N	5	\N	\N
553	95000501	Trabajador Masivo 501	NORMAL	t	1	\N	\N	7	\N	\N
554	95000502	Trabajador Masivo 502	DIET	t	4	\N	\N	8	\N	\N
555	95000503	Trabajador Masivo 503	DIET	t	4	\N	\N	6	\N	\N
556	95000504	Trabajador Masivo 504	NORMAL	t	2	\N	\N	5	\N	\N
557	95000505	Trabajador Masivo 505	NORMAL	t	4	\N	\N	8	\N	\N
558	95000506	Trabajador Masivo 506	DIET	t	2	\N	\N	5	\N	\N
559	95000507	Trabajador Masivo 507	DIET	t	4	\N	\N	8	\N	\N
560	95000508	Trabajador Masivo 508	NORMAL	t	3	\N	\N	8	\N	\N
561	95000509	Trabajador Masivo 509	NORMAL	t	2	\N	\N	8	\N	\N
562	95000510	Trabajador Masivo 510	NORMAL	t	1	\N	\N	5	\N	\N
563	95000511	Trabajador Masivo 511	NORMAL	t	3	\N	\N	5	\N	\N
564	95000512	Trabajador Masivo 512	DIET	t	4	\N	\N	6	\N	\N
565	95000513	Trabajador Masivo 513	DIET	t	3	\N	\N	5	\N	\N
566	95000514	Trabajador Masivo 514	NORMAL	t	2	\N	\N	8	\N	\N
567	95000515	Trabajador Masivo 515	DIET	t	1	\N	\N	5	\N	\N
568	95000516	Trabajador Masivo 516	NORMAL	t	4	\N	\N	8	\N	\N
569	95000517	Trabajador Masivo 517	NORMAL	t	3	\N	\N	6	\N	\N
570	95000518	Trabajador Masivo 518	NORMAL	t	1	\N	\N	6	\N	\N
571	95000519	Trabajador Masivo 519	NORMAL	t	4	\N	\N	5	\N	\N
572	95000520	Trabajador Masivo 520	NORMAL	t	2	\N	\N	6	\N	\N
573	95000521	Trabajador Masivo 521	NORMAL	t	3	\N	\N	8	\N	\N
574	95000522	Trabajador Masivo 522	NORMAL	t	2	\N	\N	6	\N	\N
575	95000523	Trabajador Masivo 523	NORMAL	t	3	\N	\N	6	\N	\N
576	95000524	Trabajador Masivo 524	NORMAL	t	2	\N	\N	8	\N	\N
577	95000525	Trabajador Masivo 525	NORMAL	t	2	\N	\N	8	\N	\N
578	95000526	Trabajador Masivo 526	DIET	t	4	\N	\N	6	\N	\N
579	95000527	Trabajador Masivo 527	NORMAL	t	3	\N	\N	8	\N	\N
580	95000528	Trabajador Masivo 528	NORMAL	t	1	\N	\N	6	\N	\N
581	95000529	Trabajador Masivo 529	NORMAL	t	1	\N	\N	7	\N	\N
582	95000530	Trabajador Masivo 530	NORMAL	t	2	\N	\N	6	\N	\N
583	95000531	Trabajador Masivo 531	NORMAL	t	2	\N	\N	5	\N	\N
584	95000532	Trabajador Masivo 532	NORMAL	t	2	\N	\N	5	\N	\N
585	95000533	Trabajador Masivo 533	NORMAL	t	3	\N	\N	7	\N	\N
586	95000534	Trabajador Masivo 534	NORMAL	t	4	\N	\N	7	\N	\N
587	95000535	Trabajador Masivo 535	NORMAL	t	3	\N	\N	8	\N	\N
588	95000536	Trabajador Masivo 536	NORMAL	t	4	\N	\N	6	\N	\N
589	95000537	Trabajador Masivo 537	NORMAL	t	4	\N	\N	8	\N	\N
590	95000538	Trabajador Masivo 538	NORMAL	t	4	\N	\N	6	\N	\N
591	95000539	Trabajador Masivo 539	NORMAL	t	2	\N	\N	5	\N	\N
592	95000540	Trabajador Masivo 540	NORMAL	t	3	\N	\N	7	\N	\N
593	95000541	Trabajador Masivo 541	NORMAL	t	4	\N	\N	6	\N	\N
594	95000542	Trabajador Masivo 542	NORMAL	t	1	\N	\N	6	\N	\N
595	95000543	Trabajador Masivo 543	NORMAL	t	3	\N	\N	8	\N	\N
596	95000544	Trabajador Masivo 544	DIET	t	3	\N	\N	6	\N	\N
597	95000545	Trabajador Masivo 545	NORMAL	t	4	\N	\N	6	\N	\N
598	95000546	Trabajador Masivo 546	NORMAL	t	3	\N	\N	6	\N	\N
599	95000547	Trabajador Masivo 547	NORMAL	t	2	\N	\N	7	\N	\N
600	95000548	Trabajador Masivo 548	NORMAL	t	1	\N	\N	5	\N	\N
601	95000549	Trabajador Masivo 549	DIET	t	4	\N	\N	7	\N	\N
602	95000550	Trabajador Masivo 550	NORMAL	t	4	\N	\N	8	\N	\N
603	95000551	Trabajador Masivo 551	NORMAL	t	1	\N	\N	8	\N	\N
604	95000552	Trabajador Masivo 552	NORMAL	t	1	\N	\N	8	\N	\N
605	95000553	Trabajador Masivo 553	NORMAL	t	3	\N	\N	6	\N	\N
606	95000554	Trabajador Masivo 554	DIET	t	2	\N	\N	8	\N	\N
607	95000555	Trabajador Masivo 555	DIET	t	1	\N	\N	6	\N	\N
608	95000556	Trabajador Masivo 556	NORMAL	t	2	\N	\N	5	\N	\N
609	95000557	Trabajador Masivo 557	NORMAL	t	1	\N	\N	8	\N	\N
610	95000558	Trabajador Masivo 558	DIET	t	3	\N	\N	7	\N	\N
611	95000559	Trabajador Masivo 559	NORMAL	t	2	\N	\N	7	\N	\N
612	95000560	Trabajador Masivo 560	NORMAL	t	3	\N	\N	5	\N	\N
613	95000561	Trabajador Masivo 561	NORMAL	t	1	\N	\N	8	\N	\N
614	95000562	Trabajador Masivo 562	NORMAL	t	3	\N	\N	5	\N	\N
615	95000563	Trabajador Masivo 563	DIET	t	3	\N	\N	5	\N	\N
616	95000564	Trabajador Masivo 564	DIET	t	1	\N	\N	8	\N	\N
617	95000565	Trabajador Masivo 565	NORMAL	t	2	\N	\N	5	\N	\N
618	95000566	Trabajador Masivo 566	DIET	t	3	\N	\N	5	\N	\N
619	95000567	Trabajador Masivo 567	NORMAL	t	3	\N	\N	8	\N	\N
620	95000568	Trabajador Masivo 568	NORMAL	t	4	\N	\N	7	\N	\N
621	95000569	Trabajador Masivo 569	NORMAL	t	1	\N	\N	8	\N	\N
622	95000570	Trabajador Masivo 570	NORMAL	t	4	\N	\N	8	\N	\N
623	95000571	Trabajador Masivo 571	NORMAL	t	1	\N	\N	7	\N	\N
624	95000572	Trabajador Masivo 572	DIET	t	2	\N	\N	6	\N	\N
625	95000573	Trabajador Masivo 573	NORMAL	t	2	\N	\N	5	\N	\N
626	95000574	Trabajador Masivo 574	NORMAL	t	2	\N	\N	5	\N	\N
627	95000575	Trabajador Masivo 575	NORMAL	t	4	\N	\N	7	\N	\N
628	95000576	Trabajador Masivo 576	DIET	t	3	\N	\N	7	\N	\N
629	95000577	Trabajador Masivo 577	NORMAL	t	1	\N	\N	8	\N	\N
630	95000578	Trabajador Masivo 578	NORMAL	t	3	\N	\N	6	\N	\N
631	95000579	Trabajador Masivo 579	NORMAL	t	1	\N	\N	7	\N	\N
632	95000580	Trabajador Masivo 580	DIET	t	2	\N	\N	7	\N	\N
633	95000581	Trabajador Masivo 581	NORMAL	t	2	\N	\N	5	\N	\N
634	95000582	Trabajador Masivo 582	NORMAL	t	3	\N	\N	6	\N	\N
635	95000583	Trabajador Masivo 583	NORMAL	t	2	\N	\N	6	\N	\N
636	95000584	Trabajador Masivo 584	NORMAL	t	1	\N	\N	8	\N	\N
637	95000585	Trabajador Masivo 585	NORMAL	t	1	\N	\N	8	\N	\N
638	95000586	Trabajador Masivo 586	NORMAL	t	2	\N	\N	5	\N	\N
639	95000587	Trabajador Masivo 587	NORMAL	t	1	\N	\N	6	\N	\N
640	95000588	Trabajador Masivo 588	NORMAL	t	4	\N	\N	5	\N	\N
641	95000589	Trabajador Masivo 589	NORMAL	t	3	\N	\N	6	\N	\N
642	95000590	Trabajador Masivo 590	NORMAL	t	4	\N	\N	7	\N	\N
643	95000591	Trabajador Masivo 591	DIET	t	3	\N	\N	8	\N	\N
644	95000592	Trabajador Masivo 592	NORMAL	t	1	\N	\N	6	\N	\N
645	95000593	Trabajador Masivo 593	NORMAL	t	1	\N	\N	5	\N	\N
646	95000594	Trabajador Masivo 594	NORMAL	t	4	\N	\N	6	\N	\N
647	95000595	Trabajador Masivo 595	NORMAL	t	2	\N	\N	7	\N	\N
648	95000596	Trabajador Masivo 596	NORMAL	t	1	\N	\N	7	\N	\N
649	95000597	Trabajador Masivo 597	NORMAL	t	3	\N	\N	8	\N	\N
650	95000598	Trabajador Masivo 598	NORMAL	t	1	\N	\N	7	\N	\N
651	95000599	Trabajador Masivo 599	NORMAL	t	2	\N	\N	8	\N	\N
652	95000600	Trabajador Masivo 600	DIET	t	1	\N	\N	6	\N	\N
653	95000601	Trabajador Masivo 601	NORMAL	t	1	\N	\N	5	\N	\N
654	95000602	Trabajador Masivo 602	NORMAL	t	3	\N	\N	6	\N	\N
655	95000603	Trabajador Masivo 603	NORMAL	t	2	\N	\N	5	\N	\N
656	95000604	Trabajador Masivo 604	DIET	t	4	\N	\N	5	\N	\N
657	95000605	Trabajador Masivo 605	NORMAL	t	4	\N	\N	5	\N	\N
658	95000606	Trabajador Masivo 606	NORMAL	t	1	\N	\N	8	\N	\N
659	95000607	Trabajador Masivo 607	DIET	t	3	\N	\N	8	\N	\N
660	95000608	Trabajador Masivo 608	NORMAL	t	4	\N	\N	8	\N	\N
661	95000609	Trabajador Masivo 609	NORMAL	t	2	\N	\N	8	\N	\N
662	95000610	Trabajador Masivo 610	DIET	t	3	\N	\N	5	\N	\N
663	95000611	Trabajador Masivo 611	NORMAL	t	4	\N	\N	5	\N	\N
664	95000612	Trabajador Masivo 612	NORMAL	t	4	\N	\N	8	\N	\N
665	95000613	Trabajador Masivo 613	NORMAL	t	3	\N	\N	6	\N	\N
666	95000614	Trabajador Masivo 614	DIET	t	1	\N	\N	8	\N	\N
667	95000615	Trabajador Masivo 615	NORMAL	t	4	\N	\N	5	\N	\N
668	95000616	Trabajador Masivo 616	NORMAL	t	4	\N	\N	7	\N	\N
669	95000617	Trabajador Masivo 617	DIET	t	4	\N	\N	6	\N	\N
670	95000618	Trabajador Masivo 618	NORMAL	t	2	\N	\N	7	\N	\N
671	95000619	Trabajador Masivo 619	DIET	t	3	\N	\N	5	\N	\N
672	95000620	Trabajador Masivo 620	NORMAL	t	1	\N	\N	6	\N	\N
673	95000621	Trabajador Masivo 621	NORMAL	t	1	\N	\N	6	\N	\N
674	95000622	Trabajador Masivo 622	NORMAL	t	2	\N	\N	6	\N	\N
675	95000623	Trabajador Masivo 623	NORMAL	t	1	\N	\N	7	\N	\N
676	95000624	Trabajador Masivo 624	NORMAL	t	4	\N	\N	5	\N	\N
677	95000625	Trabajador Masivo 625	NORMAL	t	4	\N	\N	8	\N	\N
678	95000626	Trabajador Masivo 626	NORMAL	t	4	\N	\N	7	\N	\N
679	95000627	Trabajador Masivo 627	NORMAL	t	3	\N	\N	5	\N	\N
680	95000628	Trabajador Masivo 628	NORMAL	t	3	\N	\N	5	\N	\N
681	95000629	Trabajador Masivo 629	NORMAL	t	4	\N	\N	8	\N	\N
682	95000630	Trabajador Masivo 630	NORMAL	t	3	\N	\N	5	\N	\N
683	95000631	Trabajador Masivo 631	NORMAL	t	3	\N	\N	8	\N	\N
684	95000632	Trabajador Masivo 632	NORMAL	t	1	\N	\N	6	\N	\N
685	95000633	Trabajador Masivo 633	NORMAL	t	2	\N	\N	6	\N	\N
686	95000634	Trabajador Masivo 634	NORMAL	t	1	\N	\N	6	\N	\N
687	95000635	Trabajador Masivo 635	NORMAL	t	1	\N	\N	6	\N	\N
688	95000636	Trabajador Masivo 636	NORMAL	t	1	\N	\N	7	\N	\N
689	95000637	Trabajador Masivo 637	NORMAL	t	4	\N	\N	5	\N	\N
690	95000638	Trabajador Masivo 638	NORMAL	t	4	\N	\N	7	\N	\N
691	95000639	Trabajador Masivo 639	NORMAL	t	3	\N	\N	5	\N	\N
692	95000640	Trabajador Masivo 640	NORMAL	t	3	\N	\N	5	\N	\N
693	95000641	Trabajador Masivo 641	DIET	t	4	\N	\N	6	\N	\N
694	95000642	Trabajador Masivo 642	DIET	t	1	\N	\N	8	\N	\N
695	95000643	Trabajador Masivo 643	NORMAL	t	1	\N	\N	5	\N	\N
696	95000644	Trabajador Masivo 644	NORMAL	t	4	\N	\N	7	\N	\N
697	95000645	Trabajador Masivo 645	NORMAL	t	1	\N	\N	7	\N	\N
698	95000646	Trabajador Masivo 646	NORMAL	t	3	\N	\N	6	\N	\N
699	95000647	Trabajador Masivo 647	NORMAL	t	1	\N	\N	6	\N	\N
700	95000648	Trabajador Masivo 648	NORMAL	t	3	\N	\N	6	\N	\N
701	95000649	Trabajador Masivo 649	NORMAL	t	4	\N	\N	8	\N	\N
702	95000650	Trabajador Masivo 650	DIET	t	1	\N	\N	6	\N	\N
703	95000651	Trabajador Masivo 651	NORMAL	t	3	\N	\N	6	\N	\N
704	95000652	Trabajador Masivo 652	NORMAL	t	2	\N	\N	5	\N	\N
705	95000653	Trabajador Masivo 653	NORMAL	t	2	\N	\N	8	\N	\N
706	95000654	Trabajador Masivo 654	NORMAL	t	4	\N	\N	5	\N	\N
707	95000655	Trabajador Masivo 655	NORMAL	t	3	\N	\N	6	\N	\N
708	95000656	Trabajador Masivo 656	NORMAL	t	1	\N	\N	7	\N	\N
709	95000657	Trabajador Masivo 657	NORMAL	t	2	\N	\N	5	\N	\N
710	95000658	Trabajador Masivo 658	DIET	t	4	\N	\N	7	\N	\N
711	95000659	Trabajador Masivo 659	NORMAL	t	2	\N	\N	7	\N	\N
712	95000660	Trabajador Masivo 660	NORMAL	t	4	\N	\N	7	\N	\N
713	95000661	Trabajador Masivo 661	NORMAL	t	2	\N	\N	7	\N	\N
714	95000662	Trabajador Masivo 662	NORMAL	t	1	\N	\N	8	\N	\N
715	95000663	Trabajador Masivo 663	DIET	t	3	\N	\N	7	\N	\N
716	95000664	Trabajador Masivo 664	NORMAL	t	3	\N	\N	8	\N	\N
717	95000665	Trabajador Masivo 665	NORMAL	t	3	\N	\N	8	\N	\N
718	95000666	Trabajador Masivo 666	NORMAL	t	3	\N	\N	7	\N	\N
719	95000667	Trabajador Masivo 667	NORMAL	t	1	\N	\N	5	\N	\N
720	95000668	Trabajador Masivo 668	NORMAL	t	2	\N	\N	6	\N	\N
721	95000669	Trabajador Masivo 669	DIET	t	4	\N	\N	7	\N	\N
722	95000670	Trabajador Masivo 670	NORMAL	t	1	\N	\N	5	\N	\N
723	95000671	Trabajador Masivo 671	NORMAL	t	4	\N	\N	5	\N	\N
724	95000672	Trabajador Masivo 672	DIET	t	1	\N	\N	6	\N	\N
725	95000673	Trabajador Masivo 673	NORMAL	t	4	\N	\N	7	\N	\N
726	95000674	Trabajador Masivo 674	NORMAL	t	3	\N	\N	6	\N	\N
727	95000675	Trabajador Masivo 675	NORMAL	t	3	\N	\N	5	\N	\N
728	95000676	Trabajador Masivo 676	NORMAL	t	3	\N	\N	6	\N	\N
729	95000677	Trabajador Masivo 677	NORMAL	t	1	\N	\N	8	\N	\N
730	95000678	Trabajador Masivo 678	NORMAL	t	2	\N	\N	8	\N	\N
731	95000679	Trabajador Masivo 679	NORMAL	t	2	\N	\N	6	\N	\N
732	95000680	Trabajador Masivo 680	NORMAL	t	3	\N	\N	6	\N	\N
733	95000681	Trabajador Masivo 681	DIET	t	1	\N	\N	5	\N	\N
734	95000682	Trabajador Masivo 682	NORMAL	t	4	\N	\N	7	\N	\N
735	95000683	Trabajador Masivo 683	NORMAL	t	3	\N	\N	7	\N	\N
736	95000684	Trabajador Masivo 684	NORMAL	t	2	\N	\N	6	\N	\N
737	95000685	Trabajador Masivo 685	NORMAL	t	4	\N	\N	7	\N	\N
738	95000686	Trabajador Masivo 686	NORMAL	t	4	\N	\N	6	\N	\N
739	95000687	Trabajador Masivo 687	NORMAL	t	2	\N	\N	7	\N	\N
740	95000688	Trabajador Masivo 688	NORMAL	t	2	\N	\N	5	\N	\N
741	95000689	Trabajador Masivo 689	DIET	t	2	\N	\N	7	\N	\N
742	95000690	Trabajador Masivo 690	NORMAL	t	3	\N	\N	8	\N	\N
743	95000691	Trabajador Masivo 691	NORMAL	t	2	\N	\N	5	\N	\N
744	95000692	Trabajador Masivo 692	DIET	t	3	\N	\N	6	\N	\N
745	95000693	Trabajador Masivo 693	DIET	t	2	\N	\N	7	\N	\N
746	95000694	Trabajador Masivo 694	NORMAL	t	2	\N	\N	5	\N	\N
747	95000695	Trabajador Masivo 695	NORMAL	t	4	\N	\N	6	\N	\N
748	95000696	Trabajador Masivo 696	NORMAL	t	2	\N	\N	6	\N	\N
749	95000697	Trabajador Masivo 697	NORMAL	t	4	\N	\N	5	\N	\N
750	95000698	Trabajador Masivo 698	NORMAL	t	1	\N	\N	5	\N	\N
751	95000699	Trabajador Masivo 699	NORMAL	t	4	\N	\N	5	\N	\N
752	95000700	Trabajador Masivo 700	DIET	t	3	\N	\N	5	\N	\N
753	95000701	Trabajador Masivo 701	DIET	t	3	\N	\N	7	\N	\N
754	95000702	Trabajador Masivo 702	NORMAL	t	2	\N	\N	8	\N	\N
755	95000703	Trabajador Masivo 703	DIET	t	2	\N	\N	7	\N	\N
756	95000704	Trabajador Masivo 704	NORMAL	t	1	\N	\N	7	\N	\N
757	95000705	Trabajador Masivo 705	NORMAL	t	3	\N	\N	8	\N	\N
758	95000706	Trabajador Masivo 706	NORMAL	t	2	\N	\N	8	\N	\N
759	95000707	Trabajador Masivo 707	DIET	t	3	\N	\N	5	\N	\N
760	95000708	Trabajador Masivo 708	NORMAL	t	1	\N	\N	8	\N	\N
761	95000709	Trabajador Masivo 709	NORMAL	t	1	\N	\N	6	\N	\N
762	95000710	Trabajador Masivo 710	NORMAL	t	3	\N	\N	5	\N	\N
763	95000711	Trabajador Masivo 711	NORMAL	t	4	\N	\N	5	\N	\N
764	95000712	Trabajador Masivo 712	DIET	t	2	\N	\N	7	\N	\N
765	95000713	Trabajador Masivo 713	NORMAL	t	4	\N	\N	8	\N	\N
766	95000714	Trabajador Masivo 714	NORMAL	t	2	\N	\N	5	\N	\N
767	95000715	Trabajador Masivo 715	NORMAL	t	2	\N	\N	8	\N	\N
768	95000716	Trabajador Masivo 716	NORMAL	t	3	\N	\N	6	\N	\N
769	95000717	Trabajador Masivo 717	DIET	t	1	\N	\N	7	\N	\N
770	95000718	Trabajador Masivo 718	DIET	t	1	\N	\N	7	\N	\N
771	95000719	Trabajador Masivo 719	NORMAL	t	3	\N	\N	8	\N	\N
772	95000720	Trabajador Masivo 720	DIET	t	1	\N	\N	7	\N	\N
773	95000721	Trabajador Masivo 721	NORMAL	t	2	\N	\N	5	\N	\N
774	95000722	Trabajador Masivo 722	NORMAL	t	3	\N	\N	7	\N	\N
775	95000723	Trabajador Masivo 723	NORMAL	t	3	\N	\N	7	\N	\N
776	95000724	Trabajador Masivo 724	NORMAL	t	1	\N	\N	8	\N	\N
777	95000725	Trabajador Masivo 725	DIET	t	4	\N	\N	6	\N	\N
778	95000726	Trabajador Masivo 726	NORMAL	t	1	\N	\N	7	\N	\N
779	95000727	Trabajador Masivo 727	NORMAL	t	1	\N	\N	7	\N	\N
780	95000728	Trabajador Masivo 728	NORMAL	t	4	\N	\N	7	\N	\N
781	95000729	Trabajador Masivo 729	NORMAL	t	2	\N	\N	7	\N	\N
782	95000730	Trabajador Masivo 730	NORMAL	t	4	\N	\N	5	\N	\N
783	95000731	Trabajador Masivo 731	NORMAL	t	2	\N	\N	6	\N	\N
784	95000732	Trabajador Masivo 732	NORMAL	t	4	\N	\N	5	\N	\N
785	95000733	Trabajador Masivo 733	NORMAL	t	2	\N	\N	8	\N	\N
786	95000734	Trabajador Masivo 734	NORMAL	t	3	\N	\N	5	\N	\N
787	95000735	Trabajador Masivo 735	DIET	t	2	\N	\N	5	\N	\N
788	95000736	Trabajador Masivo 736	NORMAL	t	2	\N	\N	8	\N	\N
789	95000737	Trabajador Masivo 737	NORMAL	t	4	\N	\N	5	\N	\N
790	95000738	Trabajador Masivo 738	NORMAL	t	3	\N	\N	6	\N	\N
791	95000739	Trabajador Masivo 739	NORMAL	t	2	\N	\N	7	\N	\N
792	95000740	Trabajador Masivo 740	NORMAL	t	4	\N	\N	6	\N	\N
793	95000741	Trabajador Masivo 741	NORMAL	t	2	\N	\N	5	\N	\N
794	95000742	Trabajador Masivo 742	NORMAL	t	3	\N	\N	5	\N	\N
795	95000743	Trabajador Masivo 743	NORMAL	t	1	\N	\N	5	\N	\N
796	95000744	Trabajador Masivo 744	NORMAL	t	4	\N	\N	5	\N	\N
797	95000745	Trabajador Masivo 745	NORMAL	t	4	\N	\N	5	\N	\N
798	95000746	Trabajador Masivo 746	NORMAL	t	4	\N	\N	6	\N	\N
799	95000747	Trabajador Masivo 747	NORMAL	t	1	\N	\N	8	\N	\N
800	95000748	Trabajador Masivo 748	NORMAL	t	4	\N	\N	7	\N	\N
801	95000749	Trabajador Masivo 749	NORMAL	t	2	\N	\N	5	\N	\N
802	95000750	Trabajador Masivo 750	NORMAL	t	1	\N	\N	5	\N	\N
803	95000751	Trabajador Masivo 751	NORMAL	t	3	\N	\N	7	\N	\N
804	95000752	Trabajador Masivo 752	NORMAL	t	2	\N	\N	5	\N	\N
805	95000753	Trabajador Masivo 753	DIET	t	2	\N	\N	6	\N	\N
806	95000754	Trabajador Masivo 754	NORMAL	t	4	\N	\N	7	\N	\N
807	95000755	Trabajador Masivo 755	NORMAL	t	1	\N	\N	8	\N	\N
808	95000756	Trabajador Masivo 756	NORMAL	t	1	\N	\N	6	\N	\N
809	95000757	Trabajador Masivo 757	NORMAL	t	3	\N	\N	8	\N	\N
810	95000758	Trabajador Masivo 758	NORMAL	t	3	\N	\N	5	\N	\N
811	95000759	Trabajador Masivo 759	NORMAL	t	2	\N	\N	6	\N	\N
812	95000760	Trabajador Masivo 760	NORMAL	t	1	\N	\N	6	\N	\N
813	95000761	Trabajador Masivo 761	NORMAL	t	2	\N	\N	5	\N	\N
814	95000762	Trabajador Masivo 762	NORMAL	t	1	\N	\N	5	\N	\N
815	95000763	Trabajador Masivo 763	NORMAL	t	4	\N	\N	5	\N	\N
816	95000764	Trabajador Masivo 764	NORMAL	t	3	\N	\N	6	\N	\N
817	95000765	Trabajador Masivo 765	DIET	t	4	\N	\N	5	\N	\N
818	95000766	Trabajador Masivo 766	NORMAL	t	3	\N	\N	5	\N	\N
819	95000767	Trabajador Masivo 767	NORMAL	t	3	\N	\N	5	\N	\N
820	95000768	Trabajador Masivo 768	NORMAL	t	1	\N	\N	7	\N	\N
821	95000769	Trabajador Masivo 769	NORMAL	t	2	\N	\N	6	\N	\N
822	95000770	Trabajador Masivo 770	NORMAL	t	1	\N	\N	6	\N	\N
823	95000771	Trabajador Masivo 771	NORMAL	t	3	\N	\N	6	\N	\N
824	95000772	Trabajador Masivo 772	NORMAL	t	4	\N	\N	8	\N	\N
825	95000773	Trabajador Masivo 773	NORMAL	t	4	\N	\N	5	\N	\N
826	95000774	Trabajador Masivo 774	NORMAL	t	4	\N	\N	8	\N	\N
827	95000775	Trabajador Masivo 775	NORMAL	t	3	\N	\N	7	\N	\N
828	95000776	Trabajador Masivo 776	DIET	t	3	\N	\N	8	\N	\N
829	95000777	Trabajador Masivo 777	DIET	t	4	\N	\N	7	\N	\N
830	95000778	Trabajador Masivo 778	NORMAL	t	4	\N	\N	7	\N	\N
831	95000779	Trabajador Masivo 779	NORMAL	t	4	\N	\N	7	\N	\N
832	95000780	Trabajador Masivo 780	NORMAL	t	1	\N	\N	8	\N	\N
833	95000781	Trabajador Masivo 781	NORMAL	t	2	\N	\N	8	\N	\N
834	95000782	Trabajador Masivo 782	DIET	t	2	\N	\N	5	\N	\N
835	95000783	Trabajador Masivo 783	DIET	t	1	\N	\N	5	\N	\N
836	95000784	Trabajador Masivo 784	NORMAL	t	3	\N	\N	7	\N	\N
837	95000785	Trabajador Masivo 785	NORMAL	t	4	\N	\N	8	\N	\N
838	95000786	Trabajador Masivo 786	NORMAL	t	2	\N	\N	6	\N	\N
839	95000787	Trabajador Masivo 787	NORMAL	t	1	\N	\N	5	\N	\N
840	95000788	Trabajador Masivo 788	DIET	t	3	\N	\N	5	\N	\N
841	95000789	Trabajador Masivo 789	DIET	t	3	\N	\N	6	\N	\N
842	95000790	Trabajador Masivo 790	NORMAL	t	4	\N	\N	5	\N	\N
843	95000791	Trabajador Masivo 791	DIET	t	3	\N	\N	8	\N	\N
844	95000792	Trabajador Masivo 792	NORMAL	t	4	\N	\N	7	\N	\N
845	95000793	Trabajador Masivo 793	NORMAL	t	2	\N	\N	6	\N	\N
846	95000794	Trabajador Masivo 794	NORMAL	t	4	\N	\N	7	\N	\N
847	95000795	Trabajador Masivo 795	NORMAL	t	1	\N	\N	5	\N	\N
848	95000796	Trabajador Masivo 796	DIET	t	2	\N	\N	7	\N	\N
849	95000797	Trabajador Masivo 797	NORMAL	t	4	\N	\N	7	\N	\N
850	95000798	Trabajador Masivo 798	NORMAL	t	1	\N	\N	7	\N	\N
851	95000799	Trabajador Masivo 799	NORMAL	t	3	\N	\N	5	\N	\N
852	95000800	Trabajador Masivo 800	NORMAL	t	1	\N	\N	8	\N	\N
853	95000801	Trabajador Masivo 801	NORMAL	t	1	\N	\N	5	\N	\N
854	95000802	Trabajador Masivo 802	NORMAL	t	2	\N	\N	6	\N	\N
855	95000803	Trabajador Masivo 803	DIET	t	2	\N	\N	8	\N	\N
856	95000804	Trabajador Masivo 804	NORMAL	t	4	\N	\N	8	\N	\N
857	95000805	Trabajador Masivo 805	NORMAL	t	1	\N	\N	7	\N	\N
858	95000806	Trabajador Masivo 806	NORMAL	t	4	\N	\N	7	\N	\N
859	95000807	Trabajador Masivo 807	NORMAL	t	2	\N	\N	5	\N	\N
860	95000808	Trabajador Masivo 808	NORMAL	t	1	\N	\N	6	\N	\N
861	95000809	Trabajador Masivo 809	NORMAL	t	3	\N	\N	8	\N	\N
862	95000810	Trabajador Masivo 810	NORMAL	t	4	\N	\N	6	\N	\N
863	95000811	Trabajador Masivo 811	NORMAL	t	3	\N	\N	8	\N	\N
864	95000812	Trabajador Masivo 812	NORMAL	t	3	\N	\N	5	\N	\N
865	95000813	Trabajador Masivo 813	NORMAL	t	1	\N	\N	5	\N	\N
866	95000814	Trabajador Masivo 814	DIET	t	4	\N	\N	6	\N	\N
867	95000815	Trabajador Masivo 815	DIET	t	2	\N	\N	7	\N	\N
868	95000816	Trabajador Masivo 816	DIET	t	4	\N	\N	6	\N	\N
869	95000817	Trabajador Masivo 817	NORMAL	t	2	\N	\N	7	\N	\N
870	95000818	Trabajador Masivo 818	NORMAL	t	4	\N	\N	6	\N	\N
871	95000819	Trabajador Masivo 819	DIET	t	4	\N	\N	8	\N	\N
872	95000820	Trabajador Masivo 820	DIET	t	4	\N	\N	8	\N	\N
873	95000821	Trabajador Masivo 821	NORMAL	t	2	\N	\N	8	\N	\N
874	95000822	Trabajador Masivo 822	NORMAL	t	4	\N	\N	8	\N	\N
875	95000823	Trabajador Masivo 823	DIET	t	3	\N	\N	8	\N	\N
876	95000824	Trabajador Masivo 824	NORMAL	t	1	\N	\N	7	\N	\N
877	95000825	Trabajador Masivo 825	NORMAL	t	2	\N	\N	5	\N	\N
878	95000826	Trabajador Masivo 826	NORMAL	t	1	\N	\N	7	\N	\N
879	95000827	Trabajador Masivo 827	NORMAL	t	4	\N	\N	6	\N	\N
880	95000828	Trabajador Masivo 828	NORMAL	t	1	\N	\N	6	\N	\N
881	95000829	Trabajador Masivo 829	NORMAL	t	4	\N	\N	7	\N	\N
882	95000830	Trabajador Masivo 830	NORMAL	t	3	\N	\N	7	\N	\N
883	95000831	Trabajador Masivo 831	NORMAL	t	2	\N	\N	6	\N	\N
884	95000832	Trabajador Masivo 832	NORMAL	t	2	\N	\N	8	\N	\N
885	95000833	Trabajador Masivo 833	NORMAL	t	1	\N	\N	8	\N	\N
886	95000834	Trabajador Masivo 834	NORMAL	t	2	\N	\N	6	\N	\N
887	95000835	Trabajador Masivo 835	NORMAL	t	2	\N	\N	7	\N	\N
888	95000836	Trabajador Masivo 836	NORMAL	t	4	\N	\N	7	\N	\N
889	95000837	Trabajador Masivo 837	NORMAL	t	4	\N	\N	6	\N	\N
890	95000838	Trabajador Masivo 838	NORMAL	t	1	\N	\N	7	\N	\N
891	95000839	Trabajador Masivo 839	NORMAL	t	3	\N	\N	8	\N	\N
892	95000840	Trabajador Masivo 840	NORMAL	t	4	\N	\N	8	\N	\N
893	95000841	Trabajador Masivo 841	NORMAL	t	2	\N	\N	5	\N	\N
894	95000842	Trabajador Masivo 842	NORMAL	t	3	\N	\N	7	\N	\N
895	95000843	Trabajador Masivo 843	NORMAL	t	1	\N	\N	6	\N	\N
896	95000844	Trabajador Masivo 844	NORMAL	t	1	\N	\N	8	\N	\N
897	95000845	Trabajador Masivo 845	NORMAL	t	2	\N	\N	7	\N	\N
898	95000846	Trabajador Masivo 846	DIET	t	4	\N	\N	8	\N	\N
899	95000847	Trabajador Masivo 847	NORMAL	t	3	\N	\N	7	\N	\N
900	95000848	Trabajador Masivo 848	NORMAL	t	1	\N	\N	6	\N	\N
901	95000849	Trabajador Masivo 849	NORMAL	t	1	\N	\N	6	\N	\N
902	95000850	Trabajador Masivo 850	NORMAL	t	2	\N	\N	6	\N	\N
903	95000851	Trabajador Masivo 851	NORMAL	t	4	\N	\N	8	\N	\N
904	95000852	Trabajador Masivo 852	NORMAL	t	3	\N	\N	6	\N	\N
905	95000853	Trabajador Masivo 853	NORMAL	t	3	\N	\N	6	\N	\N
906	95000854	Trabajador Masivo 854	NORMAL	t	1	\N	\N	5	\N	\N
907	95000855	Trabajador Masivo 855	NORMAL	t	1	\N	\N	6	\N	\N
908	95000856	Trabajador Masivo 856	NORMAL	t	2	\N	\N	7	\N	\N
909	95000857	Trabajador Masivo 857	NORMAL	t	3	\N	\N	8	\N	\N
910	95000858	Trabajador Masivo 858	NORMAL	t	2	\N	\N	7	\N	\N
911	95000859	Trabajador Masivo 859	NORMAL	t	4	\N	\N	5	\N	\N
912	95000860	Trabajador Masivo 860	NORMAL	t	4	\N	\N	5	\N	\N
913	95000861	Trabajador Masivo 861	NORMAL	t	4	\N	\N	6	\N	\N
914	95000862	Trabajador Masivo 862	NORMAL	t	1	\N	\N	5	\N	\N
915	95000863	Trabajador Masivo 863	NORMAL	t	3	\N	\N	7	\N	\N
916	95000864	Trabajador Masivo 864	NORMAL	t	1	\N	\N	7	\N	\N
917	95000865	Trabajador Masivo 865	NORMAL	t	1	\N	\N	6	\N	\N
918	95000866	Trabajador Masivo 866	NORMAL	t	4	\N	\N	5	\N	\N
919	95000867	Trabajador Masivo 867	DIET	t	1	\N	\N	8	\N	\N
920	95000868	Trabajador Masivo 868	NORMAL	t	4	\N	\N	5	\N	\N
921	95000869	Trabajador Masivo 869	NORMAL	t	1	\N	\N	6	\N	\N
922	95000870	Trabajador Masivo 870	NORMAL	t	3	\N	\N	8	\N	\N
923	95000871	Trabajador Masivo 871	NORMAL	t	1	\N	\N	8	\N	\N
924	95000872	Trabajador Masivo 872	NORMAL	t	4	\N	\N	7	\N	\N
925	95000873	Trabajador Masivo 873	NORMAL	t	1	\N	\N	7	\N	\N
926	95000874	Trabajador Masivo 874	DIET	t	4	\N	\N	5	\N	\N
927	95000875	Trabajador Masivo 875	NORMAL	t	4	\N	\N	6	\N	\N
928	95000876	Trabajador Masivo 876	DIET	t	2	\N	\N	8	\N	\N
929	95000877	Trabajador Masivo 877	DIET	t	2	\N	\N	7	\N	\N
930	95000878	Trabajador Masivo 878	NORMAL	t	2	\N	\N	7	\N	\N
931	95000879	Trabajador Masivo 879	NORMAL	t	1	\N	\N	7	\N	\N
932	95000880	Trabajador Masivo 880	NORMAL	t	1	\N	\N	7	\N	\N
933	95000881	Trabajador Masivo 881	NORMAL	t	4	\N	\N	5	\N	\N
934	95000882	Trabajador Masivo 882	NORMAL	t	4	\N	\N	6	\N	\N
935	95000883	Trabajador Masivo 883	NORMAL	t	1	\N	\N	8	\N	\N
936	95000884	Trabajador Masivo 884	NORMAL	t	2	\N	\N	6	\N	\N
937	95000885	Trabajador Masivo 885	NORMAL	t	1	\N	\N	5	\N	\N
938	95000886	Trabajador Masivo 886	DIET	t	2	\N	\N	7	\N	\N
939	95000887	Trabajador Masivo 887	NORMAL	t	2	\N	\N	5	\N	\N
940	95000888	Trabajador Masivo 888	NORMAL	t	1	\N	\N	6	\N	\N
941	95000889	Trabajador Masivo 889	NORMAL	t	1	\N	\N	7	\N	\N
942	95000890	Trabajador Masivo 890	NORMAL	t	4	\N	\N	6	\N	\N
943	95000891	Trabajador Masivo 891	NORMAL	t	4	\N	\N	8	\N	\N
944	95000892	Trabajador Masivo 892	DIET	t	2	\N	\N	8	\N	\N
945	95000893	Trabajador Masivo 893	DIET	t	4	\N	\N	5	\N	\N
946	95000894	Trabajador Masivo 894	NORMAL	t	3	\N	\N	8	\N	\N
947	95000895	Trabajador Masivo 895	NORMAL	t	3	\N	\N	5	\N	\N
948	95000896	Trabajador Masivo 896	NORMAL	t	1	\N	\N	7	\N	\N
949	95000897	Trabajador Masivo 897	DIET	t	4	\N	\N	6	\N	\N
950	95000898	Trabajador Masivo 898	NORMAL	t	3	\N	\N	7	\N	\N
951	95000899	Trabajador Masivo 899	DIET	t	3	\N	\N	8	\N	\N
952	95000900	Trabajador Masivo 900	NORMAL	t	4	\N	\N	7	\N	\N
953	95000901	Trabajador Masivo 901	NORMAL	t	2	\N	\N	6	\N	\N
954	95000902	Trabajador Masivo 902	NORMAL	t	4	\N	\N	7	\N	\N
955	95000903	Trabajador Masivo 903	NORMAL	t	3	\N	\N	7	\N	\N
956	95000904	Trabajador Masivo 904	NORMAL	t	2	\N	\N	6	\N	\N
957	95000905	Trabajador Masivo 905	NORMAL	t	2	\N	\N	6	\N	\N
958	95000906	Trabajador Masivo 906	DIET	t	1	\N	\N	6	\N	\N
959	95000907	Trabajador Masivo 907	NORMAL	t	1	\N	\N	8	\N	\N
960	95000908	Trabajador Masivo 908	NORMAL	t	1	\N	\N	8	\N	\N
961	95000909	Trabajador Masivo 909	NORMAL	t	4	\N	\N	6	\N	\N
962	95000910	Trabajador Masivo 910	DIET	t	1	\N	\N	8	\N	\N
963	95000911	Trabajador Masivo 911	DIET	t	1	\N	\N	7	\N	\N
964	95000912	Trabajador Masivo 912	NORMAL	t	3	\N	\N	8	\N	\N
965	95000913	Trabajador Masivo 913	NORMAL	t	1	\N	\N	7	\N	\N
966	95000914	Trabajador Masivo 914	NORMAL	t	4	\N	\N	5	\N	\N
967	95000915	Trabajador Masivo 915	NORMAL	t	4	\N	\N	6	\N	\N
968	95000916	Trabajador Masivo 916	NORMAL	t	1	\N	\N	7	\N	\N
969	95000917	Trabajador Masivo 917	NORMAL	t	4	\N	\N	6	\N	\N
970	95000918	Trabajador Masivo 918	NORMAL	t	4	\N	\N	7	\N	\N
971	95000919	Trabajador Masivo 919	NORMAL	t	2	\N	\N	6	\N	\N
972	95000920	Trabajador Masivo 920	NORMAL	t	2	\N	\N	8	\N	\N
973	95000921	Trabajador Masivo 921	NORMAL	t	3	\N	\N	5	\N	\N
974	95000922	Trabajador Masivo 922	NORMAL	t	1	\N	\N	7	\N	\N
975	95000923	Trabajador Masivo 923	NORMAL	t	4	\N	\N	5	\N	\N
976	95000924	Trabajador Masivo 924	DIET	t	2	\N	\N	7	\N	\N
977	95000925	Trabajador Masivo 925	NORMAL	t	1	\N	\N	7	\N	\N
978	95000926	Trabajador Masivo 926	NORMAL	t	4	\N	\N	5	\N	\N
979	95000927	Trabajador Masivo 927	NORMAL	t	3	\N	\N	5	\N	\N
980	95000928	Trabajador Masivo 928	NORMAL	t	1	\N	\N	6	\N	\N
981	95000929	Trabajador Masivo 929	NORMAL	t	1	\N	\N	6	\N	\N
982	95000930	Trabajador Masivo 930	NORMAL	t	2	\N	\N	5	\N	\N
983	95000931	Trabajador Masivo 931	NORMAL	t	2	\N	\N	8	\N	\N
984	95000932	Trabajador Masivo 932	NORMAL	t	1	\N	\N	5	\N	\N
985	95000933	Trabajador Masivo 933	NORMAL	t	3	\N	\N	8	\N	\N
986	95000934	Trabajador Masivo 934	NORMAL	t	2	\N	\N	8	\N	\N
987	95000935	Trabajador Masivo 935	NORMAL	t	4	\N	\N	7	\N	\N
989	95000937	Trabajador Masivo 937	NORMAL	t	4	\N	\N	6	\N	\N
990	95000938	Trabajador Masivo 938	NORMAL	t	1	\N	\N	5	\N	\N
991	95000939	Trabajador Masivo 939	NORMAL	t	4	\N	\N	7	\N	\N
992	95000940	Trabajador Masivo 940	NORMAL	t	1	\N	\N	7	\N	\N
993	95000941	Trabajador Masivo 941	DIET	t	3	\N	\N	7	\N	\N
994	95000942	Trabajador Masivo 942	NORMAL	t	4	\N	\N	8	\N	\N
995	95000943	Trabajador Masivo 943	NORMAL	t	4	\N	\N	5	\N	\N
996	95000944	Trabajador Masivo 944	NORMAL	t	4	\N	\N	8	\N	\N
997	95000945	Trabajador Masivo 945	NORMAL	t	1	\N	\N	8	\N	\N
998	95000946	Trabajador Masivo 946	DIET	t	4	\N	\N	7	\N	\N
999	95000947	Trabajador Masivo 947	NORMAL	t	2	\N	\N	5	\N	\N
1000	95000948	Trabajador Masivo 948	DIET	t	2	\N	\N	6	\N	\N
307	95000255	Trabajador Masivo 255	DIET	t	4	\N	\N	5	\N	\N
1003	14073921	LEONARDO ESPINA	NORMAL	t	4	\N	\N	5	5	\N
1001	95000949	Trabajador Masivo 949	DIETA	t	4	\N	\N	7	2	\N
163	95000111	Trabajador Masivo 111	DIETA	t	3	\N	\N	5	2	\N
1004	12345678	LEONARDO ESPINA	NORMAL	t	4	\N	\N	5	3	\N
1005	18073921	LEONARDO ESPINA	DIETA	t	1	\N	\N	5	2	4
1006	17073921	PEDRO LUIS	NORMAL	t	1	\N	\N	5	2	4
1007	20073921	LUIS GONZALEZ	NORMAL	t	1	\N	\N	5	2	4
1008	21236154	RENE DURAN	NORMAL	t	1	\N	\N	6	2	4
988	95000936	Trabajador Masivo 936	NORMAL	t	4	\N	\N	7	2	4
1002	95000950	Trabajador Masivo 950	NORMAL	f	4	\N	\N	8	2	\N
\.


--
-- Data for Name: dining_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dining_rooms (id, name, active, warehouse_id) FROM stdin;
2	SUBTERRANEO MINA	t	2
3	COMEDOR PLANTA	t	3
1	COMEDOR MSB	t	2
4	COMEDOR CAMORRA	t	3
6	Comedor MSB	t	5
\.


--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.institutions (id, name, type, description, active, created_at, updated_at) FROM stdin;
2	SEBIN	Otra	SEGURIDAD	t	2026-06-22 19:46:57.471	2026-06-22 19:46:57.471
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.modules (id, name, code) FROM stdin;
1	Catálogo de Productos	PRODUCTS
3	Categorías de Productos	CATEGORIES
4	Unidades de Medida	UNITS
5	Gestión de Almacenes	WAREHOUSES
6	Seguridad y Accesos	SECURITY
12	Recepciones y Compras	RECEPTIONS
13	Transferencias	TRANSFERS
14	Operación Diaria y Consumos	OPERATIONS
179	Reporte: Dashboard Principal	REPORT_DASHBOARD
180	Reporte: Valor del Inventario	REPORT_VALUE
181	Reporte: Alertas de Stop	REPORT_ALERTS
182	Reporte: Mínimos y Máximos	REPORT_MINMAX
183	Reporte: Consumos y Mermas	REPORT_CONSUMPTIONS
184	Reporte: Apoyos Institucionales	REPORT_INSTITUTIONS
185	Reporte: Historial de Turnos	REPORT_SHIFTS
29	Catálogo de Cargos	POSITIONS
18	Directorio de Comensales	DINERS
42	Despacho Rápido	DISPATCH
55	Gestión Biométrica	BIOMETRIC
16	Estructura Organizacional	DEPENDENCIES
17	Catálogo de Cuadrillas	SQUADS
221	Mis Cuadrillas (Local)	MY_SQUADS
19	Solicitud de Comidas	DINERS_REQUESTS
85	Gestión de Comedores	DINING_ROOMS
103	Catálogo de Proveedores	SUPPLIERS
104	Instituciones (Apoyos)	INSTITUTIONS
105	Auditoría del Sistema	AUDIT
126	Acceso Global sin Restricciones	GLOBAL_ACCESS
169	Firma: Aprobar Recepciones	APPROVAL_RECEPTIONS
170	Firma: Aprobar Despachos	APPROVAL_TRANSFERS
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, is_read, link, created_at) FROM stdin;
134	1	Aprobación Requerida	La transacción #47 requiere tu aprobación.	f	/inventory/approvals	2026-06-29 14:40:47.194
135	18	Aprobado	Tu solicitud #47 ha sido aprobada.	f	/kitchen/operation	2026-06-29 14:41:05.241
136	1	Aprobación Requerida	La transacción #48 requiere tu aprobación.	f	/inventory/approvals	2026-06-29 15:55:02.045
137	1	Alerta de Stock Crítico	El producto ACEITE COPOSA 850ML X12 (E ) en ALMACEN MINA SIMON BOLIVAR cayó a 0 (Mínimo: 0).	f	/inventory/products	2026-06-29 15:56:38.641
138	19	Alerta de Stock Crítico	El producto ACEITE COPOSA 850ML X12 (E ) en ALMACEN MINA SIMON BOLIVAR cayó a 0 (Mínimo: 0).	f	/inventory/products	2026-06-29 15:56:38.656
139	1	Alerta de Stock Crítico	El producto ACEITE EL REY 18LT ( E ) en ALMACEN MINA SIMON BOLIVAR cayó a 0 (Mínimo: 0).	f	/inventory/products	2026-06-29 15:56:38.658
140	19	Alerta de Stock Crítico	El producto ACEITE EL REY 18LT ( E ) en ALMACEN MINA SIMON BOLIVAR cayó a 0 (Mínimo: 0).	f	/inventory/products	2026-06-29 15:56:38.666
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.positions (id, name, active) FROM stdin;
1	SUPERVISOR	t
2	ANALISTA	t
3	GERENTE	t
4	OBRERO	t
5	COORDINADOR	t
6	JEFE DE DIVISION	t
7	GERENTE DE TI	t
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, code, name, description, category_id, unit_id, minimum_stock, maximum_stock, is_perishable, active, created_at, updated_at, reference_price) FROM stdin;
206	PROD-001	ACEITE COPOSA 850ML X12 (E )	\N	47	27	0.00	\N	t	t	2026-06-29 13:52:22.903	2026-06-29 14:02:14.181	6.25
207	PROD-002	ACEITE EL REY 18LT ( E )	\N	47	28	0.00	\N	t	t	2026-06-29 13:52:22.916	2026-06-29 14:02:14.187	6.04
208	PROD-003	ADOBO ( G )	\N	48	29	0.00	\N	t	t	2026-06-29 13:52:22.923	2026-06-29 14:02:14.191	2.26
209	PROD-004	AGUA NEVADA 355ML X16	\N	49	27	0.00	\N	t	t	2026-06-29 13:52:22.926	2026-06-29 14:02:14.194	1.10
210	PROD-005	AJINOMOTO ( G )	\N	49	29	0.00	\N	t	t	2026-06-29 13:52:22.927	2026-06-29 14:02:14.196	4.98
211	PROD-006	ARROZ PRIMOR PERLADO 900GR*24 ( E )	\N	50	30	0.00	\N	t	t	2026-06-29 13:52:22.931	2026-06-29 14:02:14.201	7.42
212	PROD-007	ARVEJAS PANTERA 900GR*24 ( E )	\N	49	30	0.00	\N	t	t	2026-06-29 13:52:22.932	2026-06-29 14:02:14.204	2.32
213	PROD-008	ATUN WILLINGER 170GR*48UND ( G )	\N	49	27	0.00	\N	t	t	2026-06-29 13:52:22.934	2026-06-29 14:02:14.206	2.41
214	PROD-009	AVENA PANTERA 800GR*12UND ( E )	\N	50	30	0.00	\N	t	t	2026-06-29 13:52:22.936	2026-06-29 14:02:14.209	6.24
215	PROD-010	AZUCAR MONTALBAN 1KG*20UND ( E )	\N	48	30	0.00	\N	t	t	2026-06-29 13:52:22.937	2026-06-29 14:02:14.21	7.58
216	PROD-011	CAFÉ AMANECER 500GR*10 ( E )	\N	49	30	0.00	\N	t	t	2026-06-29 13:52:22.938	2026-06-29 14:02:14.212	9.09
217	PROD-012	CARAOTAS PANTERA 900GR*24 UND ( E )	\N	51	30	0.00	\N	t	t	2026-06-29 13:52:22.94	2026-06-29 14:02:14.213	7.88
218	PROD-013	CASABE *20UND ( E )	\N	49	30	0.00	\N	t	t	2026-06-29 13:52:22.942	2026-06-29 14:02:14.217	4.98
219	PROD-014	CHAMPIÑONES COTOPERI 425GR ( G )	\N	49	31	0.00	\N	t	t	2026-06-29 13:52:22.945	2026-06-29 14:02:14.224	10.55
220	PROD-015	COCO RAYADO ( G )	\N	49	29	0.00	\N	t	t	2026-06-29 13:52:22.947	2026-06-29 14:02:14.227	6.86
221	PROD-016	CUBITO 250UND ( G )	\N	48	27	0.00	\N	t	t	2026-06-29 13:52:22.948	2026-06-29 14:02:14.231	4.78
222	PROD-017	ESENCIA DE VAINILLA ( G )	\N	49	32	0.00	\N	t	t	2026-06-29 13:52:22.95	2026-06-29 14:02:14.236	3.70
223	PROD-018	FRIJOL BAYO PANTERA 454GR*24 ( E )	\N	51	30	0.00	\N	t	t	2026-06-29 13:52:22.952	2026-06-29 14:02:14.238	5.88
224	PROD-019	GATORADE 500ML*12 ( G )	\N	49	27	0.00	\N	t	t	2026-06-29 13:52:22.953	2026-06-29 14:02:14.24	4.63
225	PROD-020	GUISANTES TIGO 300GR ( G )	\N	49	31	0.00	\N	t	t	2026-06-29 13:52:22.954	2026-06-29 14:02:14.243	2.57
226	PROD-021	GUISANTES VIVALDI 300GR ( G )	\N	49	31	0.00	\N	t	t	2026-06-29 13:52:22.955	2026-06-29 14:02:14.245	8.69
227	PROD-022	HARINA DE TRIGO 45KG ( E )	\N	50	33	0.00	\N	t	t	2026-06-29 13:52:22.959	2026-06-29 14:02:14.248	6.70
228	PROD-023	HARINA PAN 1KG*20UND ( E )	\N	50	30	0.00	\N	t	t	2026-06-29 13:52:22.961	2026-06-29 14:02:14.256	3.57
229	PROD-024	HARINA PARA CACHAPAS 500GR (G)	\N	50	31	0.00	\N	t	t	2026-06-29 13:52:22.962	2026-06-29 14:02:14.259	10.10
230	PROD-025	HARINA SEMILLAS NUTRITIVAS ( G )	\N	50	31	0.00	\N	t	t	2026-06-29 13:52:22.963	2026-06-29 14:02:14.26	2.12
231	PROD-026	LECHE CAMPIÑA 800GR*12 ( E )	\N	52	30	0.00	\N	t	t	2026-06-29 13:52:22.965	2026-06-29 14:02:14.263	2.71
232	PROD-027	LECHE CONDENSADA BELLA HOLANDESA 1KG ( E )	\N	52	31	0.00	\N	t	t	2026-06-29 13:52:22.966	2026-06-29 14:02:14.267	3.27
233	PROD-028	LENTEJAS PANTERA 900GR*24 ( E )	\N	51	30	0.00	\N	t	t	2026-06-29 13:52:22.968	2026-06-29 14:02:14.272	10.73
234	PROD-029	LEVADURA 500GR ( G )	\N	49	31	0.00	\N	t	t	2026-06-29 13:52:22.969	2026-06-29 14:02:14.275	3.52
235	PROD-030	MAIZORITOS 500GR*12C ( G )	\N	50	27	0.00	\N	t	t	2026-06-29 13:52:22.97	2026-06-29 14:02:14.278	10.40
236	PROD-031	MANTECA 10KG ( E )	\N	49	27	0.00	\N	t	t	2026-06-29 13:52:22.972	2026-06-29 14:02:14.28	10.49
237	PROD-032	MANTEQUILLA CHEF 5KG C/SAL ( E )	\N	48	27	0.00	\N	t	t	2026-06-29 13:52:22.973	2026-06-29 14:02:14.284	7.69
238	PROD-033	MANTEQUILLA MAVESA 500GR*12UND ( E )	\N	52	27	0.00	\N	t	t	2026-06-29 13:52:22.976	2026-06-29 14:02:14.29	8.10
239	PROD-034	MAYONESA MAVESA 3,60KG ( E )	\N	48	32	0.00	\N	t	t	2026-06-29 13:52:22.978	2026-06-29 14:02:14.293	2.81
240	PROD-035	MOSTAZA DON PEDRO ( G )	\N	49	32	0.00	\N	t	t	2026-06-29 13:52:22.979	2026-06-29 14:02:14.296	3.80
241	PROD-036	NESTEA 1KG ( G )	\N	49	31	0.00	\N	t	t	2026-06-29 13:52:22.98	2026-06-29 14:02:14.3	5.25
242	PROD-037	ONOTO EN POLVO ( E )	\N	49	29	0.00	\N	t	t	2026-06-29 13:52:22.981	2026-06-29 14:02:14.305	1.13
243	PROD-038	PAN ARABE EL GIGANTE 400GR ( E )	\N	49	34	0.00	\N	t	t	2026-06-29 13:52:22.983	2026-06-29 14:02:14.31	9.14
244	PROD-039	PANELADA*128UND ( G )	\N	49	27	0.00	\N	t	t	2026-06-29 13:52:22.984	2026-06-29 14:02:14.313	4.06
245	PROD-040	PAPELON EN CONO *40UND ( E )	\N	49	30	0.00	\N	t	t	2026-06-29 13:52:22.986	2026-06-29 14:02:14.318	3.04
246	PROD-041	PAPITAS FRITAS 1KG ( G )	\N	49	34	0.00	\N	t	t	2026-06-29 13:52:22.988	2026-06-29 14:02:14.323	3.73
247	PROD-042	PASTA CORTA PRIMOR 1KG*12UND ( E )	\N	50	30	0.00	\N	t	t	2026-06-29 13:52:22.989	2026-06-29 14:02:14.328	7.95
248	PROD-043	PASTA LARGA PRIMOR 1KG*12UND ( E )	\N	50	30	0.00	\N	t	t	2026-06-29 13:52:22.991	2026-06-29 14:02:14.332	2.57
249	PROD-044	QUESO CREMA 4KG ( G )	\N	52	32	0.00	\N	t	t	2026-06-29 13:52:22.993	2026-06-29 14:02:14.337	1.43
250	PROD-045	REFRESCOS SABORES 2LT*6UND ( G )	\N	53	27	0.00	\N	t	t	2026-06-29 13:52:22.996	2026-06-29 14:02:14.342	10.84
251	PROD-046	SAL MI LLANURA 1KG*25UND ( E )	\N	48	30	0.00	\N	t	t	2026-06-29 13:52:22.997	2026-06-29 14:02:14.346	3.43
252	PROD-047	SALSA AJI PICANTE PIRIPIRI 300CC X12 (G)	\N	48	27	0.00	\N	t	t	2026-06-29 13:52:22.998	2026-06-29 14:02:14.35	7.41
253	PROD-048	SALSA BBQ FRITZ 2KG (G)	\N	48	31	0.00	\N	t	t	2026-06-29 13:52:22.999	2026-06-29 14:02:14.355	2.66
254	PROD-049	SALSA CHINA AZUL OSCURA ( G )	\N	48	32	0.00	\N	t	t	2026-06-29 13:52:23.001	2026-06-29 14:02:14.359	5.86
255	PROD-050	SALSA DE AJO IBERIA 3,7LT ( G )	\N	48	32	0.00	\N	t	t	2026-06-29 13:52:23.002	2026-06-29 14:02:14.363	8.79
256	PROD-051	SALSA DE SOYA IBERIA 3,7LT ( G )	\N	48	32	0.00	\N	t	t	2026-06-29 13:52:23.003	2026-06-29 14:02:14.368	4.58
257	PROD-052	SALSA DE TOMATE PAMPERO 4,20KG ( G )	\N	48	32	0.00	\N	t	t	2026-06-29 13:52:23.005	2026-06-29 14:02:14.372	9.22
258	PROD-053	SALSA FRITZ QUESO CHEDDAR 1KG ( G )	\N	48	31	0.00	\N	t	t	2026-06-29 13:52:23.007	2026-06-29 14:02:14.375	2.54
259	PROD-054	SALSA INGLESA IBERIA 3,7LT ( G )	\N	48	32	0.00	\N	t	t	2026-06-29 13:52:23.009	2026-06-29 14:02:14.378	10.49
260	PROD-055	SALSA PICANTE DON PEDRO 300CC X12 (G)	\N	48	27	0.00	\N	t	t	2026-06-29 13:52:23.011	2026-06-29 14:02:14.381	6.73
261	PROD-056	SARDINA EL MORRO 170GR*18UND ( E )	\N	49	27	0.00	\N	t	t	2026-06-29 13:52:23.012	2026-06-29 14:02:14.384	10.00
262	PROD-057	VINAGRE FRITZ ( G )	\N	49	32	0.00	\N	t	t	2026-06-29 13:52:23.014	2026-06-29 14:02:14.386	2.44
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role_id, module_id, can_create, can_read, can_update, can_delete) FROM stdin;
823	5	126	f	f	f	f
824	5	105	f	f	f	f
510	2	16	f	f	f	f
511	2	170	t	t	t	t
512	2	169	t	t	t	t
513	2	55	f	f	f	f
514	2	5	t	t	t	t
515	2	85	f	f	f	f
516	2	104	t	t	t	t
517	2	14	t	t	t	t
518	2	12	t	t	t	t
519	2	181	f	f	f	f
825	5	29	f	f	f	f
520	2	184	f	f	f	f
521	2	183	f	f	f	f
522	2	179	f	f	f	f
523	2	185	f	f	f	f
524	2	182	f	f	f	f
525	2	180	f	f	f	f
526	2	6	f	f	f	f
527	2	19	t	t	t	t
528	2	13	t	t	t	t
529	2	4	t	t	t	t
826	5	17	f	t	f	f
287	1	104	t	t	t	t
288	1	105	t	t	t	t
329	1	126	t	t	t	t
372	1	169	t	t	t	t
827	5	1	f	f	f	f
373	1	170	t	t	t	t
289	4	105	f	f	f	f
290	4	29	f	f	f	f
291	4	17	f	f	f	f
292	4	1	t	t	t	f
293	4	103	t	t	t	f
294	4	3	t	t	t	f
295	4	42	t	t	t	f
296	4	18	t	t	t	f
297	4	16	f	f	f	f
298	4	55	f	f	f	f
299	4	5	t	t	t	f
300	4	85	f	f	f	f
301	4	104	t	t	t	f
302	4	14	t	t	t	f
303	4	12	t	t	t	f
828	5	103	f	f	f	f
305	4	6	f	f	f	f
306	4	19	t	t	t	f
307	4	13	t	t	t	f
308	4	4	t	t	t	f
829	5	3	f	f	f	f
830	5	42	t	t	t	t
831	5	18	t	t	t	t
832	5	16	f	f	f	f
833	5	170	f	f	f	f
834	5	169	f	f	f	f
835	5	55	f	f	f	f
836	5	5	f	f	f	f
837	5	85	f	f	f	f
838	5	104	f	f	f	f
839	5	221	t	t	t	t
840	5	14	f	f	f	f
841	5	12	f	f	f	f
842	5	181	f	f	f	f
843	5	184	f	f	f	f
844	5	183	f	f	f	f
845	5	179	f	f	f	f
846	5	185	f	f	f	f
847	5	182	f	f	f	f
848	5	180	f	f	f	f
849	5	6	f	f	f	f
850	5	19	t	t	t	t
851	5	13	f	f	f	f
617	3	126	f	f	f	f
618	3	105	f	f	f	f
619	3	29	f	f	f	f
620	3	17	f	f	f	f
621	3	1	f	f	f	f
622	3	103	f	f	f	f
623	3	3	f	f	f	f
624	3	42	f	f	f	f
625	3	18	f	f	f	f
626	3	16	f	f	f	f
627	3	170	f	f	f	f
628	3	169	t	t	t	t
629	3	55	f	f	f	f
630	3	5	f	f	f	f
631	3	85	f	f	f	f
632	3	104	f	f	f	f
633	3	14	t	t	t	t
634	3	12	f	f	f	f
635	3	181	f	f	f	f
636	3	184	t	t	t	t
637	3	183	t	t	t	t
638	3	179	f	f	f	f
639	3	185	f	f	f	f
640	3	182	f	f	f	f
641	3	180	f	f	f	f
642	3	6	f	f	f	f
643	3	19	f	f	f	f
644	3	13	f	t	t	f
645	3	4	f	f	f	f
501	2	126	f	f	f	f
502	2	105	f	f	f	f
503	2	29	f	f	f	f
504	2	17	f	f	f	f
505	2	1	t	t	t	t
506	2	103	t	t	t	t
507	2	3	t	t	t	t
508	2	42	t	t	t	t
509	2	18	t	t	t	t
852	5	4	f	f	f	f
49	1	1	t	t	t	t
50	1	3	t	t	t	t
57	1	4	t	t	t	t
51	1	5	t	t	t	t
55	1	6	t	t	t	t
53	1	12	t	t	t	t
56	1	13	t	t	t	t
52	1	14	t	t	t	t
451	1	179	t	t	t	t
452	1	180	t	t	t	t
453	1	181	t	t	t	t
454	1	182	t	t	t	t
455	1	183	t	t	t	t
456	1	184	t	t	t	t
457	1	185	t	t	t	t
159	1	29	t	t	t	t
96	1	18	t	t	t	t
174	1	42	t	t	t	t
187	1	55	t	t	t	t
94	1	16	t	t	t	t
95	1	17	t	t	t	t
754	1	221	t	t	t	t
97	1	19	t	t	t	t
217	1	85	t	t	t	t
286	1	103	t	t	t	t
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description) FROM stdin;
1	ADMIN	Administrador del Sistema
4	COORDINADOR INVENTARIO	CORDINADORES DE INVENTARIOS
2	GERENTES COMERDOR	GTE COMEDOR E INVENTARIO
3	SUPERVISOR COMEDOR	DESPACHO Y RECEPCION LOCAL
5	GERENTE COMENSALES	GERENTE ADMINISTRADOR Y APROBADOR DE COMENSALES
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, warehouse_id, user_id, start_time, end_time, status, notes, created_at, updated_at, shift_type) FROM stdin;
16	2	19	2026-06-29 15:54:47.515	2026-06-29 18:58:52.252	CLOSED	\N	2026-06-29 15:54:47.518	2026-06-29 18:58:52.257	DESAYUNO
\.


--
-- Data for Name: squads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.squads (id, name, active) FROM stdin;
4	Área Administrativa	t
1	Cuadrilla A 	t
2	Cuadrilla B	t
3	Cuadrilla C	t
\.


--
-- Data for Name: stocks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stocks (id, warehouse_id, product_id, quantity, updated_at) FROM stdin;
273	1	211	11.00	2026-06-29 14:02:14.197
274	1	212	39.00	2026-06-29 14:02:14.202
275	1	213	39.00	2026-06-29 14:02:14.205
276	1	214	47.00	2026-06-29 14:02:14.208
277	1	215	14.00	2026-06-29 14:02:14.209
278	1	216	12.00	2026-06-29 14:02:14.211
279	1	217	42.00	2026-06-29 14:02:14.212
280	1	218	45.00	2026-06-29 14:02:14.214
281	1	219	45.00	2026-06-29 14:02:14.22
282	1	220	28.00	2026-06-29 14:02:14.225
283	1	221	47.00	2026-06-29 14:02:14.229
284	1	222	17.00	2026-06-29 14:02:14.234
285	1	223	43.00	2026-06-29 14:02:14.237
286	1	224	23.00	2026-06-29 14:02:14.239
287	1	225	31.00	2026-06-29 14:02:14.241
288	1	226	10.00	2026-06-29 14:02:14.244
289	1	227	19.00	2026-06-29 14:02:14.246
290	1	228	54.00	2026-06-29 14:02:14.251
291	1	229	21.00	2026-06-29 14:02:14.257
292	1	230	52.00	2026-06-29 14:02:14.259
293	1	231	53.00	2026-06-29 14:02:14.261
294	1	232	32.00	2026-06-29 14:02:14.264
295	1	233	14.00	2026-06-29 14:02:14.269
296	1	234	30.00	2026-06-29 14:02:14.274
297	1	235	20.00	2026-06-29 14:02:14.276
298	1	236	18.00	2026-06-29 14:02:14.279
299	1	237	25.00	2026-06-29 14:02:14.281
300	1	238	45.00	2026-06-29 14:02:14.286
301	1	239	38.00	2026-06-29 14:02:14.291
302	1	240	52.00	2026-06-29 14:02:14.295
303	1	241	20.00	2026-06-29 14:02:14.297
304	1	242	22.00	2026-06-29 14:02:14.301
305	1	243	21.00	2026-06-29 14:02:14.307
306	1	244	46.00	2026-06-29 14:02:14.311
307	1	245	49.00	2026-06-29 14:02:14.315
308	1	246	57.00	2026-06-29 14:02:14.321
309	1	247	38.00	2026-06-29 14:02:14.325
310	1	248	27.00	2026-06-29 14:02:14.33
311	1	249	22.00	2026-06-29 14:02:14.334
312	1	250	46.00	2026-06-29 14:02:14.339
313	1	251	18.00	2026-06-29 14:02:14.344
314	1	252	37.00	2026-06-29 14:02:14.347
315	1	253	49.00	2026-06-29 14:02:14.352
316	1	254	42.00	2026-06-29 14:02:14.357
317	1	255	56.00	2026-06-29 14:02:14.361
318	1	256	34.00	2026-06-29 14:02:14.365
319	1	257	12.00	2026-06-29 14:02:14.37
320	1	258	58.00	2026-06-29 14:02:14.374
321	1	259	49.00	2026-06-29 14:02:14.377
322	1	260	55.00	2026-06-29 14:02:14.379
323	1	261	44.00	2026-06-29 14:02:14.382
324	1	262	43.00	2026-06-29 14:02:14.385
268	1	206	43.00	2026-06-29 15:54:13.366
269	1	207	33.00	2026-06-29 15:54:13.406
270	1	208	53.00	2026-06-29 15:54:13.411
330	2	208	1.00	2026-06-29 15:54:13.414
271	1	209	16.00	2026-06-29 15:54:13.424
332	2	209	1.00	2026-06-29 15:54:13.427
272	1	210	41.00	2026-06-29 15:54:13.431
334	2	210	1.00	2026-06-29 15:54:13.434
326	2	206	0.00	2026-06-29 15:56:38.616
328	2	207	0.00	2026-06-29 15:56:38.624
\.


--
-- Data for Name: subdependencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subdependencies (id, name, dependency_id, active) FROM stdin;
1	Taller Mecánico	2	t
2	Mantenimiento de Planta	2	t
3	Recursos Humanos	1	t
4	Tecnología	1	t
5	DIVISION DE PROGRAMACION	3	t
6	División de Redes (Prueba)	3	t
7	División de Soporte Técnico (Prueba)	3	t
8	División de Infraestructura (Prueba)	3	t
9	COMEDOR	1	t
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, document, name, address, phone, email, active, created_at, updated_at) FROM stdin;
1	J402690275	SANTO ANGEL	\N	02564646646	\N	t	2026-06-10 20:45:10.869	2026-06-19 23:31:07.236
\.


--
-- Data for Name: transaction_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_details (id, transaction_id, product_id, quantity, unit_price, expiration_date, discrepancy_reason, expected_quantity) FROM stdin;
488	46	206	44.00	6.25	2026-12-31	\N	44.00
489	46	207	34.00	6.04	2026-12-31	\N	34.00
490	46	208	54.00	2.26	2026-12-31	\N	54.00
491	46	209	17.00	1.10	2026-12-31	\N	17.00
492	46	210	42.00	4.98	2026-12-31	\N	42.00
493	46	211	11.00	7.42	2026-12-31	\N	11.00
494	46	212	39.00	2.32	2026-12-31	\N	39.00
495	46	213	39.00	2.41	2026-12-31	\N	39.00
496	46	214	47.00	6.24	2026-12-31	\N	47.00
497	46	215	14.00	7.58	2026-12-31	\N	14.00
498	46	216	12.00	9.09	2026-12-31	\N	12.00
499	46	217	42.00	7.88	2026-12-31	\N	42.00
500	46	218	45.00	4.98	2026-12-31	\N	45.00
501	46	219	45.00	10.55	2026-12-31	\N	45.00
502	46	220	28.00	6.86	2026-12-31	\N	28.00
503	46	221	47.00	4.78	2026-12-31	\N	47.00
504	46	222	17.00	3.70	2026-12-31	\N	17.00
505	46	223	43.00	5.88	2026-12-31	\N	43.00
506	46	224	23.00	4.63	2026-12-31	\N	23.00
507	46	225	31.00	2.57	2026-12-31	\N	31.00
508	46	226	10.00	8.69	2026-12-31	\N	10.00
509	46	227	19.00	6.70	2026-12-31	\N	19.00
510	46	228	54.00	3.57	2026-12-31	\N	54.00
511	46	229	21.00	10.10	2026-12-31	\N	21.00
512	46	230	52.00	2.12	2026-12-31	\N	52.00
513	46	231	53.00	2.71	2026-12-31	\N	53.00
514	46	232	32.00	3.27	2026-12-31	\N	32.00
515	46	233	14.00	10.73	2026-12-31	\N	14.00
516	46	234	30.00	3.52	2026-12-31	\N	30.00
517	46	235	20.00	10.40	2026-12-31	\N	20.00
518	46	236	18.00	10.49	2026-12-31	\N	18.00
519	46	237	25.00	7.69	2026-12-31	\N	25.00
520	46	238	45.00	8.10	2026-12-31	\N	45.00
521	46	239	38.00	2.81	2026-12-31	\N	38.00
522	46	240	52.00	3.80	2026-12-31	\N	52.00
523	46	241	20.00	5.25	2026-12-31	\N	20.00
524	46	242	22.00	1.13	2026-12-31	\N	22.00
525	46	243	21.00	9.14	2026-12-31	\N	21.00
526	46	244	46.00	4.06	2026-12-31	\N	46.00
527	46	245	49.00	3.04	2026-12-31	\N	49.00
528	46	246	57.00	3.73	2026-12-31	\N	57.00
529	46	247	38.00	7.95	2026-12-31	\N	38.00
530	46	248	27.00	2.57	2026-12-31	\N	27.00
531	46	249	22.00	1.43	2026-12-31	\N	22.00
532	46	250	46.00	10.84	2026-12-31	\N	46.00
533	46	251	18.00	3.43	2026-12-31	\N	18.00
534	46	252	37.00	7.41	2026-12-31	\N	37.00
535	46	253	49.00	2.66	2026-12-31	\N	49.00
536	46	254	42.00	5.86	2026-12-31	\N	42.00
537	46	255	56.00	8.79	2026-12-31	\N	56.00
538	46	256	34.00	4.58	2026-12-31	\N	34.00
539	46	257	12.00	9.22	2026-12-31	\N	12.00
540	46	258	58.00	2.54	2026-12-31	\N	58.00
541	46	259	49.00	10.49	2026-12-31	\N	49.00
542	46	260	55.00	6.73	2026-12-31	\N	55.00
543	46	261	44.00	10.00	2026-12-31	\N	44.00
544	46	262	43.00	2.44	2026-12-31	\N	43.00
545	47	206	1.00	6.25	\N	\N	\N
546	47	207	1.00	6.04	\N	\N	\N
547	47	208	1.00	2.26	\N	\N	\N
548	47	209	1.00	1.10	\N	\N	\N
549	47	210	1.00	4.98	\N	\N	\N
550	48	206	1.00	0.00	\N	\N	\N
551	48	207	1.00	0.00	\N	\N	\N
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, type, status, source_id, destination_id, supplier_id, created_by_id, approved_by_id, notes, created_at, updated_at, shift_id, institution_id, reference_number) FROM stdin;
46	RECEPTION	CONFIRMED	\N	1	1	18	1	Importación masiva desde Excel	2026-06-29 13:52:23.056	2026-06-29 14:02:14.387	\N	\N	1
47	TRANSFER	CONFIRMED	1	2	\N	18	17	\N	2026-06-29 14:40:40.661	2026-06-29 15:54:13.438	\N	\N	\N
48	CONSUMPTION	CONFIRMED	2	\N	\N	19	\N	[PENDING]: Generado desde turno local\n[CONFIRMED]: Aprobado por Gerencia	2026-06-29 15:55:01.981	2026-06-29 15:56:38.639	16	\N	\N
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units (id, name, abbreviation, active, created_at, updated_at) FROM stdin;
27	CAJA	CAJA	t	2026-06-29 13:52:22.894	2026-06-29 13:52:22.894
28	PAILA	PAILA	t	2026-06-29 13:52:22.912	2026-06-29 13:52:22.912
29	KILO	KILO	t	2026-06-29 13:52:22.922	2026-06-29 13:52:22.922
30	BTO	BTO	t	2026-06-29 13:52:22.929	2026-06-29 13:52:22.929
31	UNIDAD	UNIDAD	t	2026-06-29 13:52:22.943	2026-06-29 13:52:22.943
32	GALON	GALON	t	2026-06-29 13:52:22.948	2026-06-29 13:52:22.948
33	SACO	SACO	t	2026-06-29 13:52:22.957	2026-06-29 13:52:22.957
34	PAQUETE	PAQUETE	t	2026-06-29 13:52:22.982	2026-06-29 13:52:22.982
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, password_hash, active, role_id, created_at, updated_at, cedula, warehouse_id, subdependency_id, dependency_id, dining_room_id) FROM stdin;
17	LEONARDO ESPINA	$2b$10$N66MBndsZwSlsRm9haHCzO7xJs.Vr849dQvnYNWomvdsCt2FnDW8S	t	2	2026-06-29 13:30:37.699	2026-06-29 13:30:37.699	18073921	\N	9	1	\N
18	DANIEL ESPINA	$2b$10$BQytNToJtEfXDUM66oICLOCzwc4.VrZ8CtWmSbgE8WzR9csHv8k3K	t	4	2026-06-29 13:31:32.162	2026-06-29 13:31:32.162	17073921	\N	9	1	\N
19	DAVID LOPEZ	$2b$10$.LWGtLPz7FzPlUdAgxv/nel0X1FijFiagdq6AuVEffe4qUmxX9jLi	t	3	2026-06-29 13:46:54.183	2026-06-29 14:51:26.288	16073921	2	9	1	\N
20	PEDRO PEREZ	$2b$10$gXLv.AVY5n1XOxNkKbN/7eKxIqRuhwtBb6uKMaBbYpPjxOyIsfcJC	t	5	2026-06-29 20:17:03.791	2026-06-29 20:17:03.791	15073921	\N	\N	3	\N
1	Administrador de Prueba	$2b$10$4.Xd60tXUXh0o6H9JeVqSecbn16gUkvOGqAW7P4AKm6t7u5a2r4b2	t	1	2026-06-10 13:48:55.377	2026-06-29 20:33:48.245	V-12345678	\N	\N	\N	\N
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, name, type, location, active, created_at, updated_at) FROM stdin;
3	ALMACEN CAMORRA	LOCAL	CAMORRA	t	2026-06-23 12:20:18.902	2026-06-26 19:02:14.131
1	ALMACEN CENTRAL CAMORRA	CENTRAL	CAMORRA	t	2026-06-10 19:26:52.346	2026-06-26 19:03:19.894
2	ALMACEN MINA SIMON BOLIVAR	LOCAL	MINA SIMON BOLIVAR	t	2026-06-15 15:06:54.383	2026-06-26 19:03:45.66
5	Almacén Central MSB	CENTRAL	\N	t	2026-06-29 20:33:48.251	2026-06-29 20:33:48.251
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 494, true);


--
-- Name: biometric_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.biometric_records_id_seq', 27, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 53, true);


--
-- Name: dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dependencies_id_seq', 3, true);


--
-- Name: diner_request_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diner_request_details_id_seq', 1, false);


--
-- Name: diner_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diner_requests_id_seq', 1, false);


--
-- Name: diners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.diners_id_seq', 1008, true);


--
-- Name: dining_rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dining_rooms_id_seq', 6, true);


--
-- Name: institutions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.institutions_id_seq', 2, true);


--
-- Name: modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.modules_id_seq', 229, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 140, true);


--
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.positions_id_seq', 7, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 262, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 852, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 5, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 16, true);


--
-- Name: squads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.squads_id_seq', 4, true);


--
-- Name: stocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stocks_id_seq', 334, true);


--
-- Name: subdependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subdependencies_id_seq', 9, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 1, true);


--
-- Name: transaction_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_details_id_seq', 551, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 48, true);


--
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.units_id_seq', 34, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 5, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: biometric_records biometric_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_records
    ADD CONSTRAINT biometric_records_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: dependencies dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_pkey PRIMARY KEY (id);


--
-- Name: diner_request_details diner_request_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_request_details
    ADD CONSTRAINT diner_request_details_pkey PRIMARY KEY (id);


--
-- Name: diner_requests diner_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_requests
    ADD CONSTRAINT diner_requests_pkey PRIMARY KEY (id);


--
-- Name: diners diners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diners
    ADD CONSTRAINT diners_pkey PRIMARY KEY (id);


--
-- Name: dining_rooms dining_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dining_rooms
    ADD CONSTRAINT dining_rooms_pkey PRIMARY KEY (id);


--
-- Name: institutions institutions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT institutions_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: squads squads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.squads
    ADD CONSTRAINT squads_pkey PRIMARY KEY (id);


--
-- Name: stocks stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_pkey PRIMARY KEY (id);


--
-- Name: subdependencies subdependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subdependencies
    ADD CONSTRAINT subdependencies_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: transaction_details transaction_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_details
    ADD CONSTRAINT transaction_details_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: biometric_records_diner_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX biometric_records_diner_id_key ON public.biometric_records USING btree (diner_id);


--
-- Name: categories_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);


--
-- Name: dependencies_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX dependencies_name_key ON public.dependencies USING btree (name);


--
-- Name: diner_request_details_request_id_diner_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX diner_request_details_request_id_diner_id_key ON public.diner_request_details USING btree (request_id, diner_id);


--
-- Name: diners_cedula_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX diners_cedula_key ON public.diners USING btree (cedula);


--
-- Name: diners_qr_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX diners_qr_code_key ON public.diners USING btree (qr_code);


--
-- Name: dining_rooms_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX dining_rooms_name_key ON public.dining_rooms USING btree (name);


--
-- Name: institutions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX institutions_name_key ON public.institutions USING btree (name);


--
-- Name: modules_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX modules_code_key ON public.modules USING btree (code);


--
-- Name: positions_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX positions_name_key ON public.positions USING btree (name);


--
-- Name: products_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX products_code_key ON public.products USING btree (code);


--
-- Name: role_permissions_role_id_module_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX role_permissions_role_id_module_id_key ON public.role_permissions USING btree (role_id, module_id);


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: squads_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX squads_name_key ON public.squads USING btree (name);


--
-- Name: stocks_warehouse_id_product_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stocks_warehouse_id_product_id_key ON public.stocks USING btree (warehouse_id, product_id);


--
-- Name: suppliers_document_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX suppliers_document_key ON public.suppliers USING btree (document);


--
-- Name: units_abbreviation_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX units_abbreviation_key ON public.units USING btree (abbreviation);


--
-- Name: users_cedula_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_cedula_key ON public.users USING btree (cedula);


--
-- Name: warehouses_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX warehouses_name_key ON public.warehouses USING btree (name);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: biometric_records biometric_records_diner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.biometric_records
    ADD CONSTRAINT biometric_records_diner_id_fkey FOREIGN KEY (diner_id) REFERENCES public.diners(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: diner_request_details diner_request_details_diner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_request_details
    ADD CONSTRAINT diner_request_details_diner_id_fkey FOREIGN KEY (diner_id) REFERENCES public.diners(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: diner_request_details diner_request_details_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_request_details
    ADD CONSTRAINT diner_request_details_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.diner_requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: diner_requests diner_requests_approved_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_requests
    ADD CONSTRAINT diner_requests_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diner_requests diner_requests_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_requests
    ADD CONSTRAINT diner_requests_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: diner_requests diner_requests_dining_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diner_requests
    ADD CONSTRAINT diner_requests_dining_room_id_fkey FOREIGN KEY (dining_room_id) REFERENCES public.dining_rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diners diners_dining_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diners
    ADD CONSTRAINT diners_dining_room_id_fkey FOREIGN KEY (dining_room_id) REFERENCES public.dining_rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diners diners_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diners
    ADD CONSTRAINT diners_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: diners diners_squad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diners
    ADD CONSTRAINT diners_squad_id_fkey FOREIGN KEY (squad_id) REFERENCES public.squads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: diners diners_subdependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diners
    ADD CONSTRAINT diners_subdependency_id_fkey FOREIGN KEY (subdependency_id) REFERENCES public.subdependencies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dining_rooms dining_rooms_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dining_rooms
    ADD CONSTRAINT dining_rooms_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: products products_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: role_permissions role_permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shifts shifts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: shifts shifts_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stocks stocks_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stocks stocks_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocks
    ADD CONSTRAINT stocks_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subdependencies subdependencies_dependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subdependencies
    ADD CONSTRAINT subdependencies_dependency_id_fkey FOREIGN KEY (dependency_id) REFERENCES public.dependencies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transaction_details transaction_details_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_details
    ADD CONSTRAINT transaction_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transaction_details transaction_details_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_details
    ADD CONSTRAINT transaction_details_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transactions transactions_approved_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transactions transactions_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transactions transactions_destination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_destination_id_fkey FOREIGN KEY (destination_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transactions transactions_institution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transactions transactions_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transactions transactions_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transactions transactions_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_dependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_dependency_id_fkey FOREIGN KEY (dependency_id) REFERENCES public.dependencies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_dining_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_dining_room_id_fkey FOREIGN KEY (dining_room_id) REFERENCES public.dining_rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_subdependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_subdependency_id_fkey FOREIGN KEY (subdependency_id) REFERENCES public.subdependencies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict FjahNCIhiffxfNQtafAru53II8oSA2oGlGeyf6HGCG5p7ov4NyTEaEurlNfpBj4

