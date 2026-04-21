// Re-export type declarations from the declaration file.  The
// `export type` syntax ensures no runtime code is emitted for these
// exports.  Consumers can import these types via
// `@xr-engine/scene`.
export type {
    Component, Entity,
    Scene, Transform,
    Camera, Light,
    ComponentType, EntityId,
    LayerMask, TagSet,
    SceneGraph, SceneNode
} from './scene.d.ts';

// Scene package public API.  Only type exports are provided here
// to avoid coupling consumers to the concrete implementation.  If
// runtime values are needed (e.g. a default scene factory) they
// should be defined in a separate implementation file.  The
// placeholder constant remains for backwards compatibility but
// consumers should not rely on it.
export const placeholder = 'scene package initialized';