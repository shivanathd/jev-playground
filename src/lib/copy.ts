export const SITE = {
  title: "Jev playground",
  tagline: "GPT and Claude write. Jev decides.",
  description:
    "Public BYOK playground for TypeSafe Jev (System One). Paste your own key. Threshold in code. Fail closed on thin confidence.",
  articlePlaceholder: "https://example.com/your-article-url",
} as const;

export const ACCESS = {
  waitlist:
    "Early access is real. A pasted key can still fail if you are on the waitlist or the key is not enabled.",
  site: "https://typesafe.ai",
  console: "https://console.typesafe.ai",
  docs: "https://docs.typesafe.ai",
  intro: "https://typesafe.ai/blog/introducing-system-one-models-and-jev",
} as const;

export const ERRORS = {
  emptyKey:
    "No API key. Paste your TypeSafe key in Settings. Get one at console.typesafe.ai. Waitlist is at typesafe.ai.",
  rejectedKey:
    "TypeSafe rejected this key. Check console.typesafe.ai. Early access can block keys that are not yet enabled.",
  rateLimited: "TypeSafe rate-limited this key. Wait, then run the gate again.",
  overloaded: "TypeSafe is overloaded right now. Retry in a moment.",
  invalidState: "State must be valid JSON or a plain string.",
  noQuestions: "Add at least one Choice, Score, or Noul question.",
  badQuestion: "A question is missing a type, name, or criteria.",
  network: "The playground could not reach the TypeSafe proxy. Try again.",
  unknown: "The TypeSafe request failed. The key was not stored on the server.",
} as const;
