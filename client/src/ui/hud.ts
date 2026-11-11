import { el, clear } from './dom';
import { sfx } from '../audio/sfx';
import { TOYS } from '../../../shared/protocol';

export interface HudCallbacks {
  onEmote(action: string): void;
  onChatSend(text: string): void;
  onOpenEditor(): void;
  onLogout(): void;
  onPhotoToggle(): void;
  onSoundToggle(): void;
  onMusicVolume(volume: number): void;
}

export class Hud {
  root: HTMLElement;
  private mapLabel: HTMLElement;
  private onlineLabel: HTMLElement;
  private clockLabel: HTMLElement;
  private chatLog: HTMLElement;
  private chatInput: HTMLInputElement;
  private cb: HudCallbacks;
  private emoteButtons = new Map<string, HTMLButtonElement>();
  private soundButton: HTMLButtonElement;
  private musicSlider: HTMLInputElement;
  soundOn = true;

  constructor(cb: HudCallbacks) {
    this.cb = cb;
    this.root = el('div', 'hud', document.body);

    const topbar = el('div', 'topbar', this.root);
    this.mapLabel = el('span', 'topbar-map', topbar);
    this.onlineLabel = el('span', 'topbar-online', topbar);
    this.clockLabel = el('span', 'topbar-clock', topbar);
    const editButton = el('button', 'btn small topbar-edit', topbar);
    editButton.textContent = 'Внешность';
    editButton.addEventListener('click', () => {
      sfx.play('click');
      this.cb.onOpenEditor();
    });
    const photoButton = el('button', 'btn small', topbar);
    photoButton.textContent = '📷';
    photoButton.title = 'Фоторежим (P), снимок — C';
    photoButton.addEventListener('click', () => {
      sfx.play('click');
      this.cb.onPhotoToggle();
    });
    this.soundButton = el('button', 'btn small', topbar) as HTMLButtonElement;
    this.soundButton.textContent = '🔊';
    this.soundButton.title = 'Звуки (M)';
    this.soundButton.addEventListener('click', () => this.cb.onSoundToggle());

    const musicLabel = el('span', 'music-label', topbar);
    musicLabel.textContent = '🎵';
    musicLabel.title = 'Громкость музыки';
    this.musicSlider = el('input', 'music-slider', topbar) as HTMLInputElement;
    this.musicSlider.type = 'range';
    this.musicSlider.min = '0';
    this.musicSlider.max = '100';
    this.musicSlider.value = String(Math.round((localStorage.getItem('kilela.music') ? Number(localStorage.getItem('kilela.music')) : 0.45) * 100));
    this.musicSlider.title = 'Громкость музыки';
    this.musicSlider.addEventListener('input', () => {
      this.cb.onMusicVolume(Number(this.musicSlider.value) / 100);
    });
    this.musicSlider.addEventListener('change', () => {
      sfx.play('click');
    });
    const exitButton = el('button', 'btn small', topbar);
    exitButton.textContent = 'Выход';
    exitButton.addEventListener('click', () => this.cb.onLogout());

    this.chatLog = el('div', 'chat-log', this.root);
    this.chatLog.addEventListener('pointerdown', e => e.stopPropagation());

    const chatBar = el('div', 'chat-bar', this.root);
    this.chatInput = el('input', 'chat-input', chatBar) as HTMLInputElement;
    this.chatInput.maxLength = 200;
    this.chatInput.placeholder = 'Сказать что-нибудь…';
    this.chatInput.addEventListener('keydown', e => {
      e.stopPropagation();

      if (e.key === 'Enter') {
        const text = this.chatInput.value.trim();

        if (text) {
          this.cb.onChatSend(text);
        }

        this.chatInput.value = '';
        this.chatInput.blur();
      } else if (e.key === 'Escape') {
        this.chatInput.value = '';
        this.chatInput.blur();
      }
    });

    const sendButton = el('button', 'btn small', chatBar);
    sendButton.textContent = '➤';
    sendButton.addEventListener('click', () => {
      const text = this.chatInput.value.trim();

      if (text) {
        this.cb.onChatSend(text);
      }

      this.chatInput.value = '';
      this.chatInput.blur();
    });

    const emoteBar = el('div', 'emote-bar', this.root);
    this.addEmote(emoteBar, 'turn', '🙃', 'Повернуть голову (H)');
    this.addEmote(emoteBar, 'fly', '🪽', 'Взлететь / приземлиться');
    this.addEmote(emoteBar, 'sit', '🪑', 'Сесть / встать');
    this.addEmote(emoteBar, 'sleep', '💤', 'Лечь / встать');
    this.addEmote(emoteBar, 'dance', '💃', 'Танцевать');
    this.addEmote(emoteBar, 'wave', '👋', 'Помахать копытом');
    this.addEmote(emoteBar, 'hug', '🤗', 'Обняться');
    this.addEmote(emoteBar, 'kiss', '💋', 'Поцеловать');

    const faceBar = el('div', 'face-bar', this.root);
    this.addEmote(faceBar, 'surprise', '😮', 'Удивиться');
    this.addEmote(faceBar, 'excite', '🤩', 'Восторг');
    this.addEmote(faceBar, 'laugh', '😆', 'Смеяться');
    this.addEmote(faceBar, 'nom', '😋', 'Ням-ням');
    this.addEmote(faceBar, 'tongue', '🤪', 'Показать язык');
    this.addEmote(faceBar, 'yawn', '🥱', 'Зевнуть');
    this.addEmote(faceBar, 'happy', '😊', 'Радость');
    this.addEmote(faceBar, 'wink', '😉', 'Подмигнуть');
    this.addEmote(faceBar, 'sad', '😢', 'Грусть');
    this.addEmote(faceBar, 'cry', '😭', 'Поплакать');
    this.addEmote(faceBar, 'sneeze', '🤧', 'Чихнуть');
    this.addEmote(faceBar, 'angry', '😠', 'Обидеться');
    this.addEmote(faceBar, 'hearts', '💗', 'Умиление');

    window.addEventListener('keydown', e => {
      if (document.activeElement === this.chatInput) return;

      if (e.key === 'Enter' || e.key === 'т') {
        e.preventDefault();
        this.chatInput.focus();
      }
    });
  }

