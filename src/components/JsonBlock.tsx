type JsonBlockProps = {
  label: string;
  value: unknown;
};

export function JsonBlock({ label, value }: JsonBlockProps) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </h3>
      <pre className="max-h-72 overflow-auto rounded-sm border border-line bg-ink p-3 font-mono text-[12px] leading-5 text-paper/90">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
