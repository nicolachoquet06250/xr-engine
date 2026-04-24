import type {
  InputAction,
  InputActionState,
  InputBinding,
  InputContext,
  InputDevice,
  InputDeviceAdapter,
  InputProfile,
  InputSignalType,
  InputSignalValue,
  InputSystem,
  InteractionIntent,
  InteractionIntentName,
  NormalizedInputSignal,
  RawInputEvent,
} from './input';

const DEFAULT_ACTIONS: readonly InteractionIntentName[] = [
  'move',
  'look',
  'jump',
  'grab',
  'release',
  'use',
  'teleport',
  'menu',
  'select',
  'cancel',
  'pinch',
  'poke',
  'uiPress',
] as const;

const BUTTON_THRESHOLD = 0.5;

function freezeValue<T>(value: T): T {
  if (value && typeof value === 'object') {
    return Object.freeze(value);
  }
  return value;
}

function toBooleanState(value: InputSignalValue): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Math.abs(value) >= BUTTON_THRESHOLD;
  if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
    const magnitude = Math.sqrt(value.x * value.x + value.y * value.y);
    return magnitude >= BUTTON_THRESHOLD;
  }
  return false;
}

function createActionState<T>(name: string, initialValue: T): InputActionState<T> {
  return {
    name,
    value: initialValue,
    pressed: false,
    released: false,
    held: false,
  };
}

function createIntent(name: InteractionIntentName): InteractionIntent {
  return {
    name,
    value: null,
    active: false,
  };
}

export function inferSignalType(path: string, value: unknown): InputSignalType {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.includes('tracking') || normalizedPath.includes('tracked')) {
    return 'tracking-validity';
  }

  if (normalizedPath.includes('pinch')) {
    return 'pinch-state';
  }

  if (normalizedPath.includes('poke')) {
    return 'poke-state';
  }

  if (normalizedPath.includes('grab')) {
    return 'grab-state';
  }

  if (normalizedPath.includes('ray')) {
    return 'ray';
  }

  if (normalizedPath.includes('pose') || normalizedPath.includes('position')) {
    return 'pose';
  }

  if (typeof value === 'boolean') return 'button';

  if (typeof value === 'number') {
    if (normalizedPath.includes('axis') || normalizedPath.includes('stick') || normalizedPath.includes('trigger')) {
      return 'axis';
    }
    return 'button';
  }

  if (value && typeof value === 'object') {
    if ('origin' in value && 'direction' in value) {
      return 'ray';
    }

    if ('position' in value && 'rotation' in value) {
      return 'pose';
    }

    if ('x' in value && 'y' in value) {
      return 'axis';
    }
  }

  return 'button';
}

class InputActionImpl<T = InputSignalValue> implements InputAction<T> {
  public constructor(
    public readonly name: string,
    public readonly state: InputActionState<T>
  ) {}
}

class InputSystemImpl implements InputSystem {
  private readonly adapters = new Map<string, InputDeviceAdapter>();
  private readonly devices = new Map<string, InputDevice>();
  private readonly bindings = new Map<string, InputBinding[]>();
  private readonly actions = new Map<string, InputActionImpl>();
  private readonly contexts = new Map<string, InputContext>();
  private readonly signals: NormalizedInputSignal[] = [];
  private readonly intents = new Map<InteractionIntentName, InteractionIntent>();

  public constructor() {
    for (const actionName of DEFAULT_ACTIONS) {
      this.createAction(actionName);
      this.intents.set(actionName, createIntent(actionName));
    }
    this.contexts.set('default', { id: 'default', priority: 0, enabled: true });
  }

  public registerAdapter(adapter: InputDeviceAdapter): void {
    this.adapters.set(adapter.id, adapter);
    this.devices.set(adapter.id, {
      id: adapter.id,
      type: adapter.type,
      connected: true,
    });
  }

  public createAction<T = InputSignalValue>(
    name: string,
    config?: {
      initialValue?: T;
    }
  ): InputAction<T> {
    const existing = this.actions.get(name) as InputActionImpl<T> | undefined;
    if (existing) return existing;

    const value = (config?.initialValue ?? null) as T;
    const action = new InputActionImpl(name, createActionState(name, value));
    this.actions.set(name, action as InputActionImpl);
    this.bindings.set(name, []);
    return action;
  }

