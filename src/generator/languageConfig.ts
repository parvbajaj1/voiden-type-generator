import type { GeneratorOptions, SupportedLanguage } from "../types/pluginTypes";

export type LanguageConfig = {
  rendererName: string;
  label: string;
  defaultOptions: Partial<GeneratorOptions>;
  buildRendererOptions: (opts: GeneratorOptions) => Record<string, string>;
};

const configs: Record<SupportedLanguage, LanguageConfig> = {
  typescript: {
    rendererName: "typescript",
    label: "TypeScript",
    defaultOptions: { tsReadonly: true, tsJustTypes: true },
    buildRendererOptions: (opts) => ({
      "just-types": opts.tsJustTypes ? "true" : "false",
      "readonly-properties": opts.tsReadonly ? "true" : "false",
    }),
  },
  dart: {
    rendererName: "dart",
    label: "Dart",
    defaultOptions: { dartNullSafety: true, dartCopyWith: false },
    buildRendererOptions: (opts) => ({
      "null-safety": opts.dartNullSafety ? "true" : "false",
      "copy-with": opts.dartCopyWith ? "true" : "false",
    }),
  },
  go: {
    rendererName: "go",
    label: "Go",
    defaultOptions: {},
    // Go renderer always produces JSON tags — no toggleable options needed
    buildRendererOptions: (_opts) => ({ "package": "main" }),
  },
  kotlin: {
    rendererName: "kotlin",
    label: "Kotlin",
    defaultOptions: { kotlinSerializable: true },
    buildRendererOptions: (opts) => ({
      "framework": opts.kotlinSerializable ? "kotlinx" : "just-types",
    }),
  },
  swift: {
    rendererName: "swift",
    label: "Swift",
    defaultOptions: { swiftUseStructs: true },
    buildRendererOptions: (opts) => ({
      "struct-or-class": opts.swiftUseStructs ? "struct" : "class",
      "coding-keys": "true",
      "access-level": "public",
    }),
  },
  java: {
    rendererName: "java",
    label: "Java",
    defaultOptions: { javaGetters: true },
    buildRendererOptions: (opts) => ({
      "just-types": opts.javaGetters ? "false" : "true",
    }),
  },
};

export function getLanguageConfig(lang: SupportedLanguage): LanguageConfig {
  return configs[lang];
}

export function getAllLanguages(): Array<{ value: SupportedLanguage; label: string }> {
  return (Object.keys(configs) as SupportedLanguage[]).map((key) => ({
    value: key,
    label: configs[key].label,
  }));
}

export function getDefaultOptions(lang: SupportedLanguage): Partial<GeneratorOptions> {
  return configs[lang].defaultOptions;
}
