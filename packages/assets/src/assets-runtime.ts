import type {
  AssetCache,
  AssetDescriptor,
  AssetHandle,
  AssetLoadContext,
  AssetLoader,
  AssetManager,
  AssetManifest,
  AssetType,
  CreateAssetManagerOptions,
} from './assets';

class AssetCacheImpl implements AssetCache {
  private readonly entries = new Map<string, AssetHandle>();

  public has(id: string): boolean {
    return this.entries.has(id);
  }

  public get<T = unknown>(id: string): AssetHandle<T> | null {
    return (this.entries.get(id) as AssetHandle<T> | undefined) ?? null;
  }

  public set<T = unknown>(handle: AssetHandle<T>): void {
    this.entries.set(handle.id, handle);
  }

  public delete(id: string): boolean {
    return this.entries.delete(id);
  }

  public clear(): void {
    this.entries.clear();
  }

  public keys(): readonly string[] {
    return Array.from(this.entries.keys());
  }
}

class JsonAssetLoader implements AssetLoader {
  public constructor(public readonly type: AssetType) {}

  public async load(context: AssetLoadContext): Promise<AssetHandle> {
    const response = await context.fetcher(context.descriptor.url, { signal: context.signal });
    if (!response.ok) {
      throw new Error(
        `Unable to load asset "${context.descriptor.id}" from ${context.descriptor.url} (${response.status})`
      );
    }

    const body = (await response.json()) as unknown;
    return Object.freeze({
      id: context.descriptor.id,
      type: context.descriptor.type,
      value: body,
      sourceUrl: context.descriptor.url,
      version: context.descriptor.version,
      loadedAt: Date.now(),
    });
  }
}

function flattenManifest(manifest: AssetManifest): readonly AssetDescriptor[] {
  const nested = manifest.manifests?.flatMap(flattenManifest) ?? [];
  return [...manifest.assets, ...nested];
}

function toDescriptorMap(manifest: AssetManifest): Map<string, AssetDescriptor> {
  const map = new Map<string, AssetDescriptor>();
  for (const descriptor of flattenManifest(manifest)) {
    map.set(descriptor.id, descriptor);
  }
  return map;
}

export class AssetManagerImpl implements AssetManager {
  private readonly cache = new AssetCacheImpl();
  private readonly loaders = new Map<AssetType, AssetLoader>();
  private readonly inFlight = new Map<string, Promise<AssetHandle>>();
  private descriptors = new Map<string, AssetDescriptor>();
  private readonly fetcher: typeof fetch;

  public constructor(options: CreateAssetManagerOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.descriptors = options.manifest ? toDescriptorMap(options.manifest) : new Map();

    const defaultTypes: readonly AssetType[] = [
      'mesh',
      'texture',
      'material-config',
      'audio',
      'scene',
      'shader',
      'manifest',
      'input-config',
    ];

    for (const type of defaultTypes) {
      this.registerLoader(type, new JsonAssetLoader(type));
    }
  }

  public async load<T = unknown>(id: string): Promise<AssetHandle<T>> {
    const cached = this.cache.get<T>(id);
    if (cached) return cached;

    const inflight = this.inFlight.get(id);
    if (inflight) {
      return (await inflight) as AssetHandle<T>;
    }

    const descriptor = this.descriptors.get(id);
    if (!descriptor) {
      throw new Error(`Unknown asset id "${id}".`);
    }

    const loader = this.loaders.get(descriptor.type);
    if (!loader) {
      throw new Error(`No loader registered for type "${descriptor.type}".`);
    }

    const loadPromise = loader
      .load({ descriptor, fetcher: this.fetcher })
      .then((handle) => {
        this.cache.set(handle);
        this.inFlight.delete(id);
        return handle;
      })
      .catch(async (error: unknown) => {
        this.inFlight.delete(id);
        if (!descriptor.fallbackId) {
          throw error;
        }
        return this.load(descriptor.fallbackId);
      });

    this.inFlight.set(id, loadPromise);
    return (await loadPromise) as AssetHandle<T>;
  }

  public async loadMany(ids: readonly string[]): Promise<readonly AssetHandle[]> {
    return Promise.all(ids.map((id) => this.load(id)));
  }

  public async preload(manifest?: AssetManifest): Promise<void> {
    if (manifest) {
      for (const descriptor of flattenManifest(manifest)) {
        this.descriptors.set(descriptor.id, descriptor);
      }
    }

    const ids = new Set<string>();

    for (const [id, descriptor] of this.descriptors.entries()) {
      if (descriptor.preload) ids.add(id);
    }

    const manifestIds = manifest?.preload ?? [];
    for (const id of manifestIds) {
      ids.add(id);
    }

    await this.loadMany(Array.from(ids));
  }

  public release(handle: AssetHandle): void {
    this.cache.delete(handle.id);
  }

  public clearCache(): void {
    this.cache.clear();
    this.inFlight.clear();
  }

  public invalidate(id: string): void {
    this.cache.delete(id);
    this.inFlight.delete(id);
  }

  public invalidateByTag(tag: string): void {
    for (const descriptor of this.descriptors.values()) {
      if (descriptor.tags?.includes(tag)) {
        this.invalidate(descriptor.id);
      }
    }
  }

  public registerLoader(type: AssetType, loader: AssetLoader): void {
    this.loaders.set(type, loader);
  }

  public has(id: string): boolean {
    return this.cache.has(id);
  }

  public getDescriptor(id: string): AssetDescriptor | null {
    return this.descriptors.get(id) ?? null;
  }
}

export function createAssetManifest(
  assets: readonly AssetDescriptor[],
  id?: string
): AssetManifest {
  return Object.freeze({ id, version: '1', assets: Object.freeze([...assets]) });
}

export function createAssetManager(options: CreateAssetManagerOptions = {}): AssetManager {
  return new AssetManagerImpl(options);
}
