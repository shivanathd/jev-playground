import { emptyQuestion, type QuestionTypeName } from "@/lib/questions";
import type { PlaygroundQuestion, QuestionMap } from "@/lib/types";

type PrimitivesEditorProps = {
  questions: QuestionMap;
  onChange: (questions: QuestionMap) => void;
};

export function PrimitivesEditor({ questions, onChange }: PrimitivesEditorProps) {
  const entries = Object.entries(questions);

  function rename(oldName: string, nextName: string) {
    const next: QuestionMap = {};
    for (const [name, question] of entries) {
      const key = name === oldName ? nextName : name;
      next[key] = question;
    }
    onChange(next);
  }

  function update(name: string, question: PlaygroundQuestion) {
    onChange({ ...questions, [name]: question });
  }

  function remove(name: string) {
    const next = { ...questions };
    delete next[name];
    onChange(next);
  }

  function add(type: QuestionTypeName) {
    let index = entries.length + 1;
    let name = `q${index}`;
    while (questions[name]) {
      index += 1;
      name = `q${index}`;
    }
    onChange({ ...questions, [name]: emptyQuestion(type) });
  }

  return (
    <section className="rounded-sm border border-line bg-panel p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight">Mix primitives</h2>
        <div className="flex flex-wrap gap-2">
          <AddButton label="Add Choice" onClick={() => add("choice")} />
          <AddButton label="Add Score" onClick={() => add("score")} />
          <AddButton label="Add Noul" onClick={() => add("noul")} />
        </div>
      </div>

      <div className="grid gap-3">
        {entries.map(([name, question]) => (
          <article key={name} className="rounded-sm border border-line bg-panel-2 p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(event) => rename(name, event.target.value)}
                className="w-40 rounded-sm border border-line bg-ink px-2 py-1 font-mono text-sm"
                aria-label="Question name"
              />
              <select
                value={question.type}
                onChange={(event) =>
                  update(name, emptyQuestion(event.target.value as QuestionTypeName))
                }
                className="rounded-sm border border-line bg-ink px-2 py-1 font-mono text-sm"
                aria-label="Question type"
              >
                <option value="choice">choice</option>
                <option value="score">score</option>
                <option value="noul">noul</option>
              </select>
              <button
                type="button"
                onClick={() => remove(name)}
                className="ml-auto font-mono text-[11px] uppercase tracking-wider text-fail"
              >
                Remove
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Instructions
              </span>
              <textarea
                value={question.instructions}
                onChange={(event) =>
                  update(name, { ...question, instructions: event.target.value })
                }
                rows={2}
                className="w-full rounded-sm border border-line bg-ink px-2 py-1.5 text-sm"
              />
            </label>
            <CriteriaEditor
              question={question}
              onChange={(next) => update(name, next)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border border-line px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-paper"
    >
      {label}
    </button>
  );
}

function CriteriaEditor({
  question,
  onChange,
}: {
  question: PlaygroundQuestion;
  onChange: (question: PlaygroundQuestion) => void;
}) {
  switch (question.type) {
    case "choice":
      return (
        <div className="mt-3 space-y-2">
          {Object.entries(question.criteria).map(([label, description]) => (
            <div key={label} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
              <input
                value={label}
                onChange={(event) => {
                  const next = { ...question.criteria };
                  delete next[label];
                  next[event.target.value] = description;
                  onChange({ ...question, criteria: next });
                }}
                className="rounded-sm border border-line bg-ink px-2 py-1 font-mono text-sm"
                aria-label="Choice label"
              />
              <input
                value={description}
                onChange={(event) =>
                  onChange({
                    ...question,
                    criteria: { ...question.criteria, [label]: event.target.value },
                  })
                }
                className="rounded-sm border border-line bg-ink px-2 py-1 text-sm"
                aria-label="Choice description"
              />
              <button
                type="button"
                onClick={() => {
                  const next = { ...question.criteria };
                  delete next[label];
                  onChange({ ...question, criteria: next });
                }}
                className="font-mono text-[11px] uppercase tracking-wider text-muted"
              >
                Drop
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...question,
                criteria: {
                  ...question.criteria,
                  [`lane_${Object.keys(question.criteria).length + 1}`]: "",
                },
              })
            }
            className="font-mono text-[11px] uppercase tracking-wider text-sage"
          >
            Add lane
          </button>
        </div>
      );
    case "score":
      return (
        <div className="mt-3 space-y-2">
          {question.criteria.map((level, index) => (
            <div key={`${level}-${index}`} className="flex gap-2">
              <span className="w-6 pt-1 font-mono text-xs text-muted">{index}</span>
              <input
                value={level}
                onChange={(event) => {
                  const next = [...question.criteria] as typeof question.criteria;
                  next[index] = event.target.value;
                  onChange({ ...question, criteria: next });
                }}
                className="w-full rounded-sm border border-line bg-ink px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      );
    case "noul":
      return (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label>
            <span className="mb-1 block font-mono text-[11px] uppercase text-muted">
              true
            </span>
            <input
              value={question.criteria?.true ?? ""}
              onChange={(event) =>
                onChange({
                  ...question,
                  criteria: { ...question.criteria, true: event.target.value },
                })
              }
              className="w-full rounded-sm border border-line bg-ink px-2 py-1 text-sm"
            />
          </label>
          <label>
            <span className="mb-1 block font-mono text-[11px] uppercase text-muted">
              false
            </span>
            <input
              value={question.criteria?.false ?? ""}
              onChange={(event) =>
                onChange({
                  ...question,
                  criteria: { ...question.criteria, false: event.target.value },
                })
              }
              className="w-full rounded-sm border border-line bg-ink px-2 py-1 text-sm"
            />
          </label>
        </div>
      );
    default: {
      const exhaustive: never = question;
      return exhaustive;
    }
  }
}
