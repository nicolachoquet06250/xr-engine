import type { Quat, Vec3 } from '@xr-engine/math';

export type XRMode = 'inline' | 'immersive-vr';
export type Handedness = 'left' | 'right' | 'none';
export type XRTrackingState = 'tracked' | 'emulated' | 'not-tracked';
export type XRTrackingMode = 'none' | 'controllers-only' | 'hands-only' | 'mixed';

export interface XRRay {
  readonly origin: Vec3;
  readonly direction: Vec3;
}

export interface XRPoseState {
  readonly position: Vec3;
  readonly rotation: Quat;
  readonly linearVelocity?: Vec3;
  readonly angularVelocity?: Vec3;
  readonly trackingState: XRTrackingState;
}

export interface XRHeadState extends XRPoseState {}

export interface XRControllerState extends XRPoseState {
  readonly handedness: Handedness;
  readonly buttons: Readonly<Record<string, number | boolean>>;
  readonly axes: readonly number[];
  readonly ray?: XRRay;
}

export type XRHandJointName =
  | 'wrist'
  | 'palm'
  | 'thumb-tip'
  | 'index-finger-tip'
  | 'middle-finger-tip'
  | 'ring-finger-tip'
  | 'pinky-finger-tip'
  | 'middle-finger-metacarpal'
  | string;

export interface XRHandJointState extends XRPoseState {
  readonly joint: XRHandJointName;
  readonly radius?: number;
}

export interface XRHandState {
  readonly handedness: Handedness;
  readonly trackingState: XRTrackingState;
  readonly joints: readonly XRHandJointState[];
  readonly pinchStrength: number;
  readonly pinching: boolean;
  readonly poking: boolean;
  readonly nearTargeting: boolean;
  readonly ray: XRRay;
  readonly palmOrientation: Quat;
}

export interface XRTrackingCapabilities {
  readonly supported: boolean;
  readonly immersiveVR: boolean;
  readonly controllers: boolean;
  readonly handTracking: boolean;
  readonly handJoints: boolean;
  readonly haptics: boolean;
}

export interface XRReferenceSpaceState {
  readonly type: string;
  readonly referenceSpace: unknown;
}

export interface XRFrameState {
  readonly timestamp: number;
  readonly trackingLost: boolean;
}

export interface XRSessionState {
  readonly active: boolean;
  readonly mode: XRMode | null;
  readonly trackingMode: XRTrackingMode;
  readonly frameLoopActive: boolean;
  readonly modeChangeCount: number;
}

export interface XRTrackingSnapshot {
  readonly head: XRHeadState | null;
  readonly leftController: XRControllerState | null;
  readonly rightController: XRControllerState | null;
  readonly leftHand: XRHandState | null;
  readonly rightHand: XRHandState | null;
  readonly frame: XRFrameState;
  readonly mode: XRTrackingMode;
}

export interface XRConfig {
  readonly requiredFeatures?: readonly string[];
  readonly optionalFeatures?: readonly string[];
  readonly referenceSpaceTypes?: readonly string[];
}

export interface XRRuntimeFrame {
  readonly timestamp: number;
  readonly head?: Partial<XRHeadState>;
  readonly controllers?: {
    readonly left?: Partial<XRControllerState>;
    readonly right?: Partial<XRControllerState>;
  };
  readonly hands?: {
    readonly left?: XRRuntimeHandFrame;
    readonly right?: XRRuntimeHandFrame;
  };
}

export interface XRRuntimeHandFrame {
  readonly pose: Partial<XRPoseState>;
  readonly joints: readonly (Partial<XRPoseState> & {
    readonly joint: XRHandJointName;
    readonly radius?: number;
  })[];
  readonly pinchStrength?: number;
  readonly pinching?: boolean;
  readonly poking?: boolean;
  readonly nearTargeting?: boolean;
  readonly ray?: XRRay;
  readonly palmOrientation?: Quat;
}

export interface XRRuntimeSession {
  requestReferenceSpace(type: string): Promise<unknown>;
  startFrameLoop(callback: (frame: XRRuntimeFrame) => void): number;
  stopFrameLoop(handle: number): void;
  end(): Promise<void>;
}

export interface XRRuntimeProvider {
  readonly capabilities: XRTrackingCapabilities;
  isSessionSupported(mode: XRMode): Promise<boolean>;
  requestSession(mode: XRMode, config: XRConfig): Promise<XRRuntimeSession>;
}

export interface XRManager {
  isSupported(mode?: XRMode): Promise<boolean>;
  enterSession(mode: XRMode, config?: XRConfig): Promise<void>;
  exitSession(): Promise<void>;
  updateTracking(frame: XRRuntimeFrame): void;
  getSessionState(): XRSessionState;
  getTrackingCapabilities(): XRTrackingCapabilities;
  getReferenceSpace(type: string): XRReferenceSpaceState | null;
  getFrameState(): XRFrameState;
  getTrackingSnapshot(): XRTrackingSnapshot;
  getHeadState(): XRHeadState | null;
  getControllerState(handedness: Handedness): XRControllerState | null;
  getHandState(handedness: Handedness): XRHandState | null;
}

export declare function createXRManager(provider?: XRRuntimeProvider): XRManager;
