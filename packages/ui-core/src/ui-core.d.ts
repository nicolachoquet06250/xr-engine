export interface UIPanelState {
    readonly id: string;
    readonly visible: boolean;
}

export interface UIRouteState {
    readonly route: string;
}

export interface UINodeModel {
    readonly id: string;
    readonly kind: string;
}

export interface UIOverlayState {
    readonly overlays: readonly UIPanelState[];
}

export interface UIStateStore<TState = unknown> {
    getState(): TState;
    setState(partial: Partial<TState>): void;
}

export interface UIEventBus {
    emit(event: { type: string; payload?: unknown }): void;
    subscribe(type: string, listener: (event: { type: string; payload?: unknown }) => void): () => void;
}

export interface UIFocusManager {
    focus(id: string): void;
    blur(): void;
    getFocusedId(): string | null;
}

export interface UIActionDispatcher {
    dispatch(action: { type: string; payload?: unknown }): void;
}
