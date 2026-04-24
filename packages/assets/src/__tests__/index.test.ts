import { describe, expect, it } from 'vitest';
import { createAssetManager, createAssetManifest } from '../index';
import type { AssetDescriptor, AssetHandle } from '../assets';

const meshDescriptor: AssetDescriptor = {
  id: 'mesh-player',
  type: 'mesh',
  url: '/assets/mesh-player.json',
  preload: true,
  tags: ['scene:arena'],
};

const fallbackTextureDescriptor: AssetDescriptor = {
  id: 'texture-fallback',
  type: 'texture',
  url: '/assets/texture-fallback.json',
};

const textureDescriptor: AssetDescriptor = {
  id: 'texture-ui',
  type: 'texture',
  url: '/assets/texture-ui.json',
  fallbackId: fallbackTextureDescriptor.id,
  tags: ['ui'],
};

const nestedManifest = createAssetManifest([fallbackTextureDescriptor], 'nested-manifest');

function createFakeFetcher() {
  const calls: string[] = [];
  const byUrl = new Map<string, { ok: boolean; status: number; payload?: unknown }>([
    ['/assets/mesh-player.json', { ok: true, status: 200, payload: { vertices: [0, 1, 2] } }],
    ['/assets/texture-fallback.json', { ok: true, status: 200, payload: { width: 1, height: 1 } }],
    [
      '/assets/input-default.json',
      { ok: true, status: 200, payload: { actions: { jump: 'Space' } } },
    ],
    ['/assets/texture-ui.json', { ok: false, status: 500 }],
  ]);

  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    const config = byUrl.get(url);

    if (!config) {
      return new Response(null, { status: 404 });
    }

    if (!config.ok) {
      return new Response(null, { status: config.status });
    }

    return new Response(JSON.stringify(config.payload ?? {}), {
      status: config.status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return {
    fetcher,
    calls,
  };
}

describe('assets runtime', () => {
  it('loads cached assets, supports preload and nested manifests', async () => {
    const { fetcher, calls } = createFakeFetcher();
    const manifest = {
      id: 'root',
      assets: [meshDescriptor],
      manifests: [nestedManifest],
      preload: [meshDescriptor.id],
    };

    const assets = createAssetManager({ manifest, fetcher });
    await assets.preload();

    expect(assets.has(meshDescriptor.id)).toBe(true);

    const mesh = await assets.load<{ vertices: number[] }>(meshDescriptor.id);
    expect(mesh.value.vertices).toEqual([0, 1, 2]);

    const second = await assets.load(meshDescriptor.id);
    expect(second).toBe(mesh);
    expect(calls.filter((entry) => entry === meshDescriptor.url)).toHaveLength(1);

    const fallback = await assets.load<{ width: number; height: number }>(
      fallbackTextureDescriptor.id
    );
    expect(fallback.value.width).toBe(1);
  });

  it('supports fallback loading and invalidation semantics', async () => {
    const { fetcher } = createFakeFetcher();

    const assets = createAssetManager({
      manifest: createAssetManifest([textureDescriptor, fallbackTextureDescriptor]),
      fetcher,
    });

    const handle = await assets.load<{ width: number }>(textureDescriptor.id);
    expect(handle.id).toBe(fallbackTextureDescriptor.id);

    assets.invalidate(fallbackTextureDescriptor.id);
    expect(assets.has(fallbackTextureDescriptor.id)).toBe(false);

    const reloaded = await assets.load<{ height: number }>(fallbackTextureDescriptor.id);
    expect(reloaded.value.height).toBe(1);
  });

  it('supports custom loaders, release and tag invalidation', async () => {
    const manifest = createAssetManifest([
      {
        id: 'input-default',
        type: 'input-config',
        url: '/assets/input-default.json',
        tags: ['controls'],
      },
    ]);

    const loaded: AssetHandle[] = [];
    const assets = createAssetManager({ manifest, fetcher: createFakeFetcher().fetcher });

    assets.registerLoader('input-config', {
      type: 'input-config',
      async load(context) {
        const handle: AssetHandle = Object.freeze({
          id: context.descriptor.id,
          type: context.descriptor.type,
          value: { mapped: true },
          sourceUrl: context.descriptor.url,
          loadedAt: Date.now(),
        });
        loaded.push(handle);
        return handle;
      },
    });

    const inputConfig = await assets.load<{ mapped: boolean }>('input-default');
    expect(inputConfig.value.mapped).toBe(true);

    assets.release(inputConfig);
    expect(assets.has('input-default')).toBe(false);

    await assets.load('input-default');
    assets.invalidateByTag('controls');
    expect(assets.has('input-default')).toBe(false);

    expect(loaded.length).toBe(2);
  });
});
