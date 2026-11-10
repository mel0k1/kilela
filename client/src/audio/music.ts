const PLAYLISTS: Record<string, string[]> = {
  meadow: ['bossanova.mp3', 'clop.mp3', 'fivefour.mp3', 'scherzo.mp3', 'trills.mp3', 'waltzalt.mp3'],
  forest: ['trees.mp3', 'trills.mp3', 'scherzo.mp3'],
  peaks: ['reindeer-winter.mp3', 'trees-winter.mp3'],
};

const FADE_MS = 1000;

export class MusicPlayer {
  private audio: HTMLAudioElement | undefined;
  private playlist: string[] = [];
  private loops = 0;
  private volume = 0.45;

  setVolume(volume: number) {
    this.volume = volume;

    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  setPlaylist(mapId: string) {
    const list = PLAYLISTS[mapId] || PLAYLISTS.meadow;

    if (list.join('|') === this.playlist.join('|')) return;

    this.playlist = list;
    this.playTrack();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = undefined;
    }

    this.playlist = [];
  }

  private pick(): string {
    return this.playlist[Math.floor(Math.random() * this.playlist.length)];
  }

  private playTrack() {
    if (this.playlist.length === 0) return;

    const old = this.audio;
    const next = this.pick();
    const audio = new Audio('/music/' + next);
    audio.loop = false;
    audio.volume = old ? 0 : this.volume;
    this.audio = audio;
    this.loops = 3 + Math.floor(Math.random() * 3);

    audio.addEventListener('ended', () => {
      if (this.audio !== audio) return;

      this.loops--;

      if (this.loops < 0) {
        this.playTrack();
      } else {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
      }
    });

    audio.play().catch(() => undefined);

    if (old) {
      this.fade(old, old.volume, 0, () => {
        old.pause();
      });
      this.fade(audio, 0, this.volume);
    }
  }

  private fade(audio: HTMLAudioElement, from: number, to: number, done?: () => void) {
    const start = performance.now();
    const step = () => {
      if (!done && this.audio !== audio && to > 0) return;

      const t = Math.min(1, (performance.now() - start) / FADE_MS);
      audio.volume = from + (to - from) * t;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        done && done();
      }
    };
    requestAnimationFrame(step);
  }
}
