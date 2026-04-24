import { describe, it, expect } from 'vitest';

import { createRenderer } from '../render-runtime';
import { createScene, addCameraComponent } from '@xr-engine/scene';

describe('renderer runtime', () => {
  it('can initialize without canvas', async () => {
    const renderer = createRenderer();
    await renderer.initialize();
    expect(renderer.context).toBeDefined();
  });

  it('resizes context', () => {
    const renderer = createRenderer();
    renderer.resize(100, 50, 2);
    expect(renderer.context.width).toBe(100);
    expect(renderer.context.height).toBe(50);
    expect(renderer.context.pixelRatio).toBe(2);
  });

  it('creates mesh from array data', () => {
    const renderer = createRenderer();
    const mesh = renderer.createMesh([0, 0, 0, 1, 1, 1]);
    expect(mesh.vertexCount).toBeGreaterThan(0);
  });

  it('creates texture with dimensions', () => {
    const renderer = createRenderer();
    const source = { width: 64, height: 32 } as unknown as ImageData;
    const texture = renderer.createTexture(source);
    expect(texture.width).toBe(64);
    expect(texture.height).toBe(32);
  });

  it('can render a scene safely', async () => {
    const renderer = createRenderer();
    await renderer.initialize();

    const scene = createScene();
    const entity = scene.createEntity('camera');
    const camera = addCameraComponent(entity);

    expect(() => renderer.render(scene, camera)).not.toThrow();
  });

  it('disposeResource does not throw', () => {
    const renderer = createRenderer();
    const mesh = renderer.createMesh([0, 0, 0]);
    expect(() => renderer.disposeResource(mesh)).not.toThrow();
  });
});
