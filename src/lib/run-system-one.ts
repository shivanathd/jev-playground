import { ERRORS } from "@/lib/copy";
import { messageForStatus, PlaygroundError } from "@/lib/errors";
import type {
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
    request,
    response: body as SystemOneSuccess,
  };
}
