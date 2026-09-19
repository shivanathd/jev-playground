"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { PrimitivesEditor } from "@/components/PrimitivesEditor";
import { QuestionsPanel } from "@/components/QuestionsPanel";
import { ResultPanel } from "@/components/ResultPanel";
import { SettingsBar } from "@/components/SettingsBar";
import { StatePanel } from "@/components/StatePanel";
import { WorkOrderNav } from "@/components/WorkOrderNav";
import { decideBranch } from "@/lib/branch";
import { ACCESS, SITE } from "@/lib/copy";
import { PlaygroundError } from "@/lib/errors";
import { EXAMPLES, exampleById } from "@/lib/examples";
import { formatState, parseState } from "@/lib/questions";
import { runSystemOne } from "@/lib/run-system-one";
import {
  loadKeyStore,
  loadModel,
  saveKeyStore,
  saveModel,
  subscribeKeyStore,
  wipeKeyStore,
} from "@/lib/storage";
import type {
  BranchDecision,
  ExampleId,
  JevModel,
  QuestionMap,
  SystemOnePayload,
  SystemOneSuccess,
} from "@/lib/types";

const EMPTY_KEY_STORE = { key: "", persist: false } as const;

function getKeySnapshot(): string {
  return JSON.stringify(loadKeyStore());
}

function getModelSnapshot(): JevModel {
  return loadModel();
}

function getServerKeySnapshot(): string {
  return JSON.stringify(EMPTY_KEY_STORE);
}

function getServerModelSnapshot(): JevModel {
  return "jev-1.13.0";
}

export function Playground() {
  const storedKey = useSyncExternalStore(
    subscribeKeyStore,
    getKeySnapshot,
    getServerKeySnapshot,
  );
  const storedModel = useSyncExternalStore(
    subscribeKeyStore,
    getModelSnapshot,
    getServerModelSnapshot,
  );
  const parsedKey = JSON.parse(storedKey) as { key: string; persist: boolean };
  const apiKey = parsedKey.key;
  const persist = parsedKey.persist;
  const model = storedModel;
  const [showKey, setShowKey] = useState(false);
  const [activeId, setActiveId] = useState<ExampleId>("tool-call");
  const [stateText, setStateText] = useState(() =>
    formatState(exampleById("tool-call").defaultState),
  );
  const [questions, setQuestions] = useState<QuestionMap>(() =>
    structuredClone(exampleById("tool-call").questions),
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<SystemOnePayload | null>(null);
  const [response, setResponse] = useState<SystemOneSuccess | null>(null);
  const [branch, setBranch] = useState<BranchDecision | null>(null);

  const example = useMemo(() => exampleById(activeId), [activeId]);

  function applyExample(id: ExampleId) {
    const next = exampleById(id);
    setActiveId(id);
    setStateText(formatState(next.defaultState));
    setQuestions(structuredClone(next.questions));
    setError(null);
    setRequest(null);
    setResponse(null);
    setBranch(null);
  }

  function handleKeyChange(value: string) {
    saveKeyStore(value, persist);
  }

  function handlePersistChange(nextPersist: boolean) {
    saveKeyStore(apiKey, nextPersist);
  }

  function handleModelChange(next: JevModel) {
    saveModel(next);
  }

  function handleWipe() {
    wipeKeyStore();
    setShowKey(false);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setBranch(null);

    try {
      const result = await runSystemOne({
        apiKey,
        model,
        state: parseState(stateText),
        questions,
      });
      setRequest(result.request);
      setResponse(result.response);
      setBranch(decideBranch(activeId, result.response.answers));
    } catch (caught) {
      setResponse(null);
      setRequest({
        state: parseState(stateText),
        model,
        questions,
      });
      if (caught instanceof PlaygroundError) {
        setError(caught.message);
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("The TypeSafe request failed.");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
            TypeSafe · System One
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight md:text-5xl">
            JEV
          </h1>
          <p className="mt-2 max-w-2xl text-lg leading-7 text-paper/80">
            {SITE.tagline} Threshold in code. Fail closed on thin confidence.
          </p>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted lg:text-right">
          Public BYOK playground. No server-stored visitor keys. Pin{" "}
          <span className="font-mono text-paper/80">jev-1.13.0</span> when the
          threshold matters.
        </p>
      </header>

      <SettingsBar
        apiKey={apiKey}
        persist={persist}
        model={model}
        showKey={showKey}
        onKeyChange={handleKeyChange}
        onPersistChange={handlePersistChange}
        onModelChange={handleModelChange}
        onToggleShowKey={() => setShowKey((value) => !value)}
        onWipe={handleWipe}
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Work orders
          </p>
          <WorkOrderNav
            examples={EXAMPLES}
            activeId={activeId}
            onSelect={applyExample}
          />
        </aside>

        <main className="grid min-w-0 gap-5">
          <section className="rounded-sm border border-line bg-panel-2 px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass">
              {example.order} / 08
            </p>
            <h2 className="mt-1 font-display text-2xl tracking-tight">
              {example.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {example.blurb}
            </p>
          </section>

          <StatePanel
            hint={example.stateHint}
            value={stateText}
            onChange={setStateText}
          />

          {example.editableQuestions ? (
            <PrimitivesEditor questions={questions} onChange={setQuestions} />
          ) : (
            <QuestionsPanel questions={questions} />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={running}
              className="rounded-sm bg-brass px-4 py-2.5 font-display text-lg tracking-tight text-ink disabled:opacity-60"
            >
              {running ? "Running…" : "Run gate"}
            </button>
            <p className="text-sm text-muted">
              Browser sends the key as an Authorization header to this app&apos;s
              proxy. The proxy calls TypeSafe with{" "}
              <span className="font-mono">@typesafe-ai/sdk</span>.
            </p>
          </div>

          <ResultPanel
            error={error}
            running={running}
            request={request}
            response={response}
            branch={branch}
          />
        </main>
      </div>

      <footer className="ticket-rule mt-2" />
      <footer className="flex flex-col gap-2 pb-6 text-sm text-muted md:flex-row md:justify-between">
        <p>
          MIT · Not affiliated with TypeSafe beyond a public playground. Article
          URL placeholder:{" "}
          <span className="font-mono text-paper/70">{SITE.articlePlaceholder}</span>
        </p>
        <p>
          <a className="text-brass underline decoration-brass/40 underline-offset-2" href={ACCESS.docs}>
            docs.typesafe.ai
          </a>
          {" · "}
          <a className="text-brass underline decoration-brass/40 underline-offset-2" href={ACCESS.intro}>
            System One intro
          </a>
        </p>
      </footer>
    </div>
  );
}
