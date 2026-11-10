import { el } from './dom';
import { randomLook, encodeLook, decodeLook, DEFAULT_LOOK, type Look } from '../pony/look';
import { sfx } from '../audio/sfx';

export interface LoginResult {
  name: string;
  look: Look;
}

export function showLogin(onStart: (result: LoginResult) => void): void {
  const savedName = localStorage.getItem('kilela.name') || '';
  const savedLookCode = localStorage.getItem('kilela.look');

  const overlay = el('div', 'overlay login-overlay', document.body);
  const panel = el('div', 'panel login-panel', overlay);
  const title = el('h1', 'login-title', panel);
  title.textContent = 'Килела';
  const subtitle = el('p', 'login-subtitle', panel);
  subtitle.textContent = 'тёплый мир маленьких пони';

  const form = el('div', 'login-form', panel);
  const label = el('label', 'login-label', form);
  label.textContent = 'Как зовут твою пони?';
  const input = el('input', 'login-input', form) as HTMLInputElement;
  input.maxLength = 16;
  input.value = savedName;
  input.placeholder = 'Искорка';

  const buttons = el('div', 'login-buttons', panel);

  const play = (look: Look) => {
    const name = input.value.trim() || 'Искорка';
    localStorage.setItem('kilela.name', name);
    localStorage.setItem('kilela.look', encodeLook(look));
    sfx.resume();
    overlay.remove();
    onStart({ name, look });
  };

  const playButton = el('button', 'btn primary', buttons);
  playButton.textContent = savedLookCode ? 'Играть' : 'Создать пони';
  playButton.addEventListener('click', () => play(savedLookCode ? decodeSaved(savedLookCode) : randomLook()));

  const newButton = el('button', 'btn', buttons);
  newButton.textContent = 'Новая пони';
  newButton.addEventListener('click', () => play(randomLook()));

  const randomButton = el('button', 'btn', buttons);
  randomButton.textContent = 'Случайно';
  randomButton.addEventListener('click', () => {
    input.value = input.value.trim() || 'Искорка';
    play(randomLook());
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (savedLookCode) {
        play(decodeSaved(savedLookCode));
      } else {
        play(randomLook());
      }
    }
  });

  setTimeout(() => input.focus(), 50);
}

function decodeSaved(code: string): Look {
  try {
    return decodeLook(code);
  } catch {
    return { ...DEFAULT_LOOK };
  }
}
