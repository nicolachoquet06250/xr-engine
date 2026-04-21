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

const EPSILON = 1e-8;
const IDENTITY_MAT3 = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
const IDENTITY_MAT4 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeSqrt(value: number): number {
  return Math.sqrt(Math.max(0, value));
}

function copyToFloat32(
  elements: NumericArray,
  expectedLength: number,
  fallback: Float32Array
): Float32Array {
  const out = new Float32Array(expectedLength);
  if (elements.length === 0) {
    out.set(fallback);
    return out;
  }
  for (let i = 0; i < expectedLength; i += 1) {
    out[i] = Number(elements[i] ?? fallback[i] ?? 0);
  }
  return out;
}

export function vec2(x = 0, y = 0): Vec2 {
  return Object.freeze({ x, y });
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return Object.freeze({ x, y, z });
}

export function vec4(x = 0, y = 0, z = 0, w = 0): Vec4 {
  return Object.freeze({ x, y, z, w });
}

export function quat(x = 0, y = 0, z = 0, w = 1): Quat {
  return Object.freeze({ x, y, z, w });
}

export function mat3(elements: NumericArray = IDENTITY_MAT3): Mat3 {
  return Object.freeze({ elements: copyToFloat32(elements, 9, IDENTITY_MAT3) });
}

export function mat4(elements: NumericArray = IDENTITY_MAT4): Mat4 {
  return Object.freeze({ elements: copyToFloat32(elements, 16, IDENTITY_MAT4) });
}

export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return vec2(a.x + b.x, a.y + b.y);
}
export function subVec2(a: Vec2, b: Vec2): Vec2 {
  return vec2(a.x - b.x, a.y - b.y);
}
export function scaleVec2(v: Vec2, scalar: number): Vec2 {
  return vec2(v.x * scalar, v.y * scalar);
}
export function dotVec2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}
export function lengthVec2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}
export function normalizeVec2(v: Vec2): Vec2 {
  const length = lengthVec2(v);
  return length <= EPSILON ? vec2(0, 0) : scaleVec2(v, 1 / length);
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}
export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}
export function scaleVec3(v: Vec3, scalar: number): Vec3 {
  return vec3(v.x * scalar, v.y * scalar, v.z * scalar);
}
export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}
export function lengthVec3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}
export function normalizeVec3(v: Vec3): Vec3 {
  const length = lengthVec3(v);
  return length <= EPSILON ? vec3(0, 0, 0) : scaleVec3(v, 1 / length);
}
export function distanceVec3(a: Vec3, b: Vec3): number {
  return lengthVec3(subVec3(a, b));
}
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return vec3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
}

export function multiplyQuat(a: Quat, b: Quat): Quat {
  return quat(
    a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
  );
}
export function normalizeQuat(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  return length <= EPSILON
    ? quat(0, 0, 0, 1)
    : quat(q.x / length, q.y / length, q.z / length, q.w / length);
}
export function slerpQuat(a: Quat, b: Quat, t: number): Quat {
  let cosHalfTheta = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let end = b;
  if (cosHalfTheta < 0) {
    end = quat(-b.x, -b.y, -b.z, -b.w);
    cosHalfTheta = -cosHalfTheta;
  }
  if (cosHalfTheta >= 1 - EPSILON) {
    return normalizeQuat(
      quat(
        a.x + (end.x - a.x) * t,
        a.y + (end.y - a.y) * t,
        a.z + (end.z - a.z) * t,
        a.w + (end.w - a.w) * t
      )
    );
  }
  const halfTheta = Math.acos(clamp(cosHalfTheta, -1, 1));
  const sinHalfTheta = safeSqrt(1 - cosHalfTheta * cosHalfTheta);
  if (Math.abs(sinHalfTheta) <= EPSILON) {
    return normalizeQuat(
      quat((a.x + end.x) * 0.5, (a.y + end.y) * 0.5, (a.z + end.z) * 0.5, (a.w + end.w) * 0.5)
    );
  }
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
  return quat(
    a.x * ratioA + end.x * ratioB,
    a.y * ratioA + end.y * ratioB,
    a.z * ratioA + end.z * ratioB,
    a.w * ratioA + end.w * ratioB
  );
}

function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const half = angle * 0.5;
  const sinHalf = Math.sin(half);
  const normalizedAxis = normalizeVec3(axis);
  return quat(
    normalizedAxis.x * sinHalf,
    normalizedAxis.y * sinHalf,
    normalizedAxis.z * sinHalf,
    Math.cos(half)
  );
}

export function quatFromEuler(euler: EulerAngles): Quat {
  const xq = quatFromAxisAngle(vec3(1, 0, 0), euler.x);
  const yq = quatFromAxisAngle(vec3(0, 1, 0), euler.y);
  const zq = quatFromAxisAngle(vec3(0, 0, 1), euler.z);
  switch (euler.order ?? 'XYZ') {
    case 'XYZ':
      return normalizeQuat(multiplyQuat(multiplyQuat(xq, yq), zq));
    case 'XZY':
      return normalizeQuat(multiplyQuat(multiplyQuat(xq, zq), yq));
    case 'YXZ':
      return normalizeQuat(multiplyQuat(multiplyQuat(yq, xq), zq));
    case 'YZX':
      return normalizeQuat(multiplyQuat(multiplyQuat(yq, zq), xq));
    case 'ZXY':
      return normalizeQuat(multiplyQuat(multiplyQuat(zq, xq), yq));
    case 'ZYX':
      return normalizeQuat(multiplyQuat(multiplyQuat(zq, yq), xq));
  }
}

