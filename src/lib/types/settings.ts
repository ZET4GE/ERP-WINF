export interface CompanySettings {
  id: string;
  name: string;
  cuit: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  domain: string | null;
  logo_url: string | null;
  default_billing_day: number;
  default_currency: "ARS" | "USD";
  updated_at: string;
}
