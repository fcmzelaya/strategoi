import type { Envelope } from "@strategoi/config";

// Points at one config without holding it: the two fields that name a file.
export interface ConfigRef {
  kind: string;
  id: string;
}

// Where configs come from. Every method returns a Promise because reading
// from a disk, a database or an API takes time, and Node doesn't wait idle.
export interface Source {
  // undefined means "no such config", which is normal, not an error.
  load(ref: ConfigRef): Promise<Envelope | undefined>;
  list(kind?: string): Promise<ConfigRef[]>;
}

// Where configs go. Every sink saves somewhere (decision 0012).
export interface Sink {
  save(config: Envelope): Promise<void>;
}

// Raised when data fails validation on the way in or out.
export class ConfigError extends Error {
  constructor(
    message: string,
    readonly errors: string[],
  ) {
    super(`${message}\n  ${errors.join("\n  ")}`);
    this.name = "ConfigError";
  }
}
