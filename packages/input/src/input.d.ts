import type { Quat, Vec2, Vec3 } from '@xr-engine/math';

export type InputDeviceType =
  | 'keyboard'
  | 'mouse'
  | 'gamepad'
  | 'xr-controller-left'
  | 'xr-controller-right'
  | 'xr-hand-left'
  | 'xr-hand-right';

export interface InputVector2 extends Vec2 {}

export interface InputPose {
  readonly position: Vec3;
  readonly rotation: Quat;
}

export interface InputRay {
  readonly origin: Vec3;
  readonly direction: Vec3;
}

export type InputSignalType =
  | 'button'
  | 'axis'
  | 'pose'
  | 'ray'
  | 'grab-state'
  | 'pinch-state'
  | 'poke-state'
  | 'tracking-validity';

export type InputSignalValue = boolean | number | InputVector2 | InputPose | InputRay | null;

export interface NormalizedInputSignal {
  readonly id: string;
  readonly deviceId: string;
  readonly deviceType: InputDeviceType;
  readonly path: string;
  readonly type: InputSignalType;
  readonly value: InputSignalValue;
  readonly timestamp: number;
}

export interface RawInputEvent {
  readonly deviceId: string;
  readonly path: string;
  readonly value: unknown;
  readonly timestamp?: number;
}

export interface InputActionState<T = InputSignalValue> {
  name: string;
  value: T;
  pressed: boolean;
  released: boolean;
  held: boolean;
}

export interface InputBinding {
  readonly device: InputDeviceType;
  readonly path: string;
  readonly modifiers?: readonly string[];
}

export interface InputProfile {
  readonly id: string;
  readonly bindings: Readonly<Record<string, readonly InputBinding[]>>;
}

export interface InputContext {
  readonly id: string;
  readonly priority: number;
  readonly enabled: boolean;
}

export interface InputDevice {
  readonly id: string;
  readonly type: InputDeviceType;
  readonly connected: boolean;
}

export interface InputDeviceAdapter {
  readonly id: string;
  readonly type: InputDeviceType;
  poll(): readonly RawInputEvent[];
}

export interface InputAction<T = InputSignalValue> {
  readonly name: string;
  readonly state: InputActionState<T>;
}

export type InteractionIntentName =
  | 'move'
  | 'look'
  | 'jump'
  | 'grab'
  | 'release'
  | 'use'
  | 'teleport'
  | 'menu'
  | 'select'
  | 'cancel'
  | 'pinch'
  | 'poke'
  | 'uiPress';

export interface InteractionIntent<T = InputSignalValue> {
  name: InteractionIntentName;
  value: T;
  active: boolean;
}

export interface InputSystem {
  registerAdapter(adapter: InputDeviceAdapter): void;
  createAction<T = InputSignalValue>(name: string, config?: { initialValue?: T }): InputAction<T>;
  activateContext(name: string): void;
  deactivateContext(name: string): void;
  getAction<T = InputSignalValue>(name: string): InputAction<T> | null;
  getActionValue<T = InputSignalValue>(name: string): T | null;
  rebind(action: string, binding: InputBinding): void;
  loadProfile(profile: InputProfile): void;
  exportProfile(): InputProfile;
  getDevices(): readonly InputDevice[];
  update(timestamp?: number): void;
  getSignals(): readonly NormalizedInputSignal[];
  getIntents(): readonly InteractionIntent[];
}

export declare function createInputSystem(): InputSystem;
export declare function inferSignalType(path: string, value: unknown): InputSignalType;
