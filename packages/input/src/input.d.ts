import type { Quat, Vec2, Vec3 } from '../../math/src/math';

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

export type InputSignal = boolean | number | InputVector2 | InputPose | null;

export interface InputActionState<T = InputSignal> {
  readonly name: string;
  readonly value: T;
  readonly pressed: boolean;
  readonly released: boolean;
  readonly held: boolean;
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
  poll(): void;
}

export interface InputAction<T = InputSignal> {
  readonly name: string;
  readonly state: InputActionState<T>;
}

export interface InputSystem {
  registerAdapter(adapter: InputDeviceAdapter): void;
  createAction<T = InputSignal>(name: string, config?: { initialValue?: T }): InputAction<T>;
  activateContext(name: string): void;
  deactivateContext(name: string): void;
  getAction<T = InputSignal>(name: string): InputAction<T> | null;
  getActionValue<T = InputSignal>(name: string): T | null;
  rebind(action: string, binding: InputBinding): void;
  loadProfile(profile: InputProfile): void;
  exportProfile(): InputProfile;
  getDevices(): readonly InputDevice[];
}

export declare function createInputSystem(): InputSystem;
