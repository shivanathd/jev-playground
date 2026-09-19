import type { ExampleId, ExampleSpec } from "@/lib/types";

type WorkOrderNavProps = {
  examples: ExampleSpec[];
  activeId: ExampleId;
  onSelect: (id: ExampleId) => void;
};

export function WorkOrderNav({
  examples,
  activeId,
  onSelect,
}: WorkOrderNavProps) {
  return (
    <nav aria-label="Work orders" className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {examples.map((example) => (
          <OrderButton
            key={example.id}
            example={example}
            active={example.id === activeId}
            onSelect={onSelect}
            compact
          />
        ))}
      </div>
      <div className="hidden lg:flex lg:flex-col lg:gap-1.5">
        {examples.map((example) => (
          <OrderButton
            key={example.id}
            example={example}
            active={example.id === activeId}
            onSelect={onSelect}
            compact={false}
          />
        ))}
      </div>
    </nav>
  );
}

function OrderButton({
  example,
  active,
  onSelect,
  compact,
}: {
  example: ExampleSpec;
  active: boolean;
  onSelect: (id: ExampleId) => void;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(example.id)}
      className={`rounded-sm border px-3 py-2 text-left transition-colors ${
        active
          ? "border-brass bg-brass/15 text-paper"
          : "border-line bg-panel text-muted hover:border-sage/50 hover:text-paper"
      } ${compact ? "shrink-0" : "w-full"}`}
    >
      <span className="block font-mono text-[11px] tracking-[0.16em] text-brass">
        {example.order}
      </span>
      <span className={`block font-medium ${compact ? "text-sm" : "text-[15px]"}`}>
        {compact ? example.shortTitle : example.title}
      </span>
    </button>
  );
}
