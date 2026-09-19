import type { PlaygroundQuestion, QuestionMap } from "@/lib/types";

type QuestionsPanelProps = {
  questions: QuestionMap;
};

export function QuestionsPanel({ questions }: QuestionsPanelProps) {
  const entries = Object.entries(questions);

  return (
    <section className="rounded-sm border border-line bg-panel p-4 md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight">
          Choice / Score / Noul
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          one call
        </span>
      </div>
      <div className="grid gap-3">
        {entries.map(([name, question]) => (
          <QuestionCard key={name} name={name} question={question} />
        ))}
      </div>
    </section>
  );
}

function QuestionCard({
  name,
  question,
}: {
  name: string;
  question: PlaygroundQuestion;
}) {
  return (
    <article className="rounded-sm border border-line bg-panel-2 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-brass">
          {question.type}
        </span>
        <span className="font-mono text-sm text-paper">{name}</span>
      </div>
      <p className="text-sm leading-6 text-paper/85">{question.instructions}</p>
      <CriteriaList question={question} />
    </article>
  );
}

function CriteriaList({ question }: { question: PlaygroundQuestion }) {
  switch (question.type) {
    case "choice":
      return (
        <ul className="mt-2 space-y-1 font-mono text-[12px] text-muted">
          {Object.entries(question.criteria).map(([label, description]) => (
            <li key={label}>
              <span className="text-sage">{label}</span>
              {description ? ` · ${description}` : ""}
            </li>
          ))}
        </ul>
      );
    case "score":
      return (
        <ol className="mt-2 list-decimal space-y-1 pl-5 font-mono text-[12px] text-muted">
          {question.criteria.map((level) => (
            <li key={level}>{level}</li>
          ))}
        </ol>
      );
    case "noul":
      return question.criteria ? (
        <ul className="mt-2 space-y-1 font-mono text-[12px] text-muted">
          {question.criteria.true ? <li>true · {question.criteria.true}</li> : null}
          {question.criteria.false ? (
            <li>false · {question.criteria.false}</li>
          ) : null}
        </ul>
      ) : null;
    default: {
      const exhaustive: never = question;
      return exhaustive;
    }
  }
}
