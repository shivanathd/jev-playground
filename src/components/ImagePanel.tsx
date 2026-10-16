import type { JevModel } from "@/lib/types";

export type AttachedImage = {
  name: string;
  base64: string;
  /** data: URL for the on-page preview and Box overlay. Never leaves the browser. */
  url: string;
};

// Matches the proxy cap in /api/systemone (Netlify's 6 MB body limit minus base64 overhead).
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg"];

type ImagePanelProps = {
  image: AttachedImage | null;
  model: JevModel;
  needsImage: boolean;
  onChange: (image: AttachedImage | null) => void;
  onError: (message: string) => void;
};

export function ImagePanel({ image, model, needsImage, onChange, onError }: ImagePanelProps) {
  function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    if (!TYPES.includes(file.type)) {
      onError("Jev reads PNG and JPEG only.");
      return;
    }
    if (file.size > MAX_BYTES) {
      onError("Images must be 4 MiB or smaller in this playground.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      onChange({ name: file.name, base64: url.slice(url.indexOf(",") + 1), url });
    };
    reader.onerror = () => onError("The image could not be read.");
    reader.readAsDataURL(file);
  }

  return (
    <section className="rounded-sm border border-line bg-paper p-4 text-paper-ink md:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight">Image in</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-ink/50">
          {needsImage ? "required" : "optional"} · jev-preview
        </span>
      </div>
      <p className="mb-3 text-sm leading-6 text-paper-ink/70">
        One PNG or JPEG, up to 4 MiB. Sent to TypeSafe with this run only, never stored. Images
        are experimental in Jev 1.14 and less reliable than text: ask focused questions.
      </p>
      {image && model !== "jev-preview" ? (
        <p className="mb-3 text-sm leading-6 text-fail">
          Images need jev-preview. Switch the model in Settings.
        </p>
      ) : null}
      {image ? (
        <div className="flex flex-wrap items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL preview */}
          <img
            src={image.url}
            alt={image.name}
            className="max-h-40 rounded-sm border border-paper-ink/15"
          />
          <div className="text-sm">
            <p className="font-mono">{image.name}</p>
            <button
              type="button"
              data-testid="remove-image"
              onClick={() => onChange(null)}
              className="mt-2 rounded-sm border border-paper-ink/25 px-3 py-1 font-mono text-[11px] uppercase tracking-wider"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files[0]);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-sm border border-dashed border-paper-ink/30 px-4 py-6 text-center text-sm hover:border-paper-ink/60 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-paper-ink/60"
        >
          <span className="rounded-sm border border-paper-ink/25 px-3 py-1 font-mono text-[11px] uppercase tracking-wider">
            Upload image
          </span>
          <span className="text-paper-ink/60">or drop a PNG or JPEG here</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            data-testid="image-input"
            onChange={(event) => handleFile(event.target.files?.[0])}
            className="sr-only"
          />
        </label>
      )}
    </section>
  );
}
