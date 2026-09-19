type StatePanelProps = {
  hint: string;
  value: string;
  onChange: (value: string) => void;
};

export function StatePanel({ hint, value, onChange }: StatePanelProps) {
  return (
    <section className="rounded-sm border border-line bg-paper p-4 text-paper-ink md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight">State in</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-ink/50">
          unstructured
        </span>
      </div>
      <p className="mb-3 text-sm leading-6 text-paper-ink/70">{hint}</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        rows={12}
        className="w-full resize-y rounded-sm border border-paper-ink/15 bg-[#f4eedd] px-3 py-2 font-mono text-[13px] leading-6 text-paper-ink"
      />
    </section>
  );
}
