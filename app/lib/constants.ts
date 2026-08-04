export const PROVIDERS = ["Gemini", "OpenAI", "Claude"];

export const DEFAULT_MODELS: Record<string, string[]> = {
  Gemini: [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
  ],
  OpenAI: [
    "gpt-4o-2024-08-06",
    "gpt-4o-mini-2024-07-18",
    "gpt-4.1-2025-04-14",
    "gpt-5-mini-2025-08-07",
    "gpt-5.4-2026-03-05",
    "gpt-5.4-mini-2026-03-17",
    "gpt-5.4-nano-2026-03-17",
  ],
  Claude: [
    "claude-haiku-4-5",
    "claude-sonnet-4-6",
    "claude-sonnet-5",
    "claude-opus-4-8",
    "claude-fable-5",
  ],
};

export const STATUS_COLORS: Record<string, string> = {
  Validated:
    "text-status-success bg-status-success/10 border-status-success/20",
  "Free Text": "text-primary bg-primary/10 border-primary/20",
  Unresolved:
    "text-status-warning bg-status-warning/10 border-status-warning/20",
  Failed: "text-status-error bg-status-error/10 border-status-error/20",
  Running: "text-primary bg-primary/10 border-primary/20",
  Complete: "text-status-success bg-status-success/10 border-status-success/20",
  Cancelled:
    "text-status-warning bg-status-warning/10 border-status-warning/20",
};
