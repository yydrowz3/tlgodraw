import { useTranslation } from "react-i18next";
import { AppError, formatError } from "@/i18n/messages";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DrawIoEmbedRef } from "react-drawio";
import type { Session } from "@/types/draw";
import type { Theme } from "@/utils/theme";
import { DiagramExportQueue, type ExportEvent, type ExportPurpose } from "@/utils/diagramExports";

type Options = {
  theme: Theme;
  initialSession: Session;
  saveXml: (sessionId: string, xml: string) => void;
  persist: () => void;
};

export function useDiagramBridge(options: Options) {
  useTranslation();
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const drawioRef = useRef<DrawIoEmbedRef>(null);
  const active = useRef({
    id: options.initialSession.id,
    xml: options.initialSession.drawIoXml || "",
    revision: 0,
  });
  const mountedRevision = useRef(0);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const changingTheme = useRef(false);
  const alive = useRef(true);
  const themeRef = useRef(options.theme);
  const failedTheme = useRef<Theme | null>(null);
  const [editorTheme, setEditorTheme] = useState(options.theme);
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [themeError, setThemeError] = useState<Error | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [mountXml, setMountXml] = useState(options.initialSession.drawIoXml || "");
  const queue = useRef<DiagramExportQueue | null>(null);

  const loadLatest = useCallback(() => {
    if (!readyRef.current || busyRef.current || changingTheme.current) return;
    mountedRevision.current = active.current.revision;
    readyRef.current = false;
    setReady(false);
    drawioRef.current?.load({ xml: active.current.xml, autosave: true });
  }, []);

  const onLoad = useCallback(() => {
    readyRef.current = true;
    setReady(true);
    setLoadError(null);
    if (mountedRevision.current !== active.current.revision) loadLatest();
  }, [loadLatest]);

  const loadSession = useCallback(
    (session: Session) => {
      active.current = {
        id: session.id,
        xml: session.drawIoXml || "",
        revision: active.current.revision + 1,
      };
      loadLatest();
    },
    [loadLatest],
  );

  const receiveDiagram = useCallback(
    (sessionId: string, xml: string) => {
      if (active.current.id !== sessionId) return;
      active.current = { id: sessionId, xml, revision: active.current.revision + 1 };
      loadLatest();
    },
    [loadLatest],
  );

  const capture = useCallback(async (purpose: ExportPurpose) => {
    const { id, revision } = active.current;
    if (!queue.current) throw new AppError("errors.editorNotReady");
    const result = await queue.current.request(purpose, id);
    // A newer AI response takes precedence over a snapshot started before it arrived.
    if (active.current.id === id && active.current.revision !== revision) {
      return { ...result, xml: active.current.xml };
    }
    latest.current.saveXml(id, result.xml);
    if (active.current.id === id) active.current.xml = result.xml;
    return result;
  }, []);

  const syncTheme = useCallback(async () => {
    const target = latest.current.theme;
    if (!readyRef.current || changingTheme.current || target === themeRef.current) return;
    changingTheme.current = true;
    setSyncing(true);
    setThemeError(null);
    try {
      await capture("theme");
      latest.current.persist();
      if (!alive.current) return;
      const nextTheme = latest.current.theme;
      failedTheme.current = null;
      if (nextTheme !== themeRef.current) {
        readyRef.current = false;
        setReady(false);
        mountedRevision.current = active.current.revision;
        setMountXml(active.current.xml);
        themeRef.current = nextTheme;
        setEditorTheme(nextTheme);
        setGeneration((value) => value + 1);
      }
    } catch (error) {
      if (!alive.current) return;
      failedTheme.current = latest.current.theme;
      setThemeError(error instanceof Error ? error : new AppError("errors.themeSync"));
    } finally {
      changingTheme.current = false;
      if (alive.current) setSyncing(false);
    }
  }, [capture]);

  useEffect(() => {
    if (ready && !syncing && options.theme !== editorTheme && failedTheme.current !== options.theme)
      void syncTheme();
    if (options.theme === editorTheme) failedTheme.current = null;
  }, [options.theme, editorTheme, ready, syncing, syncTheme]);

  useEffect(() => {
    if (ready && !busy && !syncing && mountedRevision.current !== active.current.revision)
      loadLatest();
  }, [ready, busy, syncing, loadLatest]);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setLoadError(new AppError("errors.editorSlow")), 20_000);
    return () => window.clearTimeout(timer);
  }, [ready, generation]);

  useEffect(() => {
    alive.current = true;
    queue.current = new DiagramExportQueue(
      (action) => {
        if (!drawioRef.current || !readyRef.current) throw new AppError("errors.editorNotReady");
        drawioRef.current.exportDiagram(action);
      },
      (value) => {
        busyRef.current = value;
        if (alive.current) setBusy(value);
      },
    );
    return () => {
      alive.current = false;
      queue.current?.dispose();
    };
  }, []);

  const onAutoSave = useCallback(
    (event: { xml?: string }) => {
      if (
        !readyRef.current ||
        changingTheme.current ||
        mountedRevision.current !== active.current.revision
      )
        return;
      if (typeof event.xml === "string") {
        active.current.xml = event.xml;
        latest.current.saveXml(active.current.id, event.xml);
      } else {
        void capture("autosave").catch((error: Error) => setLoadError(error));
      }
    },
    [capture],
  );
  const onExport = useCallback((event: ExportEvent) => queue.current?.receive(event), []);
  const retryTheme = useCallback(() => {
    failedTheme.current = null;
    void syncTheme();
  }, [syncTheme]);
  const retryLoad = useCallback(() => {
    readyRef.current = false;
    setReady(false);
    setLoadError(null);
    mountedRevision.current = active.current.revision;
    setMountXml(active.current.xml);
    setGeneration((value) => value + 1);
  }, []);

  return {
    drawioRef,
    editorTheme,
    generation,
    mountXml,
    ready,
    busy,
    syncing,
    themeError: options.theme === editorTheme || !themeError ? "" : formatError(themeError),
    loadError: loadError ? formatError(loadError) : "",
    onLoad,
    onAutoSave,
    onExport,
    capture,
    loadSession,
    receiveDiagram,
    retryTheme,
    retryLoad,
  };
}
