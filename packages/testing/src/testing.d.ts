export interface TestEngine {
    readonly engine: unknown;
}

export interface TestHarness {
    readonly engine: TestEngine;
}

export interface MockXRSession {
    readonly active: boolean;
}

export interface MockXRHand {
    readonly handedness: 'left' | 'right';
}

export interface MockXRController {
    readonly handedness: 'left' | 'right';
}

export interface MockGamepad {
    readonly connected: boolean;
}

export interface TestFixture {
    readonly id: string;
}

export interface FrameDriver {
    tick(frames?: number): void;
}

export declare function createTestEngine(): TestEngine;
export declare function createMockScene(): unknown;
export declare function createMockXRSession(): MockXRSession;
export declare function createMockXRHand(handedness?: 'left' | 'right'): MockXRHand;
export declare function createMockGamepad(): MockGamepad;
export declare function tickEngine(frames?: number): void;
export declare function advanceTime(ms: number): void;
export declare function renderTestFrame(): void;
