export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (parent) {
    parent.appendChild(node);
  }

  return node;
}

export function clear(node: HTMLElement) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function colorSwatches(
  parent: HTMLElement, colors: string[] | number[], current: number, onPick: (color: number) => void,
) {
  const row = el('div', 'swatches', parent);

  for (const color of colors) {
    const value = typeof color === 'string'
      ? (color.startsWith('#') ? color : '#' + color)
      : '#' + (color >>> 8).toString(16).padStart(6, '0');
    const swatch = el('button', 'swatch' + (normalizeHex(value) === normalizeColor(current) ? ' active' : ''), row);
    swatch.style.background = value;
    swatch.title = value;
    swatch.addEventListener('click', () => {
      onPick(cssToColor(value));
      row.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    });
  }

  return row;
}

function normalizeHex(hex: string): string {
  return hex.replace('#', '').toLowerCase();
}

function normalizeColor(color: number): string {
  return (color >>> 8).toString(16).padStart(6, '0').toLowerCase();
}

export function cssToColor(css: string): number {
  const hex = css.replace('#', '');
  const value = parseInt(hex, 16);
  return ((value << 8) | 0xff) >>> 0;
}

export function colorToCss(color: number): string {
  return '#' + (color >>> 8).toString(16).padStart(6, '0');
}

export const WARM_SWATCHES = [
  'ffe0b8', 'ffdab9', 'f5deb3', 'e6c8a0', 'd9b8df', 'c9b1e8', 'a8c8f0', 'b8e0d0',
  'f0f0f0', 'e8e0d0', 'fff0f5', 'ffe4e1', 'dcdcc8', 'c8e8f8', 'f8d8e8', 'ffc8b8',
  '8a5a3b', '704838', '404040', '2e2e3a',
];

export const MANE_SWATCHES = [
  '8a5a3b', 'd9a45b', 'f1d224', 'ff8ac2', '9b59d0', '56c7ff', '50c878', 'e7559b',
  'ff6b6b', '704838', 'f0f0f0', '404040', 'ffa500', '2ecc71', '3498db', 'c0392b',
  'ffefd5', 'bdc3c7', '7f8c8d', '34495e',
];
