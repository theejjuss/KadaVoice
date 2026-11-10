export type IconName =
  | "arrow"
  | "bag"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "headphones"
  | "leaf"
  | "menu"
  | "mic"
  | "minus"
  | "plus"
  | "shield"
  | "spark"
  | "stop"
  | "trash"
  | "upload"
  | "user"
  | "wave"
  | "search"
  | "receipt"
  | "dashboard"
  | "settings"
  | "download"
  | "edit"
  | "refresh"
  | "phone";

export type View =
  | "home"
  | "order"
  | "catalogue"
  | "history"
  | "dashboard"
  | "customers"
  | "reports"
  | "settings"
  | "about";

export type Product = {
  product_id: number;
  name: string;
  malayalam_name: string;
  category: string;
  default_unit: string;
  price: number | null;
  stock_quantity?: number;
  is_active: boolean;
  aliases: string[];
};

export type CartItem = {
  id: number;
  name: string;
  quantity: number | null;
  unit: string;
  product_id?: number | null;
  needs_review?: boolean;
};

export type SavedOrder = {
  order_id: number;
  invoice_number: string;
  customer_name: string;
  phone?: string;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  total_amount?: number | null;
  discount?: number;
  tax?: number;
  notes?: string;
  created_at: string;
  items: Array<{
    product: string;
    quantity: number;
    unit: string;
    unit_price: number | null;
    line_total: number | null;
  }>;
  confirmation_text?: string;
  audio_url?: string | null;
  tts_error?: string | null;
};

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
