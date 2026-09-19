import {
  choice,
  noul,
  score,
  type ChoiceCriteria,
  type EntryType,
  type NoulQuestion,
  type Questions,
  type ScoreCriteria,
} from "@typesafe-ai/sdk";
import type { PlaygroundQuestion, QuestionMap } from "@/lib/types";

export type QuestionTypeName = PlaygroundQuestion["type"];

export function isQuestionType(value: unknown): value is QuestionTypeName {
  return value === "choice" || value === "score" || value === "noul";
}

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

function asEntryType(value: unknown): EntryType {
  if (typeof value === "string" || value === null || Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return value as EntryType;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function buildChoiceCriteria(raw: unknown): ChoiceCriteria {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Choice criteria must be an object of named lanes.");
  }

  const criteria: ChoiceCriteria = {};
  for (const [label, description] of Object.entries(raw)) {
    criteria[label] = asEntryType(description);
  }

  if (Object.keys(criteria).length === 0) {
    throw new Error("Choice criteria need at least one named lane.");
  }

  return criteria;
}

function buildScoreCriteria(raw: unknown): ScoreCriteria {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("Score criteria need at least two ordered levels.");
  }

  const levels = raw.map((item) => asEntryType(item));
  const [first, second, ...rest] = levels;
  return [first, second, ...rest];
}

function buildNoulCriteria(raw: unknown): NoulQuestion["criteria"] {
  if (raw === undefined || raw === null) {
    return null;
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Noul criteria must be { true, false } or omitted.");
  }

  const record = raw as { true?: unknown; false?: unknown };
  return {
    true: record.true === undefined ? undefined : asEntryType(record.true),
    false: record.false === undefined ? undefined : asEntryType(record.false),
  };
}

export function toSdkQuestion(config: PlaygroundQuestion) {
  switch (config.type) {
    case "choice":
      return choice(config.instructions, buildChoiceCriteria(config.criteria));
    case "score":
      return score(config.instructions, buildScoreCriteria(config.criteria));
    case "noul":
      return noul(config.instructions, buildNoulCriteria(config.criteria));
    default: {
      const exhaustive: never = config;
      throw new Error(`Unhandled question type: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function toSdkQuestions(map: QuestionMap): Questions {
  const questions: Questions = {};

  for (const [name, config] of Object.entries(map)) {
    if (!name.trim()) {
      throw new Error("Every question needs a name.");
    }
    questions[name] = toSdkQuestion(config);
  }

  if (Object.keys(questions).length === 0) {
    throw new Error("At least one question is required.");
  }

  return questions;
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
          criteria: Object.fromEntries(
            Object.entries(buildChoiceCriteria(record.criteria)).map(
              ([label, description]) => [label, String(description ?? "")],
            ),
          ),
        };
        break;
      case "score": {
        const criteria = buildScoreCriteria(record.criteria).map((level) =>
          String(level ?? ""),
        ) as [string, string, ...string[]];
        map[name] = {
          type: "score",
          instructions,
          criteria,
        };
        break;
      }
      case "noul": {
        const noulCriteria = buildNoulCriteria(record.criteria);
        map[name] = {
          type: "noul",
          instructions,
          criteria: noulCriteria
            ? {
                true:
                  noulCriteria.true === undefined || noulCriteria.true === null
                    ? undefined
                    : String(noulCriteria.true),
                false:
                  noulCriteria.false === undefined || noulCriteria.false === null
                    ? undefined
                    : String(noulCriteria.false),
              }
            : undefined,
        };
        break;
      }
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
