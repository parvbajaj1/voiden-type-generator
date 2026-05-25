export type SupportedLanguage =
  | "typescript"
  | "dart"
  | "go"
  | "kotlin"
  | "swift"
  | "java"
  | "zod";

export type CapturedResponse = {
  body: string;
  status: number;
  url: string;
  method: string;
  label: string;
};

// Only flags that map to real quicktype renderer options are included.
// language and className are stored separately in component state.
export type GeneratorOptions = {
  language: SupportedLanguage;
  className: string;
  // TypeScript
  tsReadonly: boolean;
  tsJustTypes: boolean;
  // Dart
  dartNullSafety: boolean;
  dartCopyWith: boolean;
  // Kotlin
  kotlinSerializable: boolean;
  // Swift
  swiftUseStructs: boolean;
  // Java
  javaGetters: boolean;
  // Zod
  zodStrict: boolean;
};
