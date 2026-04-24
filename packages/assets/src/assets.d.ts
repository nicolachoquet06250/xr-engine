export type AssetType =
  | 'mesh'
  | 'texture'
  | 'material-config'
  | 'audio'
  | 'scene'
  | 'shader'
  | 'manifest'
  | 'input-config';

export type AssetCompression = 'none' | 'gzip' | 'brotli' | 'draco' | 'meshopt' | 'ktx2';

export interface AssetDescriptor {
  readonly id: string;
  readonly type: AssetType;
  readonly url: string;
  readonly fallbackId?: string;
  readonly version?: string;
  readonly hash?: string;
  readonly preload?: boolean;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface StreamChunkDescriptor {
  readonly id: string;
  readonly url: string;
  readonly order: number;
  readonly byteLength?: number;
}

export interface CompressedAssetDescriptor extends AssetDescriptor {
  readonly compression: AssetCompression;
}

export interface GltfAssetDescriptor extends AssetDescriptor {
  readonly type: 'scene' | 'mesh';
  readonly format: 'gltf' | 'glb';
  readonly embeddedResources?: boolean;
}

export interface StreamingAssetDescriptor extends AssetDescriptor {
  readonly chunks: readonly StreamChunkDescriptor[];
}

export interface AssetManifest {
  readonly id?: string;
  readonly version?: string;
  readonly assets: readonly AssetDescriptor[];
  readonly manifests?: readonly AssetManifest[];
  readonly preload?: readonly string[];
}

export interface AssetHandle<T = unknown> {
  readonly id: string;
  readonly type: AssetType;
  readonly value: T;
  readonly sourceUrl: string;
  readonly loadedAt: number;
  readonly version?: string;
}

export interface AssetCache {
  has(id: string): boolean;
  get<T = unknown>(id: string): AssetHandle<T> | null;
  set<T = unknown>(handle: AssetHandle<T>): void;
  delete(id: string): boolean;
  clear(): void;
  keys(): readonly string[];
}

export interface AssetLoadContext {
  readonly descriptor: AssetDescriptor;
  readonly fetcher: typeof fetch;
  readonly signal?: AbortSignal;
}

export interface AssetLoader<T = unknown> {
  readonly type: AssetType;
  load(context: AssetLoadContext): Promise<AssetHandle<T>>;
}

export interface MeshAsset {
  readonly id: string;
  readonly vertices?: readonly number[];
}

export interface TextureAsset {
  readonly id: string;
  readonly width?: number;
  readonly height?: number;
}

export interface MaterialConfigAsset {
  readonly id: string;
  readonly shader?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
}

export interface AudioAsset {
  readonly id: string;
  readonly duration?: number;
}

export interface SceneAsset {
  readonly id: string;
  readonly nodes?: readonly string[];
}

export interface ShaderAsset {
  readonly id: string;
  readonly stage?: 'vertex' | 'fragment' | 'compute';
}

export interface InputConfigAsset {
  readonly id: string;
  readonly actions?: Readonly<Record<string, string>>;
}

export interface AssetManager {
  load<T = unknown>(id: string): Promise<AssetHandle<T>>;
  loadMany(ids: readonly string[]): Promise<readonly AssetHandle[]>;
  preload(manifest?: AssetManifest): Promise<void>;
  release(handle: AssetHandle): void;
  clearCache(): void;
  invalidate(id: string): void;
  invalidateByTag(tag: string): void;
  registerLoader(type: AssetType, loader: AssetLoader): void;
  has(id: string): boolean;
  getDescriptor(id: string): AssetDescriptor | null;
}

export interface CreateAssetManagerOptions {
  readonly manifest?: AssetManifest;
  readonly fetcher?: typeof fetch;
}

export declare function createAssetManager(options?: CreateAssetManagerOptions): AssetManager;
export declare function createAssetManifest(
  assets: readonly AssetDescriptor[],
  id?: string
): AssetManifest;
