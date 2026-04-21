export interface DebugSnapshot {
    readonly timestamp: number;
    readonly data: Record<string, unknown>;
}

export interface EngineInspector {
    captureSnapshot(): DebugSnapshot;
}

export interface SceneInspector {
    listEntities(): readonly string[];
}

export interface PhysicsInspector {
    listBodies(): readonly string[];
}

export interface InputInspector {
    getActionStates(): Readonly<Record<string, unknown>>;
}

export interface XRInspector {
    getTrackingState(): unknown;
}

export interface HandTrackingInspector {
    getJointStates(): readonly unknown[];
}

export interface PerformancePanel {
    getMetrics(): Readonly<Record<string, number>>;
}
