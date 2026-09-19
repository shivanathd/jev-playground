import type { EntryType as SdkEntryType } from "@typesafe-ai/sdk";

export type EntryType = SdkEntryType;

export type JevModel = "jev-1.13.0" | "jev-latest";

export const DEFAULT_MODEL: JevModel = "jev-1.13.0";

export type ExampleId =
  | "tool-call"
  | "model-tier"
  | "pr-gate"
  | "crm-routing"
  | "slack-triage"
  | "publish-hold"
  | "recruiting"
  | "primitives";

export type ChoiceQuestionConfig = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type ScoreQuestionConfig = {
  type: "score";
  instructions: string;
  criteria: [string, string, ...string[]];
};

export type NoulQuestionConfig = {
  type: "noul";
  instructions: string;
  criteria?: {
    true?: string;
    false?: string;
  };
};

export type PlaygroundQuestion =
  | ChoiceQuestionConfig
  | ScoreQuestionConfig
  | NoulQuestionConfig;

export type QuestionMap = Record<string, PlaygroundQuestion>;

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
};

export type PlaygroundAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export type SystemOneSuccess = {
  model: string;
  answers: Record<string, PlaygroundAnswer>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
};

export type SystemOnePayload = {
  state: EntryType;
  model: JevModel;
  questions: QuestionMap;
};

export type BranchTone = "go" | "hold" | "fail";

export type BranchDecision = {
  action: string;
  reason: string;
  tone: BranchTone;
  failClosed: boolean;
  code: string;
};

export type ExampleSpec = {
  id: ExampleId;
  order: string;
  title: string;
  shortTitle: string;
  blurb: string;
  stateHint: string;
  defaultState: EntryType;
  questions: QuestionMap;
  editableQuestions: boolean;
};
