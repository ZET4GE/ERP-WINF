import type { Currency } from "@/lib/types/service";

export interface Product {
  id: string;
  name: string;
  category: string | null;
  cost: number;
  sale_price: number;
  currency: Currency;
  min_stock_threshold: number;
  created_at: string;
}
