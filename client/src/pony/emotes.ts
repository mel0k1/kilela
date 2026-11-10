import { EMOTE_SHEETS } from './pt/emote-frames';

export interface EmoteAnim {
  canvases: HTMLCanvasElement[];
  fps: number;
}

const EMOTE_SIZE = 80;
const cache = new Map<string, EmoteAnim>();

export async function preloadEmotes(): Promise<void> {
  await Promise.all(EMOTE_SHEETS.map(async meta => {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Не удалось загрузить ${meta.url}`));
      image.src = meta.url;
    });

    const strip = document.createElement('canvas');
    strip.width = image.width;
    strip.height = image.height;
    strip.getContext('2d')!.drawImage(image, 0, 0);

    const canvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < meta.count; i++) {
      const frame = document.createElement('canvas');
      frame.width = EMOTE_SIZE;
      frame.height = EMOTE_SIZE;
      frame.getContext('2d')!.drawImage(strip, i * EMOTE_SIZE, 0, EMOTE_SIZE, EMOTE_SIZE, 0, 0, EMOTE_SIZE, EMOTE_SIZE);
      canvases.push(frame);
    }

    cache.set(meta.name, { canvases, fps: meta.fps });
  }));
}

export function emoteAnim(name: string): EmoteAnim | undefined {
  return cache.get(name);
}
