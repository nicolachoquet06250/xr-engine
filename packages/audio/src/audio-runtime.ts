import type {
  AudioBus,
  AudioClip,
  AudioEffect,
  AudioFeedbackClips,
  AudioGameplayFeedback,
  AudioListener,
  AudioPlaybackHandle,
  AudioSource,
  AudioSourceRuntimeState,
  AudioSystem,
  CreateAudioSystemOptions,
  SpatialAudioConfig,
} from './audio';
import type { Vec3 } from '@xr-engine/math';

const DEFAULT_POSITION: Vec3 = Object.freeze({ x: 0, y: 0, z: 0 });
const DEFAULT_MAX_DISTANCE = 25;
const DEFAULT_ROLLOFF = 1;
const MASTER_BUS_ID = 'master';

let sourceSequence = 0;
let handleSequence = 0;
let busSequence = 0;
let listenerSequence = 0;

function cloneVec3(value: Vec3): Vec3 {
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

class AudioBusImpl implements AudioBus {
  private _volume = 1;

  public constructor(
    public readonly id: string,
    volume = 1
  ) {
    this._volume = clamp01(volume);
  }

  public get volume(): number {
    return this._volume;
  }

  public set volume(volume: number) {
    this._volume = clamp01(volume);
  }
}

class AudioListenerImpl implements AudioListener {
  private position = DEFAULT_POSITION;

  public readonly id: string;

  public constructor(id?: string) {
    listenerSequence += 1;
    this.id = id ?? `listener-${listenerSequence}`;
  }

  public setPosition(position: Vec3): void {
    this.position = cloneVec3(position);
  }

  public getPosition(): Vec3 {
    return this.position;
  }
}

interface SourceConfig extends SpatialAudioConfig {
  readonly volume?: number;
  readonly loop?: boolean;
  readonly position?: Vec3;
  readonly busId?: string;
}

class AudioSourceImpl implements AudioSource {
  private _position = DEFAULT_POSITION;
  private readonly spatial: boolean;
  private readonly maxDistance: number;
  private readonly rolloffFactor: number;
  private _loop = false;
  private _volume = 1;
  private readonly busId: string;
  private currentClip: AudioClip | null = null;
  private playbackHandle: AudioPlaybackHandle | null = null;
  private playing = false;
  private paused = false;

  public readonly id: string;

  public constructor(
    private readonly system: AudioSystemImpl,
    config: SourceConfig = {}
  ) {
    sourceSequence += 1;
    this.id = `source-${sourceSequence}`;
    this.spatial = config.spatial ?? true;
    this.maxDistance = config.maxDistance ?? DEFAULT_MAX_DISTANCE;
    this.rolloffFactor = config.rolloffFactor ?? DEFAULT_ROLLOFF;
    this._loop = config.loop ?? false;
    this._volume = clamp01(config.volume ?? 1);
    this.busId = config.busId ?? MASTER_BUS_ID;
    this._position = config.position ? cloneVec3(config.position) : DEFAULT_POSITION;
  }

  public get state(): AudioSourceRuntimeState {
    return Object.freeze({
      playing: this.playing,
      paused: this.paused,
      loop: this._loop,
      volume: this._volume,
      effectiveVolume: this.system.resolveEffectiveVolume(this),
      attenuation: this.system.resolveDistanceAttenuation(this),
      clipId: this.currentClip?.id ?? null,
      busId: this.busId,
      spatial: this.spatial,
    });
  }

  public setPosition(position: Vec3): void {
    this._position = cloneVec3(position);
  }

  public getPosition(): Vec3 {
    return this._position;
  }

  public setLoop(loop: boolean): void {
    this._loop = loop;
  }

  public setVolume(volume: number): void {
    this._volume = clamp01(volume);
  }

  public getVolume(): number {
    return this._volume;
  }

  public getBusId(): string {
    return this.busId;
  }

  public getSpatialConfig(): Required<SpatialAudioConfig> {
    return {
      spatial: this.spatial,
      maxDistance: this.maxDistance,
      rolloffFactor: this.rolloffFactor,
    };
  }

  public play(clip?: AudioClip): AudioPlaybackHandle {
    if (clip) {
      this.currentClip = clip;
    }
    if (!this.currentClip) {
      throw new Error(`AudioSource ${this.id} cannot play without a clip.`);
    }

    handleSequence += 1;
    const handle = Object.freeze({ id: `playback-${handleSequence}` });
    this.playbackHandle = handle;
    this.playing = true;
    this.paused = false;

    this.system.registerHandle(handle, this);
    return handle;
  }

  public stop(): void {
    if (this.playbackHandle) {
      this.system.unregisterHandle(this.playbackHandle);
    }
    this.playing = false;
    this.paused = false;
    this.playbackHandle = null;
  }

  public pause(): void {
    if (!this.playing) return;
    this.paused = true;
  }

  public resume(): void {
    if (!this.playing) return;
    this.paused = false;
  }
}

class AudioSystemImpl implements AudioSystem {
  private listener: AudioListenerImpl = new AudioListenerImpl('listener-default');
  private readonly sources = new Map<string, AudioSourceImpl>();
  private readonly handles = new Map<string, AudioSourceImpl>();
  private readonly buses = new Map<string, AudioBusImpl>();
  private readonly effects = new Map<string, AudioEffect>();

  public constructor(options: CreateAudioSystemOptions = {}) {
    this.buses.set(MASTER_BUS_ID, new AudioBusImpl(MASTER_BUS_ID, options.masterVolume ?? 1));
  }

  public createSource(config: SourceConfig = {}): AudioSource {
    if (!this.buses.has(config.busId ?? MASTER_BUS_ID)) {
      throw new Error(`Audio bus "${config.busId}" not found.`);
    }

    const source = new AudioSourceImpl(this, config);
    this.sources.set(source.id, source);
    return source;
  }

  public play(clip: AudioClip, options: SourceConfig = {}): AudioPlaybackHandle {
    const source = this.createSource(options);
    return source.play(clip);
  }

  public stop(handle: AudioPlaybackHandle): void {
    const source = this.handles.get(handle.id);
    source?.stop();
  }

  public pause(handle: AudioPlaybackHandle): void {
    const source = this.handles.get(handle.id);
    source?.pause();
  }

  public resume(handle: AudioPlaybackHandle): void {
    const source = this.handles.get(handle.id);
    source?.resume();
  }

  public createListener(id?: string): AudioListener {
    return new AudioListenerImpl(id);
  }

  public setListener(listener: AudioListener): void {
    const next = this.createListener(listener.id) as AudioListenerImpl;
    next.setPosition(listener.getPosition());
    this.listener = next;
  }

  public getListener(): AudioListener {
    return this.listener;
  }

  public createBus(id?: string, volume = 1): AudioBus {
    busSequence += 1;
    const busId = id ?? `bus-${busSequence}`;
    if (this.buses.has(busId)) {
      throw new Error(`Audio bus "${busId}" already exists.`);
    }
    const bus = new AudioBusImpl(busId, volume);
    this.buses.set(bus.id, bus);
    return bus;
  }

  public getBus(id: string): AudioBus | null {
    return this.buses.get(id) ?? null;
  }

  public addEffect(effect: AudioEffect): void {
    this.effects.set(effect.id, effect);
  }

  public removeEffect(effectId: string): void {
    this.effects.delete(effectId);
  }

  public getEffects(): readonly AudioEffect[] {
    return Object.freeze([...this.effects.values()]);
  }

  public registerHandle(handle: AudioPlaybackHandle, source: AudioSourceImpl): void {
    this.handles.set(handle.id, source);
  }

  public unregisterHandle(handle: AudioPlaybackHandle): void {
    this.handles.delete(handle.id);
  }

  public resolveDistanceAttenuation(source: AudioSourceImpl): number {
    const config = source.getSpatialConfig();
    if (!config.spatial) return 1;

    const d = distance(this.listener.getPosition(), source.getPosition());
    if (d <= 0) return 1;
    if (d >= config.maxDistance) return 0;

    const normalized = 1 - d / config.maxDistance;
    return clamp01(Math.pow(normalized, config.rolloffFactor));
  }

  public resolveEffectiveVolume(source: AudioSourceImpl): number {
    const attenuation = this.resolveDistanceAttenuation(source);
    const bus = this.buses.get(source.getBusId()) ?? this.buses.get(MASTER_BUS_ID);
    return clamp01(source.getVolume() * attenuation * (bus?.volume ?? 1));
  }
}

export function createAudioSystem(options: CreateAudioSystemOptions = {}): AudioSystem {
  return new AudioSystemImpl(options);
}

export function createAudioGameplayFeedback(
  system: AudioSystem,
  clips: AudioFeedbackClips,
  options: {
    readonly uiBusId?: string;
    readonly worldBusId?: string;
    readonly ambienceLoop?: boolean;
    readonly ambienceVolume?: number;
  } = {}
): AudioGameplayFeedback {
  const uiBusId = options.uiBusId ?? MASTER_BUS_ID;
  const worldBusId = options.worldBusId ?? MASTER_BUS_ID;
  const ambienceSource = clips.ambience
    ? system.createSource({
        spatial: false,
        loop: options.ambienceLoop ?? true,
        volume: options.ambienceVolume ?? 0.35,
        busId: worldBusId,
      })
    : null;

  return {
    onGrabFeedback(position?: Vec3) {
      const source = system.createSource({
        position,
        spatial: true,
        volume: 0.8,
        busId: worldBusId,
      });
      source.play(clips.grab);
    },
    onPokeFeedback(position?: Vec3) {
      const source = system.createSource({
        position,
        spatial: true,
        volume: 0.65,
        busId: worldBusId,
      });
      source.play(clips.poke);
    },
    onMenuFeedback() {
      const source = system.createSource({
        spatial: false,
        volume: 0.9,
        busId: uiBusId,
      });
      source.play(clips.menu);
    },
    startAmbience() {
      if (!ambienceSource || !clips.ambience) return;
      ambienceSource.play(clips.ambience);
    },
    stopAmbience() {
      ambienceSource?.stop();
    },
  };
}
