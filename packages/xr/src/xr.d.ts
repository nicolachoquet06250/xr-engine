import type { Quat, Vec3 } from '@xr-engine/math';

export type XRMode = 'inline' | 'immersive-vr';
export type Handedness = 'left' | 'right' | 'none';
export type XRTrackingState = 'tracked' | 'emulated' | 'not-tracked';

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
}

export interface XRHandJointState extends XRPoseState {
    readonly joint: string;
    readonly radius?: number;
}

export interface XRHandState {
    readonly handedness: Handedness;
    readonly trackingState: XRTrackingState;
    readonly joints: readonly XRHandJointState[];
    readonly pinchStrength: number;
    readonly pinching: boolean;
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
}

export interface XRFrameState {
    readonly timestamp: number;
}

export interface XRSessionState {
    readonly active: boolean;
    readonly mode: XRMode | null;
}

export interface XRConfig {
    readonly requiredFeatures?: readonly string[];
    readonly optionalFeatures?: readonly string[];
}

export interface XRManager {
    isSupported(mode?: XRMode): Promise<boolean>;
    enterSession(mode: XRMode, config?: XRConfig): Promise<void>;
    exitSession(): Promise<void>;
    getSessionState(): XRSessionState;
    getTrackingCapabilities(): XRTrackingCapabilities;
    getHeadState(): XRHeadState | null;
    getControllerState(handedness: Handedness): XRControllerState | null;
    getHandState(handedness: Handedness): XRHandState | null;
}

export declare function createXRManager(): XRManager;
