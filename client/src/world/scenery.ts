export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')!];
}

export function makeSoftCircleTexture(size: number, color: string): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function makeGlowTexture(): HTMLCanvasElement {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);

  grad.addColorStop(0, 'rgba(255,240,190,0.95)');
  grad.addColorStop(0.4, 'rgba(255,220,150,0.45)');
  grad.addColorStop(1, 'rgba(255,210,130,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export { hashPosition } from '../../../shared/world';
