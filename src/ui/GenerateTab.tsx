import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  CapturedResponse,
  GeneratorOptions,
  SupportedLanguage,
} from "../types/pluginTypes";
import {
  getAllLanguages,
  getLanguageConfig,
  getDefaultOptions,
} from "../generator/languageConfig";
import { runQuicktype } from "../generator/quicktypeRunner";

const PREFS_KEY = "voiden:type-generator:prefs";

type Props = {
  subscribe: (fn: (r: CapturedResponse, tabId: string) => void) => () => void;
  getResponseForTab: (tabId: string) => CapturedResponse | null;
  getActiveTabId: () => string;
  CodeEditor: React.ComponentType<{
    readOnly?: boolean;
    lang?: string;
    value?: string;
    onChange?: (value: string) => void;
  }>;
};

type Prefs = {
  language: SupportedLanguage;
  className: string;
  options: Partial<GeneratorOptions>;
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as Prefs;
  } catch {}
  return { language: "typescript", className: "Root", options: {} };
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

function buildOptions(lang: SupportedLanguage, saved: Partial<GeneratorOptions>): GeneratorOptions {
  const defaults = getDefaultOptions(lang);
  return { language: lang, className: "", ...defaults, ...saved } as GeneratorOptions;
}

function formatJson(json: string): string {
  if (!json.trim()) return "";
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

const languageMap: Record<SupportedLanguage, string> = {
  typescript: "typescript",
  dart: "dart",
  go: "go",
  kotlin: "kotlin",
  swift: "swift",
  java: "java",
};

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

export function GenerateTab({ subscribe, getResponseForTab, getActiveTabId, CodeEditor }: Props) {
  const prefs = loadPrefs();

  const [jsonInput, setJsonInput] = useState("");
  const [language, setLanguage] = useState<SupportedLanguage>(prefs.language);
  const [className, setClassName] = useState(prefs.className || "Root");
  const [options, setOptions] = useState<GeneratorOptions>(() =>
    buildOptions(prefs.language, prefs.options)
  );
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTabIdRef = useRef(getActiveTabId());

  // Auto-fill when a new response arrives for the currently active tab
  useEffect(() => {
    return subscribe((r, tabId) => {
      activeTabIdRef.current = tabId;
      setJsonInput(formatJson(r.body));
    });
  }, [subscribe]);

  // Poll for active tab switches and load the stored response for that tab
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getActiveTabId();
      if (current && current !== activeTabIdRef.current) {
        activeTabIdRef.current = current;
        const stored = getResponseForTab(current);
        setJsonInput(formatJson(stored?.body ?? ""));
        setOutput("");
        setError(null);
      }
    }, 400);
    return () => clearInterval(timer);
  }, [getActiveTabId, getResponseForTab]);

  const generate = useCallback(
    async (json: string, lang: SupportedLanguage, name: string, opts: GeneratorOptions) => {
      if (!json.trim()) return;
      setIsGenerating(true);
      setError(null);
      try {
        const config = getLanguageConfig(lang);
        const code = await runQuicktype({
          json,
          language: config.rendererName,
          className: name || "Root",
          rendererOptions: config.buildRendererOptions(opts),
        });
        setOutput(code);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setOutput("");
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Debounced re-generation whenever any input changes
  useEffect(() => {
    if (!jsonInput.trim()) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      generate(jsonInput, language, className, options);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [jsonInput, language, className, options, generate]);

  // Persist preferences whenever they change
  useEffect(() => {
    savePrefs({ language, className, options });
  }, [language, className, options]);

  const handleRefresh = () => {
    const tabId = getActiveTabId();
    const latest = tabId ? getResponseForTab(tabId) : null;
    if (latest) setJsonInput(formatJson(latest.body));
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setOptions(buildOptions(lang, {}));
  };

  const handleOptionToggle = (key: keyof GeneratorOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !(prev as Record<string, unknown>)[key],
    }));
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed.");
    }
  };

  const langLabel = getAllLanguages().find((l) => l.value === language)?.label ?? language;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--bg-primary, #0d0d0d)", color: "var(--text-primary, #e2e8f0)", fontFamily: "sans-serif" }}>
      
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderBottom: "1px solid var(--border-subtle, #1e1e1e)", flexShrink: 0, flexWrap: "wrap" }}>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          style={selectStyle}
        >
          {getAllLanguages().map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <input
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="ClassName"
          style={inputStyle}
        />

        <button
          onClick={() => setShowOptions((v) => !v)}
          style={ghostBtn}
          title="Toggle per-language options"
        >
          {showOptions ? "Hide options" : "Options"}
        </button>

        <div style={{ flex: 1 }} />

        <button 
          onClick={() => setShowJson(v => !v)} 
          style={showJson ? activeGhostBtn : ghostBtn} 
          title="Toggle source JSON editing"
        >
          {showJson ? "Hide JSON" : "Edit JSON"}
        </button>

        {showJson && <button onClick={() => setJsonInput(formatJson(jsonInput))} style={ghostBtn} title="Format JSON">Format</button>}
        <button onClick={handleRefresh} style={ghostBtn} title="Load latest response">↻</button>

        <button
          onClick={handleCopy}
          disabled={!output || isGenerating}
          style={copyBtnStyle(!output || isGenerating, copied)}
          title="Copy to clipboard"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* ── Options panel (collapsible) ── */}
      {showOptions && (
        <OptionsPanel language={language} options={options} onToggle={handleOptionToggle} />
      )}

      {/* ── Side-by-side or Single panel ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left — editable JSON (conditional) */}
        {showJson && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--border-subtle, #1e1e1e)", minWidth: 0 }}>
            <div style={panelHeaderStyle}>JSON (SDK)</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <CodeEditor
                lang="json"
                value={jsonInput}
                onChange={setJsonInput}
              />
            </div>
          </div>
        )}

        {/* Right — generated code */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={panelHeaderStyle}>
            {isGenerating ? "Generating…" : langLabel}
          </div>
          {error ? (
            <div style={{ padding: "8px", color: "var(--icon-error, #f87171)", fontSize: "12px", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowY: "auto", flex: 1 }}>
              {error}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <CodeEditor
                lang={languageMap[language]}
                value={output || (!isGenerating ? "(output will appear here)" : "")}
                readOnly={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Options panel ────────────────────────────────────────────────────────────

type OptionDef = { key: keyof GeneratorOptions; label: string };

const optionDefs: Record<SupportedLanguage, OptionDef[]> = {
  typescript: [
    { key: "tsReadonly", label: "Readonly fields" },
    { key: "tsJustTypes", label: "Types only (no runtime code)" },
  ],
  dart: [
    { key: "dartNullSafety", label: "Null safety" },
    { key: "dartCopyWith", label: "copyWith method" },
  ],
  go: [],
  kotlin: [{ key: "kotlinSerializable", label: "@Serializable (kotlinx)" }],
  swift: [{ key: "swiftUseStructs", label: "Structs (vs classes)" }],
  java: [{ key: "javaGetters", label: "Getters / setters" }],
};

function OptionsPanel({
  language,
  options,
  onToggle,
}: {
  language: SupportedLanguage;
  options: GeneratorOptions;
  onToggle: (key: keyof GeneratorOptions) => void;
}) {
  const defs = optionDefs[language] ?? [];
  if (defs.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: "12px", padding: "6px 10px", borderBottom: "1px solid var(--border-subtle, #1e1e1e)", flexWrap: "wrap", background: "var(--bg-secondary, #111)", flexShrink: 0 }}>
      {defs.map(({ key, label }) => (
        <label key={key} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "12px", color: "var(--comment, #888)" }}>
          <input
            type="checkbox"
            checked={Boolean((options as Record<string, unknown>)[key])}
            onChange={() => onToggle(key)}
            style={{ accentColor: "var(--icon-primary, #60a5fa)", cursor: "pointer" }}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  background: "var(--bg-secondary, #111)",
  border: "1px solid var(--border-subtle, #1e1e1e)",
  borderRadius: "5px",
  padding: "3px 8px",
  color: "var(--text-primary, #e2e8f0)",
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg-secondary, #111)",
  border: "1px solid var(--border-subtle, #1e1e1e)",
  borderRadius: "5px",
  padding: "3px 8px",
  color: "var(--text-primary, #e2e8f0)",
  fontSize: "12px",
  outline: "none",
  width: "90px",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--comment, #888)",
  fontSize: "12px",
  cursor: "pointer",
  padding: "3px 6px",
  borderRadius: "4px",
};

const activeGhostBtn: React.CSSProperties = {
  ...ghostBtn,
  color: "var(--icon-primary, #3b82f6)",
  background: "rgba(59, 130, 246, 0.1)",
};

const panelHeaderStyle: React.CSSProperties = {
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--comment, #666)",
  padding: "4px 8px",
  borderBottom: "1px solid var(--border-subtle, #1e1e1e)",
  flexShrink: 0,
};

function copyBtnStyle(disabled: boolean, copied: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "5px",
    border: "none",
    background: "transparent",
    color: copied
      ? "#22c55e"
      : disabled
      ? "var(--border-subtle, #1e1e1e)"
      : "var(--comment, #888)",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "color 0.15s",
  };
}
