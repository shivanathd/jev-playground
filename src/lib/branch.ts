import type {
  BranchDecision,
  ChoiceAnswer,
  ExampleId,
  NoulAnswer,
  PlaygroundAnswer,
  ScoreAnswer,
} from "@/lib/types";

const THIN_CONFIDENCE = 0.7;
const RECRUIT_CONFIDENCE = 0.75;
const HIGH_NOUL = 0.7;
const HIGH_SCORE = 1.5;

function isChoice(answer: PlaygroundAnswer | undefined): answer is ChoiceAnswer {
  return answer?.type === "choice";
}

function isScore(answer: PlaygroundAnswer | undefined): answer is ScoreAnswer {
  return answer?.type === "score";
}

function isNoul(answer: PlaygroundAnswer | undefined): answer is NoulAnswer {
  return answer?.type === "noul";
}

function snippet(lines: string[]): string {
  return lines.join("\n");
}

function failClosed(
  action: string,
  reason: string,
  code: string,
): BranchDecision {
  return {
    action,
    reason,
    tone: "fail",
    failClosed: true,
    code,
  };
}

function hold(action: string, reason: string, code: string): BranchDecision {
  return {
    action,
    reason,
    tone: "hold",
    failClosed: false,
    code,
  };
}

function go(action: string, reason: string, code: string): BranchDecision {
  return {
    action,
    reason,
    tone: "go",
    failClosed: false,
    code,
  };
}

function genericCode(): string {
  return snippet([
    "const answers = response.answers;",
    "const thin = Object.values(answers).some((answer) => {",
    "  if (answer.type === \"noul\") return false;",
    `  return answer.confidence < ${THIN_CONFIDENCE};`,
    "});",
    "if (thin) {",
    "  escalateToHuman(state); // fail closed",
    "  return;",
    "}",
    "// Branch on answers[name].choice | .score | .noul",
  ]);
}

export function decideBranch(
  exampleId: ExampleId,
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  switch (exampleId) {
    case "tool-call":
      return decideToolCall(answers);
    case "model-tier":
      return decideModelTier(answers);
    case "pr-gate":
      return decidePrGate(answers);
    case "crm-routing":
      return decideCrm(answers);
    case "slack-triage":
      return decideSlack(answers);
    case "publish-hold":
      return decidePublish(answers);
    case "recruiting":
      return decideRecruiting(answers);
    case "primitives":
      return decidePrimitives(answers);
    default: {
      const exhaustive: never = exampleId;
      throw new Error(`Unhandled example: ${String(exhaustive)}`);
    }
  }
}

function decideToolCall(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const decision = answers.decision;
  const prod = answers.changes_production;
  const code = snippet([
    "const decision = response.answers.decision;",
    "const prod = response.answers.changes_production;",
    `if (decision.confidence < ${THIN_CONFIDENCE}) {`,
    "  askHuman(state); // fail closed",
    "  return;",
    "}",
    `if (prod.noul >= ${HIGH_NOUL} && decision.choice !== "deny") {`,
    "  askHuman(state);",
    "  return;",
    "}",
    "switch (decision.choice) {",
    "  case \"allow\": return run(state.proposed_command);",
    "  case \"allow_with_confirm\": return confirmThenRun(state);",
    "  case \"deny\": return block(state);",
    "  default: { const _never: never = decision.choice; throw _never; }",
    "}",
  ]);

  if (!isChoice(decision)) {
    return failClosed("ask_human", "Choice answer missing. Fail closed.", code);
  }
  if (decision.confidence < THIN_CONFIDENCE) {
    return failClosed(
      "ask_human",
      `Choice confidence ${decision.confidence.toFixed(2)} is under ${THIN_CONFIDENCE}. The harness does not run.`,
      code,
    );
  }
  if (isNoul(prod) && prod.noul >= HIGH_NOUL && decision.choice !== "deny") {
    return hold(
      "ask_human",
      `Noul "changes production" is ${prod.noul.toFixed(2)}. Stop even if Choice said ${decision.choice}.`,
      code,
    );
  }
  if (decision.choice === "deny") {
    return failClosed("deny", "Choice is deny. The harness does not run.", code);
  }
  if (decision.choice === "allow_with_confirm") {
    return hold(
      "allow_with_confirm",
      "Runnable only after an explicit human confirm.",
      code,
    );
  }
  return go("allow", "Choice is allow and confidence cleared the bar.", code);
}

