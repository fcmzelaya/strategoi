// The envelope every config file uses (decision 0006). `Spec` is a type
// parameter: each kind fills it in with the shape of its own body.
export interface Envelope<Spec = unknown> {
  kind: string;
  id: string;
  version: number;
  label?: string;
  spec: Spec;
}

// The first kind: a pipeline is an ordered list of steps.
export interface PipelineSpec {
  steps: string[];
}

export type Pipeline = Envelope<PipelineSpec> & { kind: "Pipeline" };
