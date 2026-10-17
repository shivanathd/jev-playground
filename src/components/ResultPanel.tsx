import { JsonBlock } from "@/components/JsonBlock";
import type {
  BoxAnswer,
  BranchDecision,
  PlaygroundAnswer,
  SystemOnePayload,
  SystemOneSuccess,
} from "@/lib/types";

type ResultPanelProps = {
  error: string | null;
  running: boolean;
  request: SystemOnePayload | null;
  response: SystemOneSuccess | null;
  branch: BranchDecision | null;
  imageUrl?: string | null;
};

export function ResultPanel({
  error,
  running,
  request,
  response,
  branch,
  imageUrl = null,
}: ResultPanelProps) {
  return (
    <section className="rounded-sm border border-line bg-panel p-4 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight">Decision slip</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          live
        </span>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-sm border border-fail/40 bg-fail/10 px-3 py-2 text-sm leading-6 text-[#f3c7c2]"
        >
          {error}
        </p>
      ) : null}

      {running ? (
        <p className="mb-4 font-mono text-sm text-brass">Running System One…</p>
      ) : null}

      {branch ? <BranchCard branch={branch} /> : null}

      {response ? (
        <div className="mt-5 grid gap-3">
          {Object.entries(response.answers).map(([name, answer]) => (
            <AnswerCard key={name} name={name} answer={answer} imageUrl={imageUrl} />
          ))}
          <p className="font-mono text-[12px] text-muted">
            model {response.model}
            {response.usage
              ? ` · in ${response.usage.input_tokens} · out ${response.usage.output_tokens}`
              : ""}
          </p>
        </div>
      ) : null}

      {!running && !error && !response ? (
        <p className="text-sm leading-6 text-muted">
          Run a gate to stamp Choice, Score, Noul, and Box onto this slip. Empty or
          invalid keys fail loudly. Nothing is silent.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <JsonBlock label="Request JSON" value={request ?? { notice: "No run yet." }} />
        <JsonBlock
          label="Response JSON"
          value={
            error
              ? { error }
              : (response ?? { notice: "No response yet." })
          }
        />
      </div>
    </section>
  );
}

function BranchCard({ branch }: { branch: BranchDecision }) {
  const tone =
    branch.tone === "go"
      ? "border-go/50 bg-go/10 text-[#d7eedc]"
      : branch.tone === "hold"
        ? "border-hold/50 bg-hold/10 text-[#f3d3c0]"
        : "border-fail/50 bg-fail/10 text-[#f3c7c2]";

  return (
    <article className={`rounded-sm border px-3 py-3 ${tone}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
          {branch.failClosed ? "fail closed" : "branch"}
        </span>
        <strong className="font-display text-lg tracking-tight">
          {branch.action}
        </strong>
      </div>
      <p className="text-sm leading-6">{branch.reason}</p>
      <h3 className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] opacity-80">
        Suggested code branch
      </h3>
      <pre className="mt-1 overflow-auto rounded-sm bg-ink/50 p-3 font-mono text-[12px] leading-5">
        {branch.code}
      </pre>
    </article>
  );
}

function AnswerCard({
  name,
  answer,
  imageUrl,
}: {
  name: string;
  answer: PlaygroundAnswer;
  imageUrl: string | null;
}) {
  return (
    <article className="rounded-sm border border-line bg-panel-2 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-brass">
          {answer.type}
        </span>
        <span className="font-mono text-sm">{name}</span>
      </div>
      <AnswerBody answer={answer} imageUrl={imageUrl} />
    </article>
  );
}

function AnswerBody({
  answer,
  imageUrl,
}: {
  answer: PlaygroundAnswer;
  imageUrl: string | null;
}) {
  switch (answer.type) {
    case "choice":
      return (
        <div>
          <p className="text-lg text-paper">
            {answer.choice}
            <span className="ml-2 font-mono text-sm text-muted">
              confidence {answer.confidence.toFixed(3)}
            </span>
          </p>
          <ProbabilityBars values={answer.probabilities} />
        </div>
      );
    case "score":
      return (
        <div>
          <p className="text-lg text-paper">
            {answer.score.toFixed(3)}
            <span className="ml-2 font-mono text-sm text-muted">
              confidence {answer.confidence.toFixed(3)}
            </span>
          </p>
          <ProbabilityBars
            values={Object.fromEntries(
              Object.entries(answer.probabilities).map(([key, value]) => [
                `${key}${answer.legend[key] ? ` ${answer.legend[key]}` : ""}`,
                value,
              ]),
            )}
          />
        </div>
      );
    case "noul":
      return (
        <div>
          <p className="mb-2 text-lg text-paper">
            {answer.noul.toFixed(3)}
            <span className="ml-2 font-mono text-sm text-muted">
              P(true)
            </span>
          </p>
          <div className="gauge-track relative h-2 overflow-hidden rounded-full">
            <span
              className="absolute top-[-5px] h-4 w-0.5 bg-paper"
              style={{ left: `${Math.min(100, Math.max(0, answer.noul * 100))}%` }}
            />
          </div>
        </div>
      );
    case "box":
      return <BoxBody answer={answer} imageUrl={imageUrl} />;
    default: {
      const exhaustive: never = answer;
      return exhaustive;
    }
  }
}

// A Box answer is always a box, even when nothing is there. Below this confidence, treat it as not found.
const BOX_FOUND = 0.5;

function BoxBody({ answer, imageUrl }: { answer: BoxAnswer; imageUrl: string | null }) {
  const { top, bottom, left, right } = answer.box;
  const pct = (value: number) => `${(Math.min(1, Math.max(0, value)) * 100).toFixed(1)}%`;
  const found = answer.confidence !== null && answer.confidence >= BOX_FOUND;
  return (
    <div>
      <p className="font-mono text-sm text-paper">
        top {top.toFixed(2)} · bottom {bottom.toFixed(2)} · left {left.toFixed(2)} · right{" "}
        {right.toFixed(2)}
        <span className="ml-2 text-muted">
          confidence {answer.confidence === null ? "n/a" : answer.confidence.toFixed(3)}
        </span>
      </p>
      {!found ? (
        <p className="mt-1 text-sm text-muted" data-testid="box-not-found">
          Not found: confidence is under {BOX_FOUND}. Jev always returns a box, so a low-confidence box marks
          nothing. Ask a Noul about whether it is there.
        </p>
      ) : null}
      {imageUrl && found ? (
        <div className="relative mt-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL preview */}
          <img src={imageUrl} alt="" className="max-h-72 rounded-sm" />
          <span
            className="absolute border-2 border-brass bg-brass/10"
            style={{
              top: pct(top),
              left: pct(left),
              height: pct(bottom - top),
              width: pct(right - left),
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProbabilityBars({ values }: { values: Record<string, number> }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {Object.entries(values).map(([label, value]) => (
        <li key={label}>
          <div className="mb-0.5 flex justify-between gap-3 font-mono text-[11px] text-muted">
            <span>{label}</span>
            <span>{value.toFixed(3)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink">
            <div
              className="h-full bg-sage"
              style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
