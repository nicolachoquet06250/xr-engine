import type { Vec3 } from '../../math/src/math';

export interface AudioClip {
  readonly id: string;
  readonly duration: number;
}

export interface SpatialAudioConfig {
  readonly spatial?: boolean;
  readonly maxDistance?: number;
  readonly rolloffFactor?: number;
}

export interface AudioSourceState {
  readonly playing: boolean;
  readonly paused: boolean;
  readonly loop: boolean;
  readonly volume: number;
}

export interface AudioPlaybackHandle {
  readonly id: string;
}

export interface AudioBus {
  readonly id: string;
  volume: number;
}

export interface AudioListener {
  readonly id: string;
  setPosition(position: Vec3): void;
}

export interface AudioSource {
  readonly id: string;
  readonly state: AudioSourceState;
  setPosition(position: Vec3): void;
  setLoop(loop: boolean): void;
  setVolume(volume: number): void;
  play(clip?: AudioClip): AudioPlaybackHandle;
  stop(): void;
  pause(): void;
  resume(): void;
}

export interface AudioSystem {
  createSource(config?: SpatialAudioConfig): AudioSource;
  play(clip: AudioClip, options?: SpatialAudioConfig): AudioPlaybackHandle;
  stop(handle: AudioPlaybackHandle): void;
  pause(handle: AudioPlaybackHandle): void;
  resume(handle: AudioPlaybackHandle): void;
  setListener(listener: AudioListener): void;
}

export declare function createAudioSystem(): AudioSystem;
