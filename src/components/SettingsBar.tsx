import { ACCESS } from "@/lib/copy";
import type { JevModel } from "@/lib/types";

type SettingsBarProps = {
  apiKey: string;
  persist: boolean;
  model: JevModel;
  showKey: boolean;
  onKeyChange: (value: string) => void;
  onPersistChange: (persist: boolean) => void;
  onModelChange: (model: JevModel) => void;
  onToggleShowKey: () => void;
  onWipe: () => void;
};

export function SettingsBar({
  apiKey,
  persist,
  model,
  showKey,
  onKeyChange,
  onPersistChange,
  onModelChange,
  onToggleShowKey,
  onWipe,
}: SettingsBarProps) {
  return (
    <section className="rounded-sm border border-line bg-panel p-4 md:p-5">
      <form
        className="flex flex-col gap-4 lg:flex-row lg:items-end"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            TypeSafe API key
          </span>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              name="typesafe-api-key"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => onKeyChange(event.target.value)}
              placeholder="Paste TYPESAFE_API_KEY"
              data-testid="api-key-input"
              className="w-full rounded-sm border border-line bg-ink px-3 py-2 font-mono text-sm text-paper placeholder:text-muted/60"
            />
            <button
              type="button"
              onClick={onToggleShowKey}
              className="shrink-0 rounded-sm border border-line px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-paper"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <fieldset className="shrink-0">
          <legend className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Model
          </legend>
          <div className="flex rounded-sm border border-line">
            <ModelButton
              active={model === "jev-1.13.0"}
              onClick={() => onModelChange("jev-1.13.0")}
              label="jev-1.13.0"
              hint="pin"
              testId="model-pin"
            />
            <ModelButton
              active={model === "jev-latest"}
              onClick={() => onModelChange("jev-latest")}
              label="jev-latest"
              hint="moves"
              testId="model-latest"
            />
          </div>
        </fieldset>
      </form>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={persist}
            onChange={(event) => onPersistChange(event.target.checked)}
            className="accent-brass"
          />
          Remember on this device (localStorage). Default is session only.
        </label>
        <button
          type="button"
          onClick={onWipe}
          data-testid="wipe-key"
          className="self-start rounded-sm border border-fail/50 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fail hover:bg-fail/10"
        >
          Wipe key
        </button>
      </div>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        {ACCESS.waitlist}{" "}
        <a className="text-brass underline decoration-brass/40 underline-offset-2" href={ACCESS.site}>
          typesafe.ai
        </a>{" "}
        and{" "}
        <a
          className="text-brass underline decoration-brass/40 underline-offset-2"
          href={ACCESS.console}
        >
          console.typesafe.ai
        </a>
        . The key stays in this browser. The server only forwards the header you send.
      </p>
    </section>
  );
}

function ModelButton({
  active,
  onClick,
  label,
  hint,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`px-3 py-2 font-mono text-[12px] ${
        active ? "bg-brass text-ink" : "bg-ink text-muted hover:text-paper"
      }`}
    >
      {label}
      <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">
        {hint}
      </span>
    </button>
  );
}
