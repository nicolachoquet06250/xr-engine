import type {
  Handedness,
  XRConfig,
  XRControllerState,
  XRFrameState,
  XRHandJointName,
  XRHandJointState,
  XRHandState,
  XRHeadState,
  XRManager,
  XRMode,
  XRPoseState,
  XRReferenceSpaceState,
  XRRuntimeFrame,
  XRRuntimeHandFrame,
  XRRuntimeProvider,
  XRSessionState,
  XRTrackingCapabilities,
  XRTrackingMode,
  XRTrackingSnapshot,
} from './xr';

import type { Quat, Vec3 } from '@xr-engine/math';

const PINCH_DISTANCE_THRESHOLD = 0.03;
const PINCH_RELEASE_DISTANCE_THRESHOLD = 0.04;
const POKE_EXTENSION_THRESHOLD = 0.09;

const ZERO_VEC3: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });
const IDENTITY_QUAT: Quat = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });

function cloneVec3(value: Vec3): Vec3 {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

function cloneQuat(value: Quat): Quat {
  return Object.freeze({ x: value.x, y: value.y, z: value.z, w: value.w });
}

function createPoseState(source: Partial<XRPoseState>): XRPoseState {
  return Object.freeze({
    position: cloneVec3(source.position ?? ZERO_VEC3),
    rotation: cloneQuat(source.rotation ?? IDENTITY_QUAT),
    linearVelocity: source.linearVelocity ? cloneVec3(source.linearVelocity) : undefined,
    angularVelocity: source.angularVelocity ? cloneVec3(source.angularVelocity) : undefined,
    trackingState: source.trackingState ?? 'not-tracked',
  });
}

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (length <= Number.EPSILON) return ZERO_VEC3;
  return Object.freeze({ x: v.x / length, y: v.y / length, z: v.z / length });
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return Object.freeze({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
}

function freezeButtons(
  buttons: Readonly<Record<string, number | boolean>> | undefined
): Readonly<Record<string, number | boolean>> {
  return Object.freeze({ ...(buttons ?? {}) });
}

function freezeAxes(axes: readonly number[] | undefined): readonly number[] {
  return Object.freeze([...(axes ?? [])]);
}

function freezeJoints(joints: readonly XRHandJointState[]): readonly XRHandJointState[] {
  return Object.freeze(joints.map((joint) => Object.freeze({ ...joint })));
}

function trackingModeFromStates(
  leftController: XRControllerState | null,
  rightController: XRControllerState | null,
  leftHand: XRHandState | null,
  rightHand: XRHandState | null
): XRTrackingMode {
  const controllerTracked =
    leftController?.trackingState === 'tracked' || rightController?.trackingState === 'tracked';
  const handsTracked =
    leftHand?.trackingState === 'tracked' || rightHand?.trackingState === 'tracked';

  if (controllerTracked && handsTracked) return 'mixed';
  if (controllerTracked) return 'controllers-only';
  if (handsTracked) return 'hands-only';
  return 'none';
}

function choosePinchState(previousPinching: boolean, distanceMeters: number): boolean {
  const threshold = previousPinching ? PINCH_RELEASE_DISTANCE_THRESHOLD : PINCH_DISTANCE_THRESHOLD;
  return distanceMeters <= threshold;
}

function createJointState(
  name: XRHandJointName,
  source: Partial<XRPoseState> & { radius?: number }
): XRHandJointState {
  const pose = createPoseState(source);
  return Object.freeze({
    ...pose,
    joint: name,
    radius: source.radius,
  });
}

function resolveJointLookup(
  joints: readonly XRHandJointState[]
): Readonly<Record<string, XRHandJointState>> {
  return Object.freeze(Object.fromEntries(joints.map((joint) => [joint.joint, joint])));
}

function computePalmOrientation(
  joints: Readonly<Record<string, XRHandJointState>>,
  fallbackPose: XRPoseState
): Quat {
  const palmJoint = joints.palm;
  if (palmJoint) return palmJoint.rotation;

  const wrist = joints.wrist;
  const middle = joints['middle-finger-metacarpal'];
  if (!wrist || !middle) return fallbackPose.rotation;

  const forward = normalize(subtract(middle.position, wrist.position));
  return Object.freeze({ x: forward.x, y: forward.y, z: forward.z, w: 0 });
}

function computeRayFallback(
  joints: Readonly<Record<string, XRHandJointState>>,
  fallbackPose: XRPoseState
): {
  readonly origin: Vec3;
  readonly direction: Vec3;
} {
  const indexTip = joints['index-finger-tip'];
  const wrist = joints.wrist;
  if (!indexTip || !wrist) {
    return Object.freeze({
      origin: fallbackPose.position,
      direction: Object.freeze({ x: 0, y: 0, z: -1 }),
    });
  }

  return Object.freeze({
    origin: indexTip.position,
    direction: normalize(subtract(indexTip.position, wrist.position)),
  });
}

function inferHandSignals(
  handFrame: {
    readonly pose: XRPoseState;
    readonly joints: readonly XRHandJointState[];
    readonly pinchStrength?: number;
    readonly pinching?: boolean;
    readonly poking?: boolean;
    readonly nearTargeting?: boolean;
    readonly ray?: {
      readonly origin: Vec3;
      readonly direction: Vec3;
    };
    readonly palmOrientation?: Quat;
  },
  previousHand: XRHandState | null
): Pick<
  XRHandState,
  'pinchStrength' | 'pinching' | 'poking' | 'nearTargeting' | 'ray' | 'palmOrientation'
> {
  const lookup = resolveJointLookup(handFrame.joints);
  const thumbTip = lookup['thumb-tip'];
  const indexTip = lookup['index-finger-tip'];
  const wrist = lookup.wrist;

  let pinchStrength = handFrame.pinchStrength ?? 0;
  let pinching = handFrame.pinching ?? false;

  if (thumbTip && indexTip) {
    const pinchDistance = distance(thumbTip.position, indexTip.position);
    const normalized = Math.max(0, Math.min(1, 1 - pinchDistance / 0.08));
    pinchStrength = Math.max(pinchStrength, normalized);
    pinching = choosePinchState(previousHand?.pinching ?? false, pinchDistance);
  }

  let poking = handFrame.poking ?? false;
  if (indexTip && wrist) {
    const extension = distance(indexTip.position, wrist.position);
    poking = poking || extension >= POKE_EXTENSION_THRESHOLD;
  }

  const palmOrientation =
    handFrame.palmOrientation ?? computePalmOrientation(lookup, handFrame.pose);
  const ray = handFrame.ray ?? computeRayFallback(lookup, handFrame.pose);

  return {
    pinchStrength,
    pinching,
    poking,
    nearTargeting: handFrame.nearTargeting ?? (pinching || poking),
    ray,
    palmOrientation,
  };
}

class XRManagerImpl implements XRManager {
  private sessionState: XRSessionState = Object.freeze({
    active: false,
    mode: null,
    trackingMode: 'none',
    frameLoopActive: false,
    modeChangeCount: 0,
  });

  private readonly trackingCapabilities: XRTrackingCapabilities;
  private readonly referenceSpaces = new Map<string, XRReferenceSpaceState>();
  private currentFrameState: XRFrameState = Object.freeze({ timestamp: 0, trackingLost: true });
  private headState: XRHeadState | null = null;
  private readonly controllers = new Map<Handedness, XRControllerState>();
  private readonly hands = new Map<Handedness, XRHandState>();
  private activeSession: Awaited<ReturnType<XRRuntimeProvider['requestSession']>> | null = null;
  private frameLoopHandle: number | null = null;

  public constructor(private readonly provider: XRRuntimeProvider) {
    this.trackingCapabilities = Object.freeze({ ...provider.capabilities });
  }

  public async isSupported(mode: XRMode = 'immersive-vr'): Promise<boolean> {
    if (!this.trackingCapabilities.supported) return false;
    return this.provider.isSessionSupported(mode);
  }

  public async enterSession(mode: XRMode, config: XRConfig = {}): Promise<void> {
    const supported = await this.isSupported(mode);
    if (!supported) {
      throw new Error(`XR mode "${mode}" is not supported.`);
    }

    if (this.activeSession) {
      await this.exitSession();
    }

    this.activeSession = await this.provider.requestSession(mode, config);

    this.referenceSpaces.clear();
    for (const type of config.referenceSpaceTypes ?? ['viewer', 'local', 'local-floor']) {
      const referenceSpace = await this.activeSession.requestReferenceSpace(type);
      this.referenceSpaces.set(type, Object.freeze({ type, referenceSpace }));
    }

    this.sessionState = Object.freeze({
      active: true,
      mode,
      trackingMode: 'none',
      frameLoopActive: true,
      modeChangeCount: this.sessionState.modeChangeCount,
    });

    this.frameLoopHandle = this.activeSession.startFrameLoop((frame) => {
      this.updateTracking(frame);
    });
  }

  public async exitSession(): Promise<void> {
    if (!this.activeSession) return;

    if (this.frameLoopHandle !== null) {
      this.activeSession.stopFrameLoop(this.frameLoopHandle);
      this.frameLoopHandle = null;
    }

    await this.activeSession.end();
    this.activeSession = null;
    this.referenceSpaces.clear();
    this.controllers.clear();
    this.hands.clear();
    this.headState = null;
    this.currentFrameState = Object.freeze({ timestamp: 0, trackingLost: true });
    this.sessionState = Object.freeze({
      active: false,
      mode: null,
      trackingMode: 'none',
      frameLoopActive: false,
      modeChangeCount: this.sessionState.modeChangeCount,
    });
  }

  public updateTracking(frame: XRRuntimeFrame): void {
    this.currentFrameState = Object.freeze({
      timestamp: frame.timestamp,
      trackingLost: !frame.head || frame.head.trackingState === 'not-tracked',
    });

    this.headState = frame.head ? (createPoseState(frame.head) as XRHeadState) : null;

    this.controllers.clear();
    if (frame.controllers?.left) {
      this.controllers.set('left', this.createControllerState('left', frame.controllers.left));
    }
    if (frame.controllers?.right) {
      this.controllers.set('right', this.createControllerState('right', frame.controllers.right));
    }

    const previousLeftHand = this.hands.get('left') ?? null;
    const previousRightHand = this.hands.get('right') ?? null;

    this.hands.clear();
    if (frame.hands?.left) {
      this.hands.set('left', this.createHandState('left', frame.hands.left, previousLeftHand));
    }
    if (frame.hands?.right) {
      this.hands.set('right', this.createHandState('right', frame.hands.right, previousRightHand));
    }

    const nextTrackingMode = trackingModeFromStates(
      this.getControllerState('left'),
      this.getControllerState('right'),
      this.getHandState('left'),
      this.getHandState('right')
    );

    this.sessionState = Object.freeze({
      ...this.sessionState,
      trackingMode: nextTrackingMode,
      modeChangeCount:
        this.sessionState.trackingMode === nextTrackingMode
          ? this.sessionState.modeChangeCount
          : this.sessionState.modeChangeCount + 1,
    });
  }

  public getSessionState(): XRSessionState {
    return this.sessionState;
  }

  public getTrackingCapabilities(): XRTrackingCapabilities {
    return this.trackingCapabilities;
  }

  public getReferenceSpace(type: string): XRReferenceSpaceState | null {
    return this.referenceSpaces.get(type) ?? null;
  }

  public getFrameState(): XRFrameState {
    return this.currentFrameState;
  }

  public getTrackingSnapshot(): XRTrackingSnapshot {
    return Object.freeze({
      head: this.headState,
      leftController: this.getControllerState('left'),
      rightController: this.getControllerState('right'),
      leftHand: this.getHandState('left'),
      rightHand: this.getHandState('right'),
      frame: this.currentFrameState,
      mode: this.sessionState.trackingMode,
    });
  }

  public getHeadState(): XRHeadState | null {
    return this.headState;
  }

  public getControllerState(handedness: Handedness): XRControllerState | null {
    return this.controllers.get(handedness) ?? null;
  }

  public getHandState(handedness: Handedness): XRHandState | null {
    return this.hands.get(handedness) ?? null;
  }

  private createControllerState(
    handedness: Handedness,
    source: Partial<XRControllerState>
  ): XRControllerState {
    const pose = createPoseState(source);
    return Object.freeze({
      ...pose,
      handedness,
      buttons: freezeButtons(source.buttons),
      axes: freezeAxes(source.axes),
      ray: source.ray
        ? Object.freeze({
            origin: cloneVec3(source.ray.origin),
            direction: normalize(source.ray.direction),
          })
        : undefined,
    });
  }

  private createHandState(
    handedness: Handedness,
    source: XRRuntimeHandFrame,
    previousHand: XRHandState | null
  ): XRHandState {
    const pose = createPoseState(source.pose);
    const joints = freezeJoints(source.joints.map((joint) => createJointState(joint.joint, joint)));
    const inferred = inferHandSignals(
      {
        ...source,
        pose,
        joints,
      },
      previousHand
    );

    return Object.freeze({
      handedness,
      trackingState: pose.trackingState,
      joints,
      pinchStrength: Math.max(0, Math.min(1, inferred.pinchStrength)),
      pinching: inferred.pinching,
      poking: inferred.poking,
      nearTargeting: inferred.nearTargeting,
      ray: Object.freeze({
        origin: cloneVec3(inferred.ray.origin),
        direction: normalize(inferred.ray.direction),
      }),
      palmOrientation: cloneQuat(inferred.palmOrientation),
    });
  }
}

const DEFAULT_CAPABILITIES: XRTrackingCapabilities = Object.freeze({
  supported: false,
  immersiveVR: false,
  controllers: false,
  handTracking: false,
  handJoints: false,
  haptics: false,
});

const noopProvider: XRRuntimeProvider = {
  capabilities: DEFAULT_CAPABILITIES,
  async isSessionSupported() {
    return false;
  },
  async requestSession() {
    throw new Error('No XR provider configured.');
  },
};

export function createXRManager(provider: XRRuntimeProvider = noopProvider): XRManager {
  return new XRManagerImpl(provider);
}