  private addEmote(parent: HTMLElement, action: string, icon: string, title: string) {
    const button = el('button', 'emote-btn', parent) as HTMLButtonElement;
    button.textContent = icon;
    button.title = title;
    button.addEventListener('click', () => {
      sfx.play('click');
      this.cb.onEmote(action);
    });
    this.emoteButtons.set(action, button);
  }

  showToyPicker(pick: (toy: number) => void) {
    if (document.querySelector('.toy-overlay')) return;

    const overlay = el('div', 'overlay toy-overlay', document.body);
    const panel = el('div', 'panel toy-panel', overlay);
    const title = el('h2', 'editor-title', panel);
    title.textContent = 'Предметы';
    const hint = el('div', 'toy-hint', panel);
    hint.textContent = 'Предмет пони держит в копыте. То же самое — команда /toys.';
    const grid = el('div', 'toy-grid', panel);

    const addOption = (label: string, toy: number) => {
      const button = el('button', 'btn small toy-btn', grid) as HTMLButtonElement;
      button.textContent = label;

      button.addEventListener('click', () => {
        sfx.play('pop');
        overlay.remove();
        pick(toy);
      });
    };

    addOption('Убрать предмет', 0);

    for (let i = 0; i < TOYS.length; i++) {
      addOption(TOYS[i].label, i + 1);
    }

    const closeButton = el('button', 'btn', panel);
    closeButton.textContent = 'Закрыть';
    closeButton.addEventListener('click', () => {
      sfx.play('click');
      overlay.remove();
    });
    overlay.addEventListener('pointerdown', e => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  setMap(name: string) {
    this.mapLabel.textContent = name;
  }

  setOnline(n: number) {
    this.onlineLabel.textContent = `🧣 ${n} на лугу`;
  }

  setDayTime(k: number) {
    const hour = Math.floor(k * 24);
    const minute = Math.floor((k * 24 - hour) * 60);
    this.clockLabel.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  addChat(name: string, text: string, own: boolean) {
    const line = el('div', 'chat-line' + (own ? ' own' : ''), this.chatLog);
    const nameSpan = el('span', 'chat-name', line);
    nameSpan.textContent = name;
    const textSpan = el('span', 'chat-text', line);
    textSpan.textContent = `: ${text}`;

    while (this.chatLog.children.length > 60) {
      this.chatLog.removeChild(this.chatLog.firstChild!);
    }

    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  addSystem(text: string) {
    const line = el('div', 'chat-line system', this.chatLog);
    line.textContent = text;

    while (this.chatLog.children.length > 60) {
      this.chatLog.removeChild(this.chatLog.firstChild!);
    }

    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  markEmoteActive(action: string) {
    for (const key of ['sit', 'sleep', 'dance', 'fly']) {
      this.emoteButtons.get(key)?.classList.remove('active');
    }

    if (action) {
      this.emoteButtons.get(action)?.classList.add('active');
    }
  }

  setSoundOn(on: boolean) {
    this.soundOn = on;
    this.soundButton.textContent = on ? '🔊' : '🔇';
  }

  destroy() {
    clear(this.root);
    this.root.remove();
  }
}
