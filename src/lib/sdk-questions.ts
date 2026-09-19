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
