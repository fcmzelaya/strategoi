import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import type { Envelope } from "./envelope.js";
import envelopeSchema from "./schemas/envelope.schema.json" with { type: "json" };
import pipelineSchema from "./schemas/Pipeline.schema.json" with { type: "json" };

// The schema for each kind's spec. Adding a kind = one schema file + one line here.
const specSchemas: Record<string, object> = {
  Pipeline: pipelineSchema,
};

// allErrors: report every problem at once, not just the first one.
const ajv = new Ajv2020({ allErrors: true });
// compile<Envelope> makes checkEnvelope a type guard: once it returns true,
// TypeScript treats the checked value as an Envelope.
const checkEnvelope = ajv.compile<Envelope>(envelopeSchema);
const checkSpec = Object.fromEntries(
  Object.entries(specSchemas).map(([kind, schema]) => [kind, ajv.compile(schema)]),
);

export type ValidationResult =
  | { ok: true; config: Envelope }
  | { ok: false; errors: string[] };

export const kinds = Object.keys(specSchemas);

// Checks data that came from outside (a file, a request body). The input is
// `unknown` because nothing about it is trusted until it passes.
export function validateConfig(data: unknown): ValidationResult {
  if (!checkEnvelope(data)) {
    return { ok: false, errors: describe(checkEnvelope.errors, "") };
  }
  const checkKind = checkSpec[data.kind];
  if (!checkKind) {
    return { ok: false, errors: [`kind: unknown kind "${data.kind}" (known: ${kinds.join(", ")})`] };
  }
  if (!checkKind(data.spec)) {
    return { ok: false, errors: describe(checkKind.errors, "spec") };
  }
  return { ok: true, config: data };
}

// The envelope's kind and id rules, for checking a reference on its own
// (for example before it becomes part of a file path).
const kindPattern = new RegExp(envelopeSchema.properties.kind.pattern);
const idPattern = new RegExp(envelopeSchema.properties.id.pattern);

export function refErrors(ref: { kind: string; id: string }): string[] {
  const errors: string[] = [];
  if (!kindPattern.test(ref.kind)) errors.push(`kind: "${ref.kind}" must match ${kindPattern.source}`);
  if (!idPattern.test(ref.id)) errors.push(`id: "${ref.id}" must match ${idPattern.source}`);
  return errors;
}

// Turns Ajv's error objects into lines like "spec/steps/1: must match pattern ...".
function describe(errors: ErrorObject[] | null | undefined, prefix: string): string[] {
  return (errors ?? []).map((e) => {
    const where = [prefix, e.instancePath.slice(1)].filter(Boolean).join("/") || "(root)";
    const extra = e.keyword === "additionalProperties" ? ` "${e.params.additionalProperty}"` : "";
    return `${where}: ${e.message}${extra}`;
  });
}
