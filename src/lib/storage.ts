import { DEFAULT_MODEL, type JevModel } from "@/lib/types";

const KEY_SESSION = "jev.typesafe.apiKey";
const KEY_LOCAL = "jev.typesafe.apiKey";
const PERSIST_FLAG = "jev.typesafe.persist";
const MODEL_KEY = "jev.typesafe.model";

const listeners = new Set<() => void>();

function emitStoreChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeKeyStore(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export type KeyStore = {
  key: string;
  persist: boolean;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadKeyStore(): KeyStore {
  if (!canUseStorage()) {
    return { key: "", persist: false };
  }

  const persist = window.localStorage.getItem(PERSIST_FLAG) === "1";
  const key = persist
    ? (window.localStorage.getItem(KEY_LOCAL) ?? "")
    : (window.sessionStorage.getItem(KEY_SESSION) ?? "");

  return { key, persist };
}

export function saveKeyStore(key: string, persist: boolean): void {
  if (!canUseStorage()) {
    return;
  }

  if (persist) {
    window.localStorage.setItem(KEY_LOCAL, key);
    window.localStorage.setItem(PERSIST_FLAG, "1");
    window.sessionStorage.removeItem(KEY_SESSION);
    emitStoreChange();
    return;
  }

  window.sessionStorage.setItem(KEY_SESSION, key);
  window.localStorage.removeItem(KEY_LOCAL);
  window.localStorage.setItem(PERSIST_FLAG, "0");
  emitStoreChange();
}

export function wipeKeyStore(): void {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(KEY_SESSION);
  window.localStorage.removeItem(KEY_LOCAL);
  window.localStorage.removeItem(PERSIST_FLAG);
  emitStoreChange();
}

export function loadModel(): JevModel {
  if (!canUseStorage()) {
    return DEFAULT_MODEL;
  }

  const stored = window.sessionStorage.getItem(MODEL_KEY);
  if (stored === "jev-1.13.0" || stored === "jev-latest") {
    return stored;
  }

  return DEFAULT_MODEL;
}

export function saveModel(model: JevModel): void {
  if (!canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(MODEL_KEY, model);
  emitStoreChange();
}
