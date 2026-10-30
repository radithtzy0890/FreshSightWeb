// Planet Oño Audio Engine for FreshSight
class SoundEngine {
  private enabled: boolean = true;
  private audioCache: Record<string, HTMLAudioElement> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('freshsight_sound');
        if (saved !== null) {
          this.enabled = saved === 'true';
        }
      } catch {}
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('freshsight_sound', String(this.enabled));
    } catch {}
    if (this.enabled) {
      this.play('click');
    }
    return this.enabled;
  }

  public play(name: 'click' | 'hover' | 'swoosh') {
    if (!this.enabled || typeof window === 'undefined') return;
    try {
      if (!this.audioCache[name]) {
        this.audioCache[name] = new Audio(`/sounds/${name}.mp3`);
        this.audioCache[name].volume = name === 'hover' ? 0.25 : 0.45;
      }
      const sound = this.audioCache[name];
      sound.currentTime = 0;
      sound.play().catch(() => {});
    } catch {}
  }
}

export const sound = new SoundEngine();
