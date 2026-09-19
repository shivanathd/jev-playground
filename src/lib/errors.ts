import { ERRORS } from "@/lib/copy";

export class PlaygroundError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PlaygroundError";
    this.status = status;
  }
}

export function messageForStatus(status: number, fallback?: string): string {
  switch (status) {
    case 401:
      return ERRORS.rejectedKey;
    case 429:
      return ERRORS.rateLimited;
    case 529:
      return ERRORS.overloaded;
    default:
      return fallback ?? ERRORS.unknown;
  }
}
