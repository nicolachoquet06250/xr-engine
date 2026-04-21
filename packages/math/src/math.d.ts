export type NumericArray = ArrayLike<number>;

export interface Vec2 {
    readonly x: number;
    readonly y: number;
}

export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export interface Vec4 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
}

export interface Quat {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly w: number;
}

export interface Mat3 {
    readonly elements: Readonly<NumericArray>;
}

export interface Mat4 {
    readonly elements: Readonly<NumericArray>;
}

export interface Ray {
    readonly origin: Vec3;
    readonly direction: Vec3;
}

export interface Plane {
    readonly normal: Vec3;
    readonly constant: number;
}

export interface Sphere {
    readonly center: Vec3;
    readonly radius: number;
}

export interface AABB {
    readonly min: Vec3;
    readonly max: Vec3;
}

export interface OBB {
    readonly center: Vec3;
    readonly halfExtents: Vec3;
    readonly orientation: Quat;
}

export interface Frustum {
    readonly planes: readonly [Plane, Plane, Plane, Plane, Plane, Plane];
}

export interface EulerAngles {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly order?: 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';
}

export interface TRS {
    readonly translation: Vec3;
    readonly rotation: Quat;
    readonly scale: Vec3;
}

export interface PoseDelta {
    readonly positionDelta: Vec3;
    readonly rotationDelta: Quat;
}

export interface HandJointPose {
    readonly position: Vec3;
    readonly rotation: Quat;
    readonly radius?: number;
}

export declare function vec2(x?: number, y?: number): Vec2;
export declare function vec3(x?: number, y?: number, z?: number): Vec3;
export declare function vec4(x?: number, y?: number, z?: number, w?: number): Vec4;
export declare function quat(x?: number, y?: number, z?: number, w?: number): Quat;
export declare function mat3(elements?: NumericArray): Mat3;
export declare function mat4(elements?: NumericArray): Mat4;

export declare function addVec2(a: Vec2, b: Vec2): Vec2;
export declare function subVec2(a: Vec2, b: Vec2): Vec2;
export declare function scaleVec2(v: Vec2, scalar: number): Vec2;
export declare function dotVec2(a: Vec2, b: Vec2): number;
export declare function lengthVec2(v: Vec2): number;
export declare function normalizeVec2(v: Vec2): Vec2;

export declare function addVec3(a: Vec3, b: Vec3): Vec3;
export declare function subVec3(a: Vec3, b: Vec3): Vec3;
export declare function scaleVec3(v: Vec3, scalar: number): Vec3;
export declare function dotVec3(a: Vec3, b: Vec3): number;
export declare function crossVec3(a: Vec3, b: Vec3): Vec3;
export declare function lengthVec3(v: Vec3): number;
export declare function normalizeVec3(v: Vec3): Vec3;
export declare function distanceVec3(a: Vec3, b: Vec3): number;
export declare function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3;

export declare function multiplyQuat(a: Quat, b: Quat): Quat;
export declare function normalizeQuat(q: Quat): Quat;
export declare function slerpQuat(a: Quat, b: Quat, t: number): Quat;
export declare function quatFromEuler(euler: EulerAngles): Quat;
export declare function quatToEuler(q: Quat): EulerAngles;

export declare function multiplyMat4(a: Mat4, b: Mat4): Mat4;
export declare function invertMat4(m: Mat4): Mat4;
export declare function transposeMat4(m: Mat4): Mat4;
export declare function composeTRS(trs: TRS): Mat4;
export declare function decomposeTRS(matrix: Mat4): TRS;
export declare function transformPoint(matrix: Mat4, point: Vec3): Vec3;
export declare function transformDirection(matrix: Mat4, direction: Vec3): Vec3;

export declare function intersectRayPlane(ray: Ray, plane: Plane): number | null;
export declare function intersectRaySphere(ray: Ray, sphere: Sphere): number | null;
export declare function intersectRayAABB(ray: Ray, aabb: AABB): number | null;
export declare function intersectFrustumAABB(frustum: Frustum, aabb: AABB): boolean;

export declare function computePinchDistance(thumbTip: HandJointPose, indexTip: HandJointPose): number;
export declare function computePalmForward(palm: HandJointPose, wrist: HandJointPose): Vec3;
export declare function computeJointAngle(a: HandJointPose, joint: HandJointPose, b: HandJointPose): number;
export declare function computeHandOpenness(joints: readonly HandJointPose[]): number;
export declare function computePoseDelta(previousPose: HandJointPose, nextPose: HandJointPose): PoseDelta;