export function quatToEuler(q: Quat): EulerAngles {
  const nq = normalizeQuat(q);
  const sinrCosp = 2 * (nq.w * nq.x + nq.y * nq.z);
  const cosrCosp = 1 - 2 * (nq.x * nq.x + nq.y * nq.y);
  const x = Math.atan2(sinrCosp, cosrCosp);
  const sinp = 2 * (nq.w * nq.y - nq.z * nq.x);
  const y = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI * 0.5 : Math.asin(sinp);
  const sinyCosp = 2 * (nq.w * nq.z + nq.x * nq.y);
  const cosyCosp = 1 - 2 * (nq.y * nq.y + nq.z * nq.z);
  const z = Math.atan2(sinyCosp, cosyCosp);
  return Object.freeze({ x, y, z, order: 'XYZ' as const });
}

export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const ae = a.elements;
  const be = b.elements;
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[col * 4 + row] =
        ae[0 * 4 + row] * be[col * 4 + 0] +
        ae[1 * 4 + row] * be[col * 4 + 1] +
        ae[2 * 4 + row] * be[col * 4 + 2] +
        ae[3 * 4 + row] * be[col * 4 + 3];
    }
  }
  return mat4(out);
}

export function invertMat4(m: Mat4): Mat4 {
  const a = m.elements;
  const out = new Float32Array(16);
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (Math.abs(det) <= EPSILON) return mat4();
  const invDet = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * invDet;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * invDet;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * invDet;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * invDet;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * invDet;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * invDet;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * invDet;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * invDet;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;
  return mat4(out);
}

export function transposeMat4(m: Mat4): Mat4 {
  const e = m.elements;
  return mat4([
    e[0],
    e[4],
    e[8],
    e[12],
    e[1],
    e[5],
    e[9],
    e[13],
    e[2],
    e[6],
    e[10],
    e[14],
    e[3],
    e[7],
    e[11],
    e[15],
  ]);
}

export function composeTRS(trs: TRS): Mat4 {
  const q = normalizeQuat(trs.rotation);
  const s = trs.scale;
  const t = trs.translation;
  const x2 = q.x + q.x;
  const y2 = q.y + q.y;
  const z2 = q.z + q.z;
  const xx = q.x * x2;
  const xy = q.x * y2;
  const xz = q.x * z2;
  const yy = q.y * y2;
  const yz = q.y * z2;
  const zz = q.z * z2;
  const wx = q.w * x2;
  const wy = q.w * y2;
  const wz = q.w * z2;
  return mat4([
    (1 - (yy + zz)) * s.x,
    (xy + wz) * s.x,
    (xz - wy) * s.x,
    0,
    (xy - wz) * s.y,
    (1 - (xx + zz)) * s.y,
    (yz + wx) * s.y,
    0,
    (xz + wy) * s.z,
    (yz - wx) * s.z,
    (1 - (xx + yy)) * s.z,
    0,
    t.x,
    t.y,
    t.z,
    1,
  ]);
}

export function decomposeTRS(matrix: Mat4): TRS {
  const e = matrix.elements;
  const translation = vec3(e[12], e[13], e[14]);
  const sx = Math.hypot(e[0], e[1], e[2]);
  const sy = Math.hypot(e[4], e[5], e[6]);
  const sz = Math.hypot(e[8], e[9], e[10]);
  const scale = vec3(sx, sy, sz);
  const m00 = sx <= EPSILON ? 1 : e[0] / sx;
  const m01 = sx <= EPSILON ? 0 : e[1] / sx;
  const m02 = sx <= EPSILON ? 0 : e[2] / sx;
  const m10 = sy <= EPSILON ? 0 : e[4] / sy;
  const m11 = sy <= EPSILON ? 1 : e[5] / sy;
  const m12 = sy <= EPSILON ? 0 : e[6] / sy;
  const m20 = sz <= EPSILON ? 0 : e[8] / sz;
  const m21 = sz <= EPSILON ? 0 : e[9] / sz;
  const m22 = sz <= EPSILON ? 1 : e[10] / sz;
  const trace = m00 + m11 + m22;
  let rotation: Quat;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    rotation = quat((m12 - m21) / s, (m20 - m02) / s, (m01 - m10) / s, 0.25 * s);
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    rotation = quat(0.25 * s, (m01 + m10) / s, (m20 + m02) / s, (m12 - m21) / s);
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    rotation = quat((m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m20 - m02) / s);
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    rotation = quat((m20 + m02) / s, (m12 + m21) / s, 0.25 * s, (m01 - m10) / s);
  }
  return Object.freeze({ translation, rotation: normalizeQuat(rotation), scale });
}