function decideModelTier(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const tier = answers.tier;
  const undo = answers.undo_difficulty;
  const code = snippet([
    "const tier = response.answers.tier;",
    "const undo = response.answers.undo_difficulty;",
    `if (tier.confidence < ${THIN_CONFIDENCE}) {`,
    "  return assignHuman(state);",
    "}",
    `if (undo.score >= ${HIGH_SCORE} && tier.confidence < 0.85) {`,
    "  return assignHuman(state);",
    "}",
    "return routeToModel(tier.choice);",
  ]);

  if (!isChoice(tier)) {
    return failClosed("human", "Tier Choice missing. Fail closed to a human.", code);
  }
  if (tier.confidence < THIN_CONFIDENCE) {
    return failClosed(
      "human",
      `Tier confidence ${tier.confidence.toFixed(2)} is thin. Do not spend tokens guessing.`,
      code,
    );
  }
  if (isScore(undo) && undo.score >= HIGH_SCORE && tier.confidence < 0.85) {
    return hold(
      "human",
      `Undo-difficulty ${undo.score.toFixed(2)} is high and confidence is only ${tier.confidence.toFixed(2)}. Human path.`,
      code,
    );
  }
  if (tier.choice === "human") {
    return hold("human", "Choice picked the human lane.", code);
  }
  if (tier.choice === "reasoning") {
    return hold(
      "reasoning",
      "Use the reasoning model. Still a software branch, not a chat verdict.",
      code,
    );
  }
  return go("fast", "Cheap path. Rename-and-test territory.", code);
}

function decidePrGate(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const review = answers.review;
  const sensitive = answers.sensitive_paths;
  const code = snippet([
    "const review = response.answers.review;",
    "const sensitive = response.answers.sensitive_paths;",
    `if (review.confidence < ${THIN_CONFIDENCE}) {`,
    "  return holdForHuman(pr);",
    "}",
    `if (sensitive.noul >= ${HIGH_NOUL}) {`,
    "  return needsSecurityReview(pr);",
    "}",
    "return applyReview(review.choice);",
  ]);

  if (!isChoice(review)) {
    return failClosed("hold_for_human", "Review Choice missing.", code);
  }
  if (review.confidence < THIN_CONFIDENCE) {
    return failClosed(
      "hold_for_human",
      `Review confidence ${review.confidence.toFixed(2)} is under ${THIN_CONFIDENCE}. The bot does not LGTM.`,
      code,
    );
  }
  if (isNoul(sensitive) && sensitive.noul >= HIGH_NOUL) {
    return hold(
      "needs_security_review",
      `Noul on auth/payments/delete is ${sensitive.noul.toFixed(2)}. Security review before LGTM.`,
      code,
    );
  }
  if (review.choice === "merge") {
    return go("merge", "Choice is merge and sensitive-path Noul stayed low.", code);
  }
  if (review.choice === "needs_security_review") {
    return hold("needs_security_review", "Choice asked for security review.", code);
  }
  return hold("request_changes", "Choice is request_changes. Bot drafts the comment. Jev blocked LGTM.", code);
}

function decideCrm(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const queue = answers.queue;
  const blocked = answers.blocked;
  const sla = answers.sla_at_risk;
  const code = snippet([
    "const queue = response.answers.queue;",
    "const sla = response.answers.sla_at_risk;",
    `if (queue.confidence < ${THIN_CONFIDENCE}) {`,
    "  return leaveInHumanQueue(caseRecord);",
    "}",
    `if (sla.noul >= ${HIGH_NOUL}) {`,
    "  return escalate(queue.choice, { sla: true });",
    "}",
    "return route(queue.choice, { blocked: response.answers.blocked.score });",
  ]);

  if (!isChoice(queue)) {
    return failClosed("human_queue", "Queue Choice missing.", code);
  }
  if (queue.confidence < THIN_CONFIDENCE) {
    return failClosed(
      "human_queue",
      `Queue confidence ${queue.confidence.toFixed(2)} is thin. Leave the case in the human queue.`,
      code,
    );
  }
  if (queue.choice === "spam") {
    return go("spam", "Choice is spam. Still reversible if a human disagrees.", code);
  }
  if (isNoul(sla) && sla.noul >= HIGH_NOUL) {
    return hold(
      `escalate_${queue.choice}`,
      `SLA Noul is ${sla.noul.toFixed(2)}. Route to ${queue.choice} and page.`,
      code,
    );
  }
  const blockedNote = isScore(blocked)
    ? ` Blocked score ${blocked.score.toFixed(2)}.`
    : "";
  return go(
    `route_${queue.choice}`,
    `Route to ${queue.choice}.${blockedNote}`,
    code,
  );
}

function decideSlack(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const interrupt = answers.interrupt;
  const sameDay = answers.needs_same_day;
  const blast = answers.blast_radius;
  const code = snippet([
    "const interrupt = response.answers.interrupt;",
    "const sameDay = response.answers.needs_same_day;",
    "const blast = response.answers.blast_radius;",
    `if (interrupt.confidence < ${THIN_CONFIDENCE}) {`,
    "  return digest(message); // fail closed: do not page on a coin toss",
    "}",
    `if (sameDay.noul >= ${HIGH_NOUL} && blast.score >= ${HIGH_SCORE}) {`,
    "  return notifyNow(message);",
    "}",
    "return digest(message);",
  ]);

  if (!isChoice(interrupt)) {
    return failClosed("digest", "Interrupt Choice missing. Batch, do not page.", code);
  }
  if (interrupt.confidence < THIN_CONFIDENCE) {
    return failClosed(
      "digest",
      `Interrupt confidence ${interrupt.confidence.toFixed(2)} is thin. Do not page on a coin toss.`,
      code,
    );
  }
  const noulHigh = isNoul(sameDay) && sameDay.noul >= HIGH_NOUL;
  const scoreHigh = isScore(blast) && blast.score >= HIGH_SCORE;
  if (noulHigh && scoreHigh) {
    return hold(
      "interrupt",
      `Same-day Noul ${isNoul(sameDay) ? sameDay.noul.toFixed(2) : "?"} and blast ${isScore(blast) ? blast.score.toFixed(2) : "?"}. Notify now.`,
      code,
    );
  }
  if (interrupt.choice === "interrupt" && (noulHigh || scoreHigh)) {
    return hold("interrupt", "Choice is interrupt and at least one intensity signal is high.", code);
  }
  if (interrupt.choice === "ignore") {
    return go("ignore", "Choice is ignore. No digest item.", code);
  }
  return go("digest", "Batch into the morning digest. Claude can draft later.", code);
}

