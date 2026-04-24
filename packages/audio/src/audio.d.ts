import type { Vec3 } from '@xr-engine/math';

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

export interface AudioSourceRuntimeState extends AudioSourceState {
  readonly effectiveVolume: number;
  readonly attenuation: number;
  readonly clipId: string | null;
  readonly busId: string;
  readonly spatial: boolean;
}

export interface AudioPlaybackHandle {
  readonly id: string;
}

export interface AudioBus {
  readonly id: string;
  volume: number;
}

export interface AudioEffect {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
}

export interface AudioListener {
  readonly id: string;
  setPosition(position: Vec3): void;
  getPosition(): Vec3;
}

export interface AudioSource {
  readonly id: string;
  readonly state: AudioSourceRuntimeState;
  setPosition(position: Vec3): void;
  getPosition(): Vec3;
  setLoop(loop: boolean): void;
  setVolume(volume: number): void;
  play(clip?: AudioClip): AudioPlaybackHandle;
  stop(): void;
  pause(): void;
  resume(): void;
}

export interface CreateAudioSystemOptions {
  readonly masterVolume?: number;
}

export interface AudioSystem {
  createSource(
    config?: SpatialAudioConfig & {
      readonly volume?: number;
      readonly loop?: boolean;
      readonly position?: Vec3;
      readonly busId?: string;
    }
  ): AudioSource;
  play(
    clip: AudioClip,
    options?: SpatialAudioConfig & {
      readonly volume?: number;
      readonly loop?: boolean;
      readonly position?: Vec3;
      readonly busId?: string;
    }
  ): AudioPlaybackHandle;
  stop(handle: AudioPlaybackHandle): void;
  pause(handle: AudioPlaybackHandle): void;
  resume(handle: AudioPlaybackHandle): void;
  createListener(id?: string): AudioListener;
  setListener(listener: AudioListener): void;
  getListener(): AudioListener;
  createBus(id?: string, volume?: number): AudioBus;
  getBus(id: string): AudioBus | null;
  addEffect(effect: AudioEffect): void;
  removeEffect(effectId: string): void;
  getEffects(): readonly AudioEffect[];
}

export interface AudioFeedbackClips {
  readonly grab: AudioClip;
  readonly poke: AudioClip;
  readonly menu: AudioClip;
  readonly ambience?: AudioClip;
}

export interface AudioGameplayFeedback {
  onGrabFeedback(position?: Vec3): void;
  onPokeFeedback(position?: Vec3): void;
  onMenuFeedback(): void;
  startAmbience(): void;
  stopAmbience(): void;
}

export declare function createAudioSystem(options?: CreateAudioSystemOptions): AudioSystem;

export declare function createAudioGameplayFeedback(
  system: AudioSystem,
  clips: AudioFeedbackClips,
  options?: {
    readonly uiBusId?: string;
    readonly worldBusId?: string;
    readonly ambienceLoop?: boolean;
    readonly ambienceVolume?: number;
  }
): AudioGameplayFeedback;
