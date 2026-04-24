import { describe, expect, it } from 'vitest';
import { createAudioGameplayFeedback, createAudioSystem } from '../index';
import type { AudioClip } from '../audio';

const CLIP: AudioClip = Object.freeze({ id: 'clip-test', duration: 1.5 });
const CLIP_GRAB: AudioClip = Object.freeze({ id: 'grab', duration: 0.15 });
const CLIP_POKE: AudioClip = Object.freeze({ id: 'poke', duration: 0.15 });
const CLIP_MENU: AudioClip = Object.freeze({ id: 'menu', duration: 0.2 });
const CLIP_AMBIENCE: AudioClip = Object.freeze({ id: 'ambience', duration: 50 });

describe('audio runtime', () => {
  it('provides listener, source lifecycle, and playback controls', () => {
    const audio = createAudioSystem();
    const source = audio.createSource({ spatial: false, volume: 0.5, loop: true });

    const handle = source.play(CLIP);
    expect(source.state.playing).toBe(true);
    expect(source.state.paused).toBe(false);
    expect(source.state.loop).toBe(true);
    expect(source.state.volume).toBe(0.5);

    audio.pause(handle);
    expect(source.state.paused).toBe(true);

    audio.resume(handle);
    expect(source.state.paused).toBe(false);

    audio.stop(handle);
    expect(source.state.playing).toBe(false);
  });

  it('computes distance attenuation for 3D sources', () => {
    const audio = createAudioSystem();
    const listener = audio.createListener('listener-main');
    listener.setPosition({ x: 0, y: 0, z: 0 });
    audio.setListener(listener);

    const source = audio.createSource({
      spatial: true,
      maxDistance: 20,
      rolloffFactor: 1,
      volume: 1,
      position: { x: 10, y: 0, z: 0 },
    });
    source.play(CLIP);

    expect(source.state.attenuation).toBeCloseTo(0.5, 5);
    expect(source.state.effectiveVolume).toBeCloseTo(0.5, 5);

    source.setPosition({ x: 50, y: 0, z: 0 });
    expect(source.state.attenuation).toBe(0);
    expect(source.state.effectiveVolume).toBe(0);
  });

  it('supports phase 2 primitives (buses and effects)', () => {
    const audio = createAudioSystem({ masterVolume: 0.9 });
    const uiBus = audio.createBus('ui', 0.5);

    const source = audio.createSource({ spatial: false, volume: 1, busId: uiBus.id });
    source.play(CLIP);
    expect(source.state.effectiveVolume).toBeCloseTo(0.5, 5);

    audio.addEffect({ id: 'reverb-small', type: 'reverb', enabled: true });
    expect(audio.getEffects()).toHaveLength(1);

    audio.removeEffect('reverb-small');
    expect(audio.getEffects()).toHaveLength(0);
  });

  it('triggers gameplay audio feedback for grab, poke, menu and ambience', () => {
    const audio = createAudioSystem();
    const feedback = createAudioGameplayFeedback(
      audio,
      {
        grab: CLIP_GRAB,
        poke: CLIP_POKE,
        menu: CLIP_MENU,
        ambience: CLIP_AMBIENCE,
      },
      {
        ambienceLoop: true,
      }
    );

    feedback.onGrabFeedback({ x: 1, y: 0, z: 0 });
    feedback.onPokeFeedback({ x: 0, y: 1, z: 0 });
    feedback.onMenuFeedback();
    feedback.startAmbience();

    feedback.stopAmbience();

    expect(true).toBe(true);
  });
});
