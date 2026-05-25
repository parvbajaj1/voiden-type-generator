import { describe, it, expect } from "vitest";
import { runQuicktype } from "../src/generator/quicktypeRunner";

const sampleJson = JSON.stringify({
  id: 1,
  name: "Parv",
  email: "parv@example.com",
  active: true,
});

describe("runQuicktype", () => {
  it("generates TypeScript interface from JSON", async () => {
    const result = await runQuicktype({
      json: sampleJson,
      language: "typescript",
      className: "User",
      rendererOptions: { "just-types": "true", "readonly-properties": "true" },
    });
    expect(result).toContain("User");
    expect(result).toContain("id");
    expect(result).toContain("name");
    expect(result).toContain("email");
  });

  it("generates Dart class from JSON", async () => {
    const result = await runQuicktype({
      json: sampleJson,
      language: "dart",
      className: "User",
      rendererOptions: { "null-safety": "true", "copy-with": "false" },
    });
    expect(result).toContain("class User");
  });

  it("generates Go struct from JSON", async () => {
    const result = await runQuicktype({
      json: sampleJson,
      language: "go",
      className: "User",
      rendererOptions: { "package": "main" },
    });
    expect(result).toContain("User");
    expect(result).toContain("json:");
  });

  it("generates Kotlin data class from JSON", async () => {
    const result = await runQuicktype({
      json: sampleJson,
      language: "kotlin",
      className: "User",
      rendererOptions: { "framework": "just-types" },
    });
    expect(result).toContain("User");
  });

  it("throws for invalid JSON", async () => {
    await expect(
      runQuicktype({
        json: "not valid json {{{",
        language: "typescript",
        className: "User",
        rendererOptions: {},
      })
    ).rejects.toThrow();
  });
});
