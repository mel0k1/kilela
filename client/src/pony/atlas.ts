import type { SpriteSheet } from './pt/interfaces';
import { spriteSheets } from './pt/sprites';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    img.src = src;
  });
}

function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(img, 0, 0);
  return context.getImageData(0, 0, img.width, img.height);
}

export const normalSheet: SpriteSheet = spriteSheets[0];
export const paletteSheet: SpriteSheet = spriteSheets[1];

export async function loadPonySheets(): Promise<void> {
  const [ponyImg, pony2Img, pony2aImg] = await Promise.all([
    loadImage('/pony/pony.png'),
    loadImage('/pony/pony2.png'),
    loadImage('/pony/pony2a.png'),
  ]);

  normalSheet.data = getImageData(ponyImg);
  paletteSheet.data = getImageData(pony2Img);

  const alpha = getImageData(pony2aImg);
  const alphaData = alpha.data;
  const sheetData = paletteSheet.data.data;

  for (let i = 0; i < sheetData.length; i += 4) {
    sheetData[i + 3] = alphaData[i];
  }
}
