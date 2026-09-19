import {
  APIError,
  AuthenticationError,
  RateLimitError,
  TypeSafeClient,
  TypeSafeError,
  type EntryType,
} from "@typesafe-ai/sdk";
import { ERRORS } from "@/lib/copy";
import { parseQuestionMap, parseState, toSdkQuestions } from "@/lib/questions";
import { DEFAULT_MODEL, type JevModel } from "@/lib/types";

export const runtime = "nodejs";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function readVisitorKey(request: Request): string {
  const header =
    request.headers.get("authorization") ??
    request.headers.get("x-typesafe-api-key");

  if (!header) {
    return "";
  }

  return header.replace(/^Bearer\s+/i, "").trim();
}

function resolveModel(value: unknown): JevModel {
  if (value === "jev-latest" || value === "jev-1.13.0") {
    return value;
  }
  return DEFAULT_MODEL;
}

function publicApiError(error: unknown): { status: number; error: string } {
  if (error instanceof AuthenticationError) {
    return { status: 401, error: ERRORS.rejectedKey };
  }

  if (error instanceof RateLimitError) {
    return { status: 429, error: ERRORS.rateLimited };
  }

  if (error instanceof APIError) {
    if (error.status === 529) {
      return { status: 529, error: ERRORS.overloaded };
    }

    const body = error.body;
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return { status: error.status, error: body.error };
    }

    return {
      status: error.status,
      error: error.message || ERRORS.unknown,
    };
  }

  if (error instanceof TypeSafeError) {
    return { status: 400, error: error.message };
  }

  if (error instanceof Error) {
    return { status: 400, error: error.message };
  }

  return { status: 500, error: ERRORS.unknown };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = readVisitorKey(request);
  if (!apiKey) {
    return json(400, { error: ERRORS.emptyKey });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: "Request body must be JSON." });
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json(400, { error: "Request body must be a JSON object." });
  }

  const body = raw as {
    state?: unknown;
    model?: unknown;
    questions?: unknown;
    apiKey?: unknown;
  };

  // Visitor key comes from the header only. Ignore any key in the body.
  void body.apiKey;

  let questions;
  try {
    questions = toSdkQuestions(parseQuestionMap(body.questions));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ERRORS.badQuestion;
    return json(400, { error: message });
  }

  const model = resolveModel(body.model);
  const state: EntryType =
    typeof body.state === "string" ? parseState(body.state) : (body.state as EntryType) ?? null;

  // Explicit visitor key only. Never fall back to process.env.TYPESAFE_API_KEY.
  const client = new TypeSafeClient({
    apiKey,
    defaultModel: model,
    logLevel: "off",
  });

  try {
    const result = await client.systemOne({
      state,
      model,
      questions,
    });

    return json(200, result);
  } catch (error) {
    const mapped = publicApiError(error);
    return json(mapped.status, { error: mapped.error });
  }
}
