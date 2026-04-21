export interface WasmHandle {
  readonly id: number;
}

export interface WasmMemoryView {
  readonly buffer: ArrayBuffer;
}

export interface WasmModuleInstance {
  readonly exports: WebAssembly.Exports;
  readonly memory?: WebAssembly.Memory;
}

export interface WasmAllocator {
  allocate(size: number): number;
  free(pointer: number): void;
}

export interface WasmBridge {
  initialize(): Promise<void>;
  dispose(): void;
}

export interface PhysicsBackendBridge extends WasmBridge {
  createWorld(): WasmHandle;
  destroyWorld(world: WasmHandle): void;
}

export interface WasmModuleLoader {
  load(urlOrBinary: string | ArrayBuffer | Uint8Array): Promise<WasmModuleInstance>;
}

export declare function createWasmModuleLoader(): WasmModuleLoader;
