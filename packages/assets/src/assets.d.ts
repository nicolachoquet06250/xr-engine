export interface AssetDescriptor {
  readonly id: string;
  readonly type: string;
  readonly url: string;
}

export interface AssetManifest {
  readonly assets: readonly AssetDescriptor[];
}

export interface AssetHandle<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly value: T;
}

export interface AssetCache {
  has(id: string): boolean;
  get<T = unknown>(id: string): AssetHandle<T> | null;
  clear(): void;
}

export interface AssetLoader<T = unknown> {
  readonly type: string;
  load(descriptor: AssetDescriptor): Promise<AssetHandle<T>>;
}

export interface MeshAsset {
  readonly id: string;
}

export interface TextureAsset {
  readonly id: string;
}

export interface AudioAsset {
  readonly id: string;
}

export interface SceneAsset {
  readonly id: string;
}

export interface ShaderAsset {
  readonly id: string;
}

export interface AssetManager {
  load<T = unknown>(id: string): Promise<AssetHandle<T>>;
  loadMany(ids: readonly string[]): Promise<readonly AssetHandle[]>;
  preload(manifest: AssetManifest): Promise<void>;
  release(handle: AssetHandle): void;
  clearCache(): void;
  registerLoader(type: string, loader: AssetLoader): void;
  has(id: string): boolean;
}

export declare function createAssetManager(manifest?: AssetManifest): AssetManager;