  public activateContext(name: string): void {
    const context = this.contexts.get(name);
    if (context) {
      this.contexts.set(name, { ...context, enabled: true });
      return;
    }

    this.contexts.set(name, { id: name, priority: 0, enabled: true });
  }

  public deactivateContext(name: string): void {
    const context = this.contexts.get(name);
    if (!context) return;
    this.contexts.set(name, { ...context, enabled: false });
  }

  public getAction<T = InputSignalValue>(name: string): InputAction<T> | null {
    return (this.actions.get(name) as InputAction<T> | undefined) ?? null;
  }

  public getActionValue<T = InputSignalValue>(name: string): T | null {
    return (this.actions.get(name)?.state.value as T | undefined) ?? null;
  }

  public rebind(action: string, binding: InputBinding): void {
    const bindings = this.bindings.get(action) ?? [];
    this.bindings.set(action, [...bindings, binding]);
    if (!this.actions.has(action)) {
      this.createAction(action);
    }
  }

  public loadProfile(profile: InputProfile): void {
    this.bindings.clear();
    for (const [action, bindingList] of Object.entries(profile.bindings)) {
      this.bindings.set(action, [...bindingList]);
      if (!this.actions.has(action)) this.createAction(action);
    }
  }

  public exportProfile(): InputProfile {
    return {
      id: 'runtime-profile',
      bindings: Object.freeze(
        Object.fromEntries(
          [...this.bindings.entries()].map(([name, binding]) => [name, Object.freeze([...binding])])
        )
      ),
    };
  }

  public getDevices(): readonly InputDevice[] {
    return Object.freeze([...this.devices.values()]);
  }

  public getSignals(): readonly NormalizedInputSignal[] {
    return Object.freeze([...this.signals]);
  }

  public getIntents(): readonly InteractionIntent[] {
    return Object.freeze(
      [...this.intents.values()].map((intent) => ({
        ...intent,
        value: freezeValue(intent.value),
      }))
    );
  }

  public update(timestamp = Date.now()): void {
    for (const action of this.actions.values()) {
      action.state.pressed = false;
      action.state.released = false;
      action.state.held = toBooleanState(action.state.value as InputSignalValue);
    }

    this.signals.length = 0;

    for (const adapter of this.adapters.values()) {
      this.devices.set(adapter.id, {
        id: adapter.id,
        type: adapter.type,
        connected: true,
      });

      const events = adapter.poll();
      for (const event of events) {
        this.pushNormalizedSignal(adapter, event, timestamp);
      }
    }

    this.applySignalsToActions();
    this.updateIntents();
  }

  private pushNormalizedSignal(adapter: InputDeviceAdapter, event: RawInputEvent, fallbackTimestamp: number): void {
    const type = inferSignalType(event.path, event.value);
    const signal: NormalizedInputSignal = {
      id: `${adapter.id}:${event.path}:${this.signals.length}`,
      deviceId: event.deviceId,
      deviceType: adapter.type,
      path: event.path,
      type,
      value: (event.value as InputSignalValue) ?? null,
      timestamp: event.timestamp ?? fallbackTimestamp,
    };
    this.signals.push(signal);
  }

  private applySignalsToActions(): void {
    for (const signal of this.signals) {
      for (const [actionName, bindingList] of this.bindings.entries()) {
        const matches = bindingList.some(
          (binding) => binding.device === signal.deviceType && binding.path === signal.path
        );
        if (!matches) continue;

        const action = this.actions.get(actionName);
        if (!action) continue;

        const previousHeld = toBooleanState(action.state.value as InputSignalValue);
        action.state.value = freezeValue(signal.value);
        const nextHeld = toBooleanState(signal.value);

        action.state.pressed = !previousHeld && nextHeld;
        action.state.released = previousHeld && !nextHeld;
        action.state.held = nextHeld;
      }
    }
  }

  private updateIntents(): void {
    for (const [name, intent] of this.intents.entries()) {
      const action = this.actions.get(name);
      if (!action) {
        intent.value = null;
        intent.active = false;
        continue;
      }

      intent.value = freezeValue(action.state.value);
      intent.active = action.state.held || action.state.pressed;
    }
  }
}

export function createInputSystem(): InputSystem {
  return new InputSystemImpl();
}
