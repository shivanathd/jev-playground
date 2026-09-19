import type { EntryType } from "@/lib/types";

export function parseState(raw: string): EntryType {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "";
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === "string" ||
      parsed === null ||
      Array.isArray(parsed) ||
      (typeof parsed === "object" && parsed !== null)
    ) {
      return parsed as EntryType;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function formatState(state: EntryType): string {
  if (typeof state === "string") {
    return state;
  }

  return JSON.stringify(state, null, 2);
}
