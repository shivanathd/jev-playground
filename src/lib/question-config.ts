import type { PlaygroundQuestion, QuestionMap } from "@/lib/types";

export type QuestionTypeName = PlaygroundQuestion["type"];

export function isQuestionType(value: unknown): value is QuestionTypeName {
  return value === "choice" || value === "score" || value === "noul";
}

function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function buildChoiceCriteria(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Choice criteria must be an object of named lanes.");
  }

  const criteria: Record<string, string> = {};
  for (const [label, description] of Object.entries(raw)) {
    criteria[label] = asString(description);
  }

  if (Object.keys(criteria).length === 0) {
    throw new Error("Choice criteria need at least one named lane.");
  }

  return criteria;
}

function buildScoreCriteria(raw: unknown): [string, string, ...string[]] {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("Score criteria need at least two ordered levels.");
  }

  const levels = raw.map((item) => asString(item));
  const [first, second, ...rest] = levels;
  return [first, second, ...rest];
}

function buildNoulCriteria(
  raw: unknown,
): { true?: string; false?: string } | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Noul criteria must be { true, false } or omitted.");
  }

  const record = raw as { true?: unknown; false?: unknown };
  return {
    true: record.true === undefined ? undefined : asString(record.true),
    false: record.false === undefined ? undefined : asString(record.false),
  };
}

export function parseQuestionMap(raw: unknown): QuestionMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Questions must be an object keyed by name.");
  }

  const map: QuestionMap = {};

  for (const [name, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Question "${name}" must be an object.`);
    }

    const record = value as {
      type?: unknown;
      instructions?: unknown;
      criteria?: unknown;
    };

    if (!isQuestionType(record.type)) {
      throw new Error(
        `Question "${name}" needs type choice, score, or noul.`,
      );
    }

    const instructions =
      typeof record.instructions === "string" ? record.instructions : "";

    switch (record.type) {
      case "choice":
        map[name] = {
          type: "choice",
          instructions,
          criteria: buildChoiceCriteria(record.criteria),
        };
        break;
      case "score":
        map[name] = {
          type: "score",
          instructions,
          criteria: buildScoreCriteria(record.criteria),
        };
        break;
      case "noul":
        map[name] = {
          type: "noul",
          instructions,
          criteria: buildNoulCriteria(record.criteria),
        };
        break;
      default: {
        const exhaustive: never = record.type;
        throw new Error(`Unhandled question type: ${String(exhaustive)}`);
      }
    }
  }

  return map;
}

export function emptyQuestion(type: QuestionTypeName): PlaygroundQuestion {
  switch (type) {
    case "choice":
      return {
        type: "choice",
        instructions: "Pick one lane",
        criteria: {
          yes: "The claim holds",
          no: "The claim does not hold",
        },
      };
    case "score":
      return {
        type: "score",
        instructions: "Place intensity on this ladder",
        criteria: ["Low", "Medium", "High"],
      };
    case "noul":
      return {
        type: "noul",
        instructions: "This claim is true",
        criteria: {
          true: "The statement holds on this state",
          false: "The statement does not hold",
        },
      };
    default: {
      const exhaustive: never = type;
      throw new Error(`Unhandled question type: ${String(exhaustive)}`);
    }
  }
}
