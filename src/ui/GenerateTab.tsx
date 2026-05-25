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
  getResponse: () => CapturedResponse | null;
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

export function GenerateTab({ getResponse }: Props) {
  const prefs = loadPrefs();

  const [response, setResponse] = useState<CapturedResponse | null>(
    () => getResponse()
  );
  const [language, setLanguage] = useState<SupportedLanguage>(prefs.language);
  const [className, setClassName] = useState(prefs.className || "Root");
  const [options, setOptions] = useState<GeneratorOptions>(() =>
    buildOptions(prefs.language, prefs.options)
  );
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = useCallback(
    async (
      lang: SupportedLanguage,
      name: string,
      opts: GeneratorOptions,
      json: string
    ) => {
      setIsGenerating(true);
      setError(null);
      try {
        const config = getLanguageConfig(lang);
        const rendererOptions = config.buildRendererOptions(opts);
        const code = await runQuicktype({
          json,
          language: config.rendererName,
          className: name || "Root",
          rendererOptions,
        });
        setPreview(code);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPreview("");
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Debounced re-generation on any input change
  useEffect(() => {
    if (!response) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      generate(language, className, options, response.body);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [language, className, options, response, generate]);

  // Persist preferences
  useEffect(() => {
    savePrefs({ language, className, options });
  }, [language, className, options]);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setOptions(buildOptions(lang, {}));
  };

  const handleOptionToggle = (key: keyof GeneratorOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !(prev as Record<string, unknown>)[key] }));
  };

  const handleRefresh = () => {
    const latest = getResponse();
    if (latest) setResponse(latest);
  };

  const handleCopy = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed — check browser permissions.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        gap: "12px",
        overflowY: "auto",
        color: "var(--text-primary, #e2e8f0)",
        fontFamily: "sans-serif",
        fontSize: "13px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "15px" }}>Generate Types</span>
        <button onClick={handleRefresh} style={secondaryBtn}>
          Refresh
        </button>
      </div>

      {/* Source info */}
      {response ? (
        <div style={{ color: "var(--comment, #888)", fontSize: "12px" }}>
          {response.method || "?"} {response.url || "(unknown URL)"} · {response.status}
          {response.label ? ` · ${response.label}` : ""}
        </div>
      ) : (
        <div style={{ color: "var(--icon-error, #f87171)", fontSize: "12px" }}>
          No response captured yet — run a request first.
        </div>
      )}

      {/* Language selector */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <label style={{ minWidth: "64px", color: "var(--comment, #888)" }}>Language</label>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          style={selectStyle}
        >
          {getAllLanguages().map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Class name */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <label style={{ minWidth: "64px", color: "var(--comment, #888)" }}>Class</label>
        <input
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="Root"
          style={inputStyle}
        />
      </div>

      {/* Per-language options */}
      <OptionsPanel
        language={language}
        options={options}
        onToggle={handleOptionToggle}
      />

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(248,113,113,0.15)",
            color: "var(--icon-error, #f87171)",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            wordBreak: "break-word",
          }}
        >
          {error}
        </div>
      )}

      {/* Preview header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--comment, #888)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Preview
        </span>
        {isGenerating && (
          <span style={{ fontSize: "11px", color: "var(--comment, #888)" }}>
            Generating…
          </span>
        )}
      </div>

      {/* Preview panel */}
      <pre
        style={{
          flex: 1,
          minHeight: "200px",
          maxHeight: "500px",
          overflowY: "auto",
          background: "var(--ui-bg, #111)",
          border: "1px solid var(--border-subtle, #2a2a2a)",
          borderRadius: "8px",
          padding: "12px",
          margin: 0,
          fontSize: "12px",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "var(--text-primary, #e2e8f0)",
        }}
      >
        {preview || (!isGenerating && !error ? "(preview will appear here)" : "")}
      </pre>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleCopy}
          disabled={!preview || isGenerating}
          style={primaryBtn(!preview || isGenerating)}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

// ── Options panel ─────────────────────────────────────────────────────────────

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
  zod: [{ key: "zodStrict", label: "Strict mode" }],
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        borderTop: "1px solid var(--border-subtle, #2a2a2a)",
        paddingTop: "10px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: "var(--comment, #888)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Options
      </span>
      {defs.map(({ key, label }) => (
        <label
          key={key}
          style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={Boolean((options as Record<string, unknown>)[key])}
            onChange={() => onToggle(key)}
            style={{ accentColor: "var(--icon-primary, #60a5fa)", cursor: "pointer" }}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--ui-bg, #111)",
  border: "1px solid var(--border-subtle, #2a2a2a)",
  borderRadius: "6px",
  padding: "5px 10px",
  color: "var(--text-primary, #e2e8f0)",
  fontSize: "13px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--ui-bg, #111)",
  border: "1px solid var(--border-subtle, #2a2a2a)",
  borderRadius: "6px",
  padding: "5px 10px",
  color: "var(--text-primary, #e2e8f0)",
  fontSize: "13px",
  cursor: "pointer",
  outline: "none",
};

const secondaryBtn: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: "6px",
  border: "1px solid var(--border-subtle, #2a2a2a)",
  background: "transparent",
  color: "var(--comment, #888)",
  fontSize: "12px",
  cursor: "pointer",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 20px",
    borderRadius: "6px",
    border: "none",
    background: disabled ? "var(--border-subtle, #2a2a2a)" : "var(--icon-primary, #3b82f6)",
    color: disabled ? "var(--comment, #888)" : "#fff",
    fontSize: "13px",
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
