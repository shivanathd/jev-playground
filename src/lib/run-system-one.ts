import { ERRORS } from "@/lib/copy";
import { messageForStatus, PlaygroundError } from "@/lib/errors";
import type {
  ImageInput,
  JevModel,
  QuestionMap,
  SystemOnePayload,
  SystemOneSuccess,
} from "@/lib/types";

export type RunResult = {
  request: SystemOnePayload;
  response: SystemOneSuccess;
};

type ErrorBody = {
  error?: string;
};

export async function runSystemOne(args: {
  apiKey: string;
  model: JevModel;
  state: SystemOnePayload["state"];
  questions: QuestionMap;
  image?: ImageInput | null;
}): Promise<RunResult> {
  const key = args.apiKey.trim();
  if (!key) {
    throw new PlaygroundError(ERRORS.emptyKey, 400);
  }

  if (Object.keys(args.questions).length === 0) {
    throw new PlaygroundError(ERRORS.noQuestions, 400);
  }

  const request: SystemOnePayload = {
    state: args.state,
    model: args.model,
    questions: args.questions,
    image: args.image ?? null,
  };

  let response: Response;
  try {
    response = await fetch("/api/systemone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(request),
    });
  } catch {
    throw new PlaygroundError(ERRORS.network, 502);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    throw new PlaygroundError(
      messageForStatus(response.status),
      response.status,
    );
  }

  if (!response.ok) {
    const errorBody = body as ErrorBody;
    throw new PlaygroundError(
      messageForStatus(response.status, errorBody.error),
      response.status,
    );
  }

  return {
    request: forDisplay(request),
    response: body as SystemOneSuccess,
  };
}

/** The request as shown on the slip: a short label instead of the image's base64. */
export function forDisplay(request: SystemOnePayload): SystemOnePayload {
  if (!request.image) {
    return request;
  }
  const kb = Math.round((request.image.base64.length * 3) / 4 / 1024);
  return {
    ...request,
    image: { name: request.image.name, base64: `<${kb} KB, sent as an image asset>` },
  };
}
