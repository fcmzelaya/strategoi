import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { refErrors, validateConfig } from "../src/index.js";

describe("refErrors", () => {
  it("accepts a reference that follows the envelope's rules", () => {
    expect(refErrors({ kind: "Pipeline", id: "text-to-svg" })).toEqual([]);
  });

  it("rejects names that could escape a folder", () => {
    expect(refErrors({ kind: "../Pipeline", id: "../../secrets" })).toHaveLength(2);
  });
});

const fixture = (name: string): unknown =>
  parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("validateConfig", () => {
  it("accepts the converted v2 pipeline", () => {
    const result = validateConfig(fixture("text-to-svg.pipeline.yaml"));
    expect(result).toEqual({ ok: true, config: expect.objectContaining({ kind: "Pipeline", id: "text-to-svg" }) });
  });

  it("reports every envelope mistake at once", () => {
    const result = validateConfig(fixture("broken.pipeline.yaml"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        "(root): must have required property 'version'",
        '(root): must NOT have additional properties "owner"',
      ]);
    }
  });

  it("checks the spec against the kind's schema", () => {
    const result = validateConfig({ kind: "Pipeline", id: "p", version: 1, spec: { steps: ["sources.text", "tokenizer"] } });
    expect(result).toEqual({
      ok: false,
      errors: ['spec/steps/1: must match pattern "^(sources|transforms|sinks)\\.[a-z][a-z0-9_]*$"'],
    });
  });

  it("rejects a kind it has no schema for", () => {
    const result = validateConfig({ kind: "Invoice", id: "i", version: 1, spec: {} });
    expect(result).toEqual({ ok: false, errors: ['kind: unknown kind "Invoice" (known: Pipeline)'] });
  });
});
