import { transformPoint, vec3 } from '../../../math/src/math-runtime';
import { describe, expect, it } from 'vitest';

import {
  addAudioSourceComponent,
  addCameraComponent,
  addColliderComponent,
  addHandInteractableComponent,
  addInteractableComponent,
  addLightComponent,
  addMeshComponent,
  addRigidBodyComponent,
  addTransformComponent,
  CAMERA_COMPONENT,
  createComponentType,
  createScene,
  SCENE_SYSTEM_IDS,
  TRANSFORM_COMPONENT,
} from '../index';

describe('scene runtime', () => {
  it('creates scenes and entities', () => {
    const scene = createScene('test-scene');
    const entity = scene.createEntity('Camera');

    expect(scene.id).toBe('test-scene');
    expect(scene.findEntityById(entity.id)).toBe(entity);
    expect(scene.findEntityByName('Camera')).toBe(entity);
    expect(scene.getEntities()).toContain(entity);
    expect(scene.graph.rootEntities).toContain(entity);
  });

  it('maintains parent child relationships and root entities', () => {
    const scene = createScene();
    const parent = scene.createEntity('Parent');
    const child = scene.createEntity('Child');

    child.setParent(parent);

    expect(child.getParent()).toBe(parent);
    expect(parent.getChildren()).toContain(child);
    expect(scene.graph.rootEntities).toContain(parent);
    expect(scene.graph.rootEntities).not.toContain(child);
  });

  it('updates transform world matrices through hierarchy', () => {
    const scene = createScene();
    const parent = scene.createEntity('Parent');
    const child = scene.createEntity('Child');
    child.setParent(parent);

    parent.transform.setPosition(vec3(10, 0, 0));
    child.transform.setPosition(vec3(0, 2, 0));

    const worldOrigin = transformPoint(child.transform.getWorldMatrix(), vec3(0, 0, 0));
    expect(worldOrigin).toEqual(vec3(10, 2, 0));
  });

  it('manages tags and queries', () => {
    const scene = createScene();
    const entity = scene.createEntity('Tagged');

    entity.addTag('player');
    entity.addTag('interactive');

    expect(entity.hasTag('player')).toBe(true);
    expect(scene.findEntitiesByTag('interactive')).toEqual([entity]);

    entity.removeTag('player');
    expect(entity.hasTag('player')).toBe(false);
  });

  it('destroys entity subtrees recursively', () => {
    const scene = createScene();
    const parent = scene.createEntity('Parent');
    const child = scene.createEntity('Child');
    child.setParent(parent);

    scene.destroyEntity(parent.id);

    expect(scene.findEntityById(parent.id)).toBeNull();
    expect(scene.findEntityById(child.id)).toBeNull();
  });

  it('creates branded component types', () => {
    const type = createComponentType('custom/component');
    expect(type).toBe('custom/component');
  });

  it('adds MVP components without duplicating singletons', () => {
    const scene = createScene();
    const entity = scene.createEntity('Actor');

    const transform = addTransformComponent(entity);
    const camera = addCameraComponent(entity, { fov: 75 });
    const light = addLightComponent(entity, { kind: 'point' });
    const mesh = addMeshComponent(entity, { meshId: 'cube' });
    const rigidBody = addRigidBodyComponent(entity, { mass: 2 });
    const collider = addColliderComponent(entity, { shape: 'sphere' });
    const audio = addAudioSourceComponent(entity, { clipId: 'click' });
    const interactable = addInteractableComponent(entity, { canGrab: true });
    const handInteractable = addHandInteractableComponent(entity, { allowPoke: false });

    expect(entity.getComponent(TRANSFORM_COMPONENT)).toBe(transform);
    expect(entity.getComponent(CAMERA_COMPONENT)).toBe(camera);
    expect(addCameraComponent(entity)).toBe(camera);
    expect(light.kind).toBe('point');
    expect(mesh.meshId).toBe('cube');
    expect(rigidBody.mass).toBe(2);
    expect(collider.shape).toBe('sphere');
    expect(audio.clipId).toBe('click');
    expect(interactable.canGrab).toBe(true);
    expect(handInteractable.allowPoke).toBe(false);
  });

  it('removes components by type', () => {
    const scene = createScene();
    const entity = scene.createEntity('Camera');
    addCameraComponent(entity);

    entity.removeComponent(CAMERA_COMPONENT);
    expect(entity.getComponent(CAMERA_COMPONENT)).toBeNull();
  });

  it('exposes canonical MVP system ids', () => {
    expect(SCENE_SYSTEM_IDS.transform).toBe('scene.transform');
    expect(SCENE_SYSTEM_IDS.render).toBe('scene.render');
    expect(SCENE_SYSTEM_IDS.ui).toBe('scene.ui');
  });
});