export function transformPoint(matrix: Mat4, point: Vec3): Vec3 {
  const e = matrix.elements;
  const w = e[3] * point.x + e[7] * point.y + e[11] * point.z + e[15];
  const iw = Math.abs(w) <= EPSILON ? 1 : 1 / w;
  return vec3(
    (e[0] * point.x + e[4] * point.y + e[8] * point.z + e[12]) * iw,
    (e[1] * point.x + e[5] * point.y + e[9] * point.z + e[13]) * iw,
    (e[2] * point.x + e[6] * point.y + e[10] * point.z + e[14]) * iw
  );
}

export function transformDirection(matrix: Mat4, direction: Vec3): Vec3 {
  const e = matrix.elements;
  return normalizeVec3(
    vec3(
      e[0] * direction.x + e[4] * direction.y + e[8] * direction.z,
      e[1] * direction.x + e[5] * direction.y + e[9] * direction.z,
      e[2] * direction.x + e[6] * direction.y + e[10] * direction.z
    )
  );
}

export function intersectRayPlane(ray: Ray, plane: Plane): number | null {
  const denom = dotVec3(plane.normal, ray.direction);
  if (Math.abs(denom) <= EPSILON) return null;
  const t = -(dotVec3(plane.normal, ray.origin) + plane.constant) / denom;
  return t >= 0 ? t : null;
}

export function intersectRaySphere(ray: Ray, sphere: Sphere): number | null {
  const oc = subVec3(ray.origin, sphere.center);
  const a = dotVec3(ray.direction, ray.direction);
  const b = 2 * dotVec3(oc, ray.direction);
  const c = dotVec3(oc, oc) - sphere.radius * sphere.radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const sqrtD = Math.sqrt(discriminant);
  const t0 = (-b - sqrtD) / (2 * a);
  const t1 = (-b + sqrtD) / (2 * a);
  if (t0 >= 0) return t0;
  if (t1 >= 0) return t1;
  return null;
}

export function intersectRayAABB(ray: Ray, aabb: AABB): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  const origins = [ray.origin.x, ray.origin.y, ray.origin.z] as const;
  const directions = [ray.direction.x, ray.direction.y, ray.direction.z] as const;
  const mins = [aabb.min.x, aabb.min.y, aabb.min.z] as const;
  const maxs = [aabb.max.x, aabb.max.y, aabb.max.z] as const;
  for (let i = 0; i < 3; i += 1) {
    const direction = directions[i];
    if (Math.abs(direction) <= EPSILON) {
      if (origins[i] < mins[i] || origins[i] > maxs[i]) return null;
      continue;
    }
    const invD = 1 / direction;
    let t1 = (mins[i] - origins[i]) * invD;
    let t2 = (maxs[i] - origins[i]) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }
  if (tmax < 0) return null;
  return tmin >= 0 ? tmin : tmax;
}

function classifyAabbAgainstPlane(plane: Plane, aabb: AABB): boolean {
  const positive = vec3(
    plane.normal.x >= 0 ? aabb.max.x : aabb.min.x,
    plane.normal.y >= 0 ? aabb.max.y : aabb.min.y,
    plane.normal.z >= 0 ? aabb.max.z : aabb.min.z
  );
  return dotVec3(plane.normal, positive) + plane.constant >= 0;
}

export function intersectFrustumAABB(frustum: Frustum, aabb: AABB): boolean {
  return frustum.planes.every((plane: Plane) => classifyAabbAgainstPlane(plane, aabb));
}

export function computePinchDistance(thumbTip: HandJointPose, indexTip: HandJointPose): number {
  return distanceVec3(thumbTip.position, indexTip.position);
}
export function computePalmForward(palm: HandJointPose, wrist: HandJointPose): Vec3 {
  return normalizeVec3(subVec3(palm.position, wrist.position));
}
export function computeJointAngle(
  a: HandJointPose,
  joint: HandJointPose,
  b: HandJointPose
): number {
  const v1 = normalizeVec3(subVec3(a.position, joint.position));
  const v2 = normalizeVec3(subVec3(b.position, joint.position));
  return Math.acos(clamp(dotVec3(v1, v2), -1, 1));
}
export function computeHandOpenness(joints: readonly HandJointPose[]): number {
  if (joints.length === 0) return 0;
  let centroid = vec3(0, 0, 0);
  for (const joint of joints) centroid = addVec3(centroid, joint.position);
  centroid = scaleVec3(centroid, 1 / joints.length);
  let totalDistance = 0;
  for (const joint of joints) totalDistance += distanceVec3(joint.position, centroid);
  return clamp(totalDistance / joints.length / 0.08, 0, 1);
}
function conjugateQuat(q: Quat): Quat {
  return quat(-q.x, -q.y, -q.z, q.w);
}
export function computePoseDelta(previousPose: HandJointPose, nextPose: HandJointPose): PoseDelta {
  const positionDelta = subVec3(nextPose.position, previousPose.position);
  const rotationDelta = normalizeQuat(
    multiplyQuat(nextPose.rotation, conjugateQuat(normalizeQuat(previousPose.rotation)))
  );
  return Object.freeze({ positionDelta, rotationDelta });
}
