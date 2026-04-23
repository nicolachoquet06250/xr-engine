interface XRRenderStateInit {
  baseLayer?: XRWebGLLayer | null;
}

interface XRSessionInit {
  optionalFeatures?: string[];
  requiredFeatures?: string[];
  domOverlay?: {
    root: Element;
  };
}

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

interface XRViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface XRPoseTransform {
  readonly matrix: Float32Array;
  readonly inverse: {
    readonly matrix: Float32Array;
  };
}

interface XRView {
  readonly projectionMatrix: Float32Array;
  readonly transform: XRPoseTransform;
}

interface XRViewerPose {
  readonly views: readonly XRView[];
}

interface XRReferenceSpace {}

interface XRFrame {
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
}

interface XRSession extends EventTarget {
  updateRenderState(state: XRRenderStateInit): Promise<void> | void;
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
  requestAnimationFrame(callback: (time: DOMHighResTimeStamp, frame: XRFrame) => void): number;
  cancelAnimationFrame(handle: number): void;
  end(): Promise<void>;
}

declare var XRSession: {
  prototype: XRSession;
};

declare var XRFrame: {
  prototype: XRFrame;
};

declare var XRReferenceSpace: {
  prototype: XRReferenceSpace;
};

interface XRWebGLLayerInit {
  alpha?: boolean;
  antialias?: boolean;
  depth?: boolean;
  stencil?: boolean;
  framebufferScaleFactor?: number;
}

declare class XRWebGLLayer {
  constructor(
    session: XRSession,
    context: WebGLRenderingContext | WebGL2RenderingContext,
    layerInit?: XRWebGLLayerInit
  );
  readonly framebuffer: WebGLFramebuffer | null;
  readonly framebufferWidth: number;
  readonly framebufferHeight: number;
  getViewport(view: XRView): XRViewport | null;
}

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
}

interface Navigator {
  xr?: XRSystem;
}

interface WebGLRenderingContext {
  makeXRCompatible?(): Promise<void>;
}

interface WebGL2RenderingContext {
  makeXRCompatible?(): Promise<void>;
}
