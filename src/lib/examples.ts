import type { ExampleId, ExampleSpec } from "@/lib/types";

export const EXAMPLES: ExampleSpec[] = [
  {
    id: "tool-call",
    order: "01",
    title: "Coding agent: tool-call gate",
    shortTitle: "Tool call",
    blurb:
      "Claude or Codex proposes a command. Jev owns allow, confirm, or deny before the harness runs it.",
    stateHint:
      "Proposed command, repo rules, and the last error. The LLM still writes the plan.",
    defaultState: {
      proposed_command:
        "git push --force origin main && ./scripts/migrate_prod.sh",
      repo_rules: [
        "No force-push to main",
        "Production migrations require a human",
        "Do not run rm -rf or chmod -R on the repo root",
      ],
      last_error:
        "migrate_prod.sh refused: DATABASE_URL points at prod-primary",
      harness: "coding-agent",
    },
    questions: {
      decision: {
        type: "choice",
        instructions:
          "Should the harness run this proposed command as written?",
        criteria: {
          allow: "Safe to run without a human",
          allow_with_confirm: "Runnable only after an explicit human confirm",
          deny: "Do not run. Stop and ask a human.",
        },
      },
      changes_production: {
        type: "noul",
        instructions:
          "This command changes production or shared state (force-push, migrate, delete, chmod, or live credentials).",
        criteria: {
          true: "Touches prod, shared infra, or irreversible repo state",
          false: "Local, reversible, or read-only",
        },
      },
    },
    editableQuestions: false,
  },
  {
    id: "model-tier",
    order: "02",
    title: "Coding agent: model-tier pick",
    shortTitle: "Model tier",
    blurb:
      "Cheap path for rename-and-test. Expensive path for auth or payments. Human when undo is hard and confidence is thin.",
    stateHint: "Task brief, file count, whether tests exist, and the hot paths.",
    defaultState: {
      task: "Add a payment webhook that updates invoice status and retries Stripe events",
      file_count: 18,
      tests_exist: false,
      paths: ["app/api/stripe/webhook/route.ts", "lib/billing.ts"],
    },
    questions: {
      tier: {
        type: "choice",
        instructions:
          "Which model tier should take the next step on this coding task?",
        criteria: {
          fast: "Narrow, well-tested change a small model can finish",
          reasoning: "Needs a stronger reasoning model (auth, payments, concurrency)",
          human: "A person should take the next step",
        },
      },
      undo_difficulty: {
        type: "score",
        instructions: "How hard is it to undo a wrong answer on this task?",
        criteria: [
          "Trivial: rename a file or fix a test",
          "Recoverable: a revert or migration rollback exists",
          "Painful: auth, payments, or live customer money",
        ],
      },
    },
    editableQuestions: false,
  },
  {
    id: "pr-gate",
    order: "03",
    title: "PR / review gate",
    shortTitle: "PR gate",
    blurb:
      "The bot can still draft the review comment with an LLM. Jev decides whether that bot is allowed to say LGTM.",
    stateHint: "PR title, diff summary, failing checks, and risk notes.",
    defaultState: {
      title: "feat: add account deletion endpoint",
      diff_summary:
        "Adds DELETE /api/account, touches auth session invalidation and a hard delete of user rows",
      failing_checks: ["typecheck"],
      risk_notes: "Deletes PII. No soft-delete. Auth middleware updated.",
    },
    questions: {
      review: {
        type: "choice",
        instructions: "What should the review bot do with this pull request?",
        criteria: {
          merge: "Safe to approve and merge",
          request_changes: "Block merge until the author changes the diff",
          needs_security_review: "Hold for a security reviewer",
        },
      },
      sensitive_paths: {
        type: "noul",
        instructions:
          "This change touches auth, payments, or data deletion.",
        criteria: {
          true: "Auth, payments, PII delete, or session invalidation",
          false: "No sensitive control plane",
        },
      },
    },
    editableQuestions: false,
  },
  {
    id: "crm-routing",
    order: "04",
    title: "Salesforce / CRM case routing",
    shortTitle: "CRM route",
    blurb:
      "Route in Flow or an agent only when confidence clears your bar. Otherwise leave it in the human queue.",
    stateHint: "Case subject, description, account tier. No free-text generation.",
    defaultState: {
      subject: "Stripe payouts failing for 3 days",
      description:
        "Enterprise account. Checkout works. Payouts to bank fail. Losing sales. Need this today.",
      account_tier: "enterprise",
      sla_hours_remaining: 2,
    },
    questions: {
      queue: {
        type: "choice",
        instructions: "Which queue should own this case?",
        criteria: {
          billing: "Payments, invoicing, refunds, payouts",
          technical: "Bugs, outages, integrations",
          success: "Adoption, training, or account health",
          spam: "Not a real customer request",
        },
      },
      blocked: {
        type: "score",
        instructions: "How angry or blocked is the customer?",
        criteria: [
          "Calm, just stating facts",
          "Frustrated but civil",
          "Blocked and losing money, or furious",
        ],
      },
      sla_at_risk: {
        type: "noul",
        instructions: "SLA is already at risk on this case.",
        criteria: {
          true: "Deadline is close or already missed",
          false: "Plenty of SLA time remains",
        },
      },
    },
    editableQuestions: false,
  },
  {
    id: "slack-triage",
    order: "05",
    title: "Slack triage",
    shortTitle: "Slack",
    blurb:
      "High Noul plus high Score means notify now. Otherwise batch into a morning digest. Claude can draft later.",
    stateHint: "Message text, channel purpose, and whether you were mentioned.",
    defaultState: {
      text: "@shiv prod checkout 5xx since 14:10 UTC. Customers posting in #alerts.",
      channel: "#incidents",
      channel_purpose: "Page-worthy production incidents only",
      mentioned: true,
    },
    questions: {
      interrupt: {
        type: "choice",
        instructions:
          "Should this Slack message interrupt someone now, wait for a digest, or be ignored?",
        criteria: {
          interrupt: "Page or notify now",
          digest: "Batch into a later digest",
          ignore: "No action",
        },
      },
      needs_same_day: {
        type: "noul",
        instructions: "This needs a same-day reply from me.",
        criteria: {
          true: "Time-sensitive and aimed at me",
          false: "Can wait or is not mine",
        },
      },
      blast_radius: {
        type: "score",
        instructions: "Blast radius if this message is ignored.",
        criteria: [
          "None: noise or FYI",
          "Local: one team or one customer",
          "Company-wide: prod money or many customers",
        ],
      },
    },
    editableQuestions: false,
  },
  {
    id: "publish-hold",
    order: "06",
    title: "Publish vs hold",
    shortTitle: "Publish",
    blurb:
      "Put the decision in System One. Keep the drafting in the LLM. Fail closed when the draft looks thin.",
    stateHint:
      "Draft summary, stop-slop score, missing sources, fabricated URL flags.",
    defaultState: {
      draft_summary:
        "Changelog claims the new export API is generally available and lists three customer logos.",
      stop_slop_score: 0.41,
      missing_sources: ["GA announcement", "logo usage approval"],
      live_urls_fabricated: true,
    },
    questions: {
      publish: {
        type: "choice",
        instructions: "What should happen to this agent draft?",
        criteria: {
          publish: "Safe to ship as written",
          hold: "Do not publish. Fix or gather sources first.",
          escalate: "A human editor must review before any send",
        },
      },
      leakage_or_claims: {
        type: "noul",
        instructions:
          "This draft contains unverified claims or private leakage risk.",
        criteria: {
          true: "Unsourced claims, private data, or fabricated URLs",
          false: "Claims look sourced and non-sensitive",
        },
      },
      retract_cost: {
        type: "score",
        instructions: "How public is this, and how hard is it to retract?",
        criteria: [
          "Internal only, easy to edit",
          "Customer-visible, fixable with a follow-up",
          "Public launch copy that is hard to walk back",
        ],
      },
    },
    editableQuestions: false,
  },
  {
    id: "recruiting",
    order: "07",
    title: "Recruiting screen",
    shortTitle: "Recruiting",
    blurb:
      "Bounded screen only. Low confidence goes to a human. This playground never auto-rejects.",
    stateHint: "Resume bullets plus must-haves from the job description.",
    defaultState: {
      resume_bullets: [
        "4 years TypeScript",
        "Shipped billing jobs, no Salesforce",
        "On-call for a 20-person SaaS",
      ],
      must_haves: [
        "TypeScript",
        "Salesforce Flow or Apex",
        "On-call experience",
      ],
    },
    questions: {
      screen: {
        type: "choice",
        instructions:
          "How should this candidate move relative to the must-have list? Rejection email copy stays with an LLM.",
        criteria: {
          advance: "Clear match on the must-haves",
          hold: "Partial match. A recruiter should read it.",
          reject: "Misses must-haves. Still do not auto-reject in code.",
        },
      },
      role_fit: {
        type: "score",
        instructions: "Role fit against the must-have list.",
        criteria: [
          "Weak: missing most must-haves",
          "Partial: some must-haves, clear gaps",
          "Strong: must-haves are covered",
        ],
      },
    },
    editableQuestions: false,
  },
  {
    id: "primitives",
    order: "08",
    title: "Primitives playground",
    shortTitle: "Primitives",
    blurb:
      "Freeform state plus any mix of Choice, Score, and Noul. Same API. Your code owns the branch.",
    stateHint: "Any string or JSON state. Add or remove questions before you run.",
    defaultState: {
      document: "I was charged twice. Please fix this ASAP.",
    },
    questions: {
      category: {
        type: "choice",
        instructions: "What is this ticket about?",
        criteria: {
          billing: "Payment or subscription issues",
          technical: "Bugs or integration problems",
          other: "Anything else",
        },
      },
      frustration: {
        type: "score",
        instructions: "How frustrated the customer appears",
        criteria: [
          "Calm, just stating facts",
          "Frustrated but civil",
          "Very angry, strong language",
        ],
      },
      urgent: {
        type: "noul",
        instructions: "The message conveys urgency or time-sensitivity",
        criteria: {
          true: "Explicitly time-sensitive",
          false: "No urgency expressed",
        },
      },
    },
    editableQuestions: true,
  },
];

export function exampleById(id: ExampleId): ExampleSpec {
  const found = EXAMPLES.find((example) => example.id === id);
  if (!found) {
    throw new Error(`Unknown example: ${id}`);
  }
  return found;
}

export function isExampleId(value: string): value is ExampleId {
  return EXAMPLES.some((example) => example.id === value);
}
