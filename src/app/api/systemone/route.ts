import {
  APIError,
  AuthenticationError,
  Image,
  RateLimitError,
  TypeSafeClient,
  TypeSafeError,
  type EntryType,
} from "@typesafe-ai/sdk";
import { ERRORS } from "@/lib/copy";
import { parseQuestionMap } from "@/lib/question-config";
import { toSdkQuestions } from "@/lib/sdk-questions";
import { parseState } from "@/lib/state";
import { DEFAULT_MODEL, type JevModel } from "@/lib/types";

export const runtime = "nodejs";

// Netlify caps function request bodies at 6 MB and base64 adds a third,
// so the playground takes images up to 4 MiB (TypeSafe itself allows more).
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_OPT_IN = { "TypeSafe-Danger-Zone-Images": "true" } as const;

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
  if (value === "jev-latest" || value === "jev-1.13.0" || value === "jev-preview") {
    return value;
  }
  return DEFAULT_MODEL;
}

function readImage(raw: unknown): Image | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  const base64 =
    typeof raw === "object" && "base64" in raw && typeof raw.base64 === "string"
      ? raw.base64
      : "";
  if (!base64) {
    throw new Error(ERRORS.badImage);
  }
  if (Math.floor((base64.length * 3) / 4) > MAX_IMAGE_BYTES) {
    throw new Error(ERRORS.imageTooLarge);
  }
  // Throws TypeSafeError on bad base64; the API rejects anything but PNG/JPEG.
  return Image.fromBase64(base64);
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
    image?: unknown;
  };

  // Visitor key comes from the header only. Ignore any key in the body.
  void body.apiKey;

  let questions;
  let image: Image | null;
  let hasBox: boolean;
  try {
    const map = parseQuestionMap(body.questions);
    hasBox = Object.values(map).some((question) => question.type === "box");
    questions = toSdkQuestions(map);
    image = readImage(body.image);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : ERRORS.badQuestion;
    return json(400, { error: message });
  }

  const model = resolveModel(body.model);
  if ((image || hasBox) && model !== "jev-preview") {
    return json(400, { error: ERRORS.imageNeedsPreview });
  }
  if (hasBox && !image) {
    return json(400, { error: ERRORS.boxNeedsImage });
  }

  const textState: EntryType =
    typeof body.state === "string" ? parseState(body.state) : (body.state as EntryType) ?? null;
  // The image rides alongside the text state so questions can use both.
  // SDK 0.7 requires a non-null state, so an empty box sends "".
  const state: NonNullable<EntryType> = image
    ? textState === "" || textState === null
      ? image
      : { image, context: textState }
    : (textState ?? "");

  // Explicit visitor key only. Never fall back to process.env.TYPESAFE_API_KEY.
  const client = new TypeSafeClient({
    apiKey,
    defaultModel: model,
    logLevel: "off",
  });

  try {
    const result = await client.systemOne(
      { state, model, questions },
      image ? { headers: IMAGE_OPT_IN } : undefined,
    );

    return json(200, result);
  } catch (error) {
    const mapped = publicApiError(error);
    return json(mapped.status, { error: mapped.error });
  }
}
