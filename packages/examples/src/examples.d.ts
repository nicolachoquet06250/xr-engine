export type ExampleId =
  | 'hello-engine'
  | 'rotating-cube'
  | 'physics-sandbox'
  | 'desktop-controller'
  | 'gamepad-controller'
  | 'xr-controllers-demo'
  | 'xr-hand-tracking-demo'
  | 'ui-interaction-demo'
  | 'webcomponents-integration-demo'
  | 'capabilities-fallback-demo';

export interface ExampleDefinition {
  readonly id: ExampleId;
  readonly title: string;
  mount(target: HTMLElement): Promise<void>;
  unmount?(): Promise<void>;
}

export declare const examples: readonly ExampleDefinition[];
export declare function getExample(id: ExampleId): ExampleDefinition | null;
