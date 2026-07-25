export interface Job {
  asin: string;
  attributes: string[];
  product_type?: string;
  brand?: string;
  title?: string;
  extra_data?: Record<string, string>;
  row_index?: number;
}

export interface ValidationEntry {
  attribute_id: string;
  product_type?: string;
  allowed_values: string[];
  is_free_text: boolean;
  tooltip: string;
}

export interface AttributeResult {
  attribute_id: string;
  status: string; // "Validated" | "Free Text" | "Unresolved" | "Failed"
  value: string;
}

export interface ProcessResult {
  asin: string;
  status: string;
  provider_used: string;
  error: string | null;
  results: AttributeResult[];
}

export interface SessionResult {
  session_id: string;
  timestamp: string;
  input_file: string;
  status: string;
  asins_processed: number;
}

export interface DetailedSessionResult {
  results: Array<Record<string, any>>;
  stats: Record<string, number>;
}