function decidePublish(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const publish = answers.publish;
  const leak = answers.leakage_or_claims;
  const retract = answers.retract_cost;
  const code = snippet([
    "const publish = response.answers.publish;",
    "const leak = response.answers.leakage_or_claims;",
    `if (publish.confidence < ${THIN_CONFIDENCE}) {`,
    "  return escalate(draft);",
    "}",
    `if (leak.noul >= ${HIGH_NOUL}) {`,
    "  return hold(draft);",
    "}",
    "return apply(publish.choice);",
  ]);

  if (!isChoice(publish)) {
    return failClosed("escalate", "Publish Choice missing.", code);
  }
  if (publish.confidence < THIN_CONFIDENCE) {
    return failClosed(
      "escalate",
      `Publish confidence ${publish.confidence.toFixed(2)} is thin. A human editor owns the send.`,
      code,
    );
  }
  if (isNoul(leak) && leak.noul >= HIGH_NOUL) {
    return hold(
      "hold",
      `Unverified-claim Noul is ${leak.noul.toFixed(2)}. Do not publish.`,
      code,
    );
  }
  if (publish.choice === "publish") {
    const retractNote = isScore(retract)
      ? ` Retract-cost ${retract.score.toFixed(2)}.`
      : "";
    return go("publish", `Choice is publish and leakage Noul stayed low.${retractNote}`, code);
  }
  if (publish.choice === "escalate") {
    return hold("escalate", "Choice asked for a human editor.", code);
  }
  return hold("hold", "Choice is hold. Drafting stays with the LLM. Send stays blocked.", code);
}

function decideRecruiting(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const screen = answers.screen;
  const fit = answers.role_fit;
  const code = snippet([
    "const screen = response.answers.screen;",
    "const fit = response.answers.role_fit;",
    `if (screen.confidence < ${RECRUIT_CONFIDENCE}) {`,
    "  return humanReview(candidate); // never auto-reject on thin confidence",
    "}",
    "if (screen.choice === \"reject\") {",
    "  return humanReview(candidate); // this playground never auto-rejects",
    "}",
    "if (screen.choice === \"advance\" && fit.score >= 1.5) {",
    "  return advance(candidate);",
    "}",
    "return holdForRecruiter(candidate);",
  ]);

  if (!isChoice(screen)) {
    return failClosed("human_review", "Screen Choice missing. Human reads it.", code);
  }
  if (screen.confidence < RECRUIT_CONFIDENCE) {
    return failClosed(
      "human_review",
      `Screen confidence ${screen.confidence.toFixed(2)} is under ${RECRUIT_CONFIDENCE}. Never auto-reject on thin confidence.`,
      code,
    );
  }
  if (screen.choice === "reject") {
    return hold(
      "human_review",
      "Choice said reject. Code still sends this to a human. Rejection email copy stays with an LLM.",
      code,
    );
  }
  if (screen.choice === "advance" && (!isScore(fit) || fit.score >= 1.5)) {
    return go(
      "advance",
      `Advance. Role-fit ${isScore(fit) ? fit.score.toFixed(2) : "n/a"}.`,
      code,
    );
  }
  return hold("hold", "Partial match. A recruiter should read it.", code);
}

function decidePrimitives(
  answers: Record<string, PlaygroundAnswer>,
): BranchDecision {
  const code = genericCode();
  const thin = Object.values(answers).some((answer) => {
    if (answer.type === "noul") {
      return false;
    }
    return answer.confidence < THIN_CONFIDENCE;
  });

  if (thin) {
    return failClosed(
      "escalate",
      `At least one Choice or Score is under ${THIN_CONFIDENCE}. Fail closed and escalate.`,
      code,
    );
  }

  const parts = Object.entries(answers).map(([name, answer]) => {
    switch (answer.type) {
      case "choice":
        return `${name}=${answer.choice}`;
      case "score":
        return `${name}=${answer.score.toFixed(2)}`;
      case "noul":
        return `${name}=${answer.noul.toFixed(2)}`;
      default: {
        const exhaustive: never = answer;
        return String(exhaustive);
      }
    }
  });

  return go("act", `Confidence cleared ${THIN_CONFIDENCE}. ${parts.join(" · ")}`, code);
}
