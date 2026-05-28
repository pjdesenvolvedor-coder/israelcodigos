export interface WebhookEntry {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  payload: any;
  interpretation?: {
    summary: string;
    codes: string[];
  };
}

export type WebhookStore = WebhookEntry[];
