import { Application } from 'pixi.js';
import { loadPonySheets } from './pony/atlas';
import { encodeLook, type Look } from './pony/look';
import { Game } from './game/game';
import { showLogin } from './ui/login';
import { Editor } from './ui/editor';
import { Hud } from './ui/hud';
import { sfx } from './audio/sfx';
import { MusicPlayer } from './audio/music';
import { drawPonyToCanvas } from './pony/draw';
import { preloadEmotes } from './pony/emotes';
import { stand, trot } from './pony/pt/animations';

const MAP_SKY: Record<string, number> = {
  meadow: 0xa5dcf2,
  forest: 0x77919d,
  peaks: 0xd4e4f4,
};

async function boot() {
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    background: MAP_SKY.meadow,
    antialias: false,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
  });

  document.getElementById('app')!.appendChild(app.canvas);
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
  });

  await loadPonySheets();
  await preloadEmotes();

  showLogin(({ name, look }) => {
    startGame(app, name, look);
  });
}

function startGame(app: Application, name: string, look: Look) {
  let currentLook = look;
  let photoMode = false;

  const music = new MusicPlayer();
  music.setVolume(Number(localStorage.getItem('kilela.music') ?? 0.45));

  const game = new Game(currentLook, {
    onChat(id, who, text) {
      hud.addChat(who, text, id === game.myId);
    },
    onSys(text) {
      hud.addSystem(text);
    },
    onErr(text) {
      hud.addSystem(text);
    },
    onOnline(n) {
      hud.setOnline(n);
    },
    onMap(id, mapName) {
      hud.setMap(mapName);
      app.renderer.background.color = MAP_SKY[id] ?? MAP_SKY.meadow;
      music.setPlaylist(id);
    },
  });

  const hud = new Hud({
    onEmote(action) {
      game.sendEmote(action);
      hud.markEmoteActive(action === 'stand' || action === 'wake' ? '' : action);
    },
    onChatSend(text) {
      game.net.send({ t: 'chat', text });
    },
    onOpenEditor() {
      new Editor(currentLook, {
        onSave(next) {
          currentLook = next;
          localStorage.setItem('kilela.look', encodeLook(next));
          game.setLook(next);
        },
        onClose() {
          undefined;
        },
      });
    },
    onPhotoToggle() {
      togglePhoto();
    },
    onSoundToggle() {
      const on = !sfx.enabled;
      sfx.resume();
      sfx.setEnabled(on);
      hud.setSoundOn(on);
      sfx.play('click');
    },
    onMusicVolume(volume) {
      music.setVolume(volume);
      localStorage.setItem('kilela.music', String(volume));
    },
    onLogout() {
      music.stop();
      location.reload();
    },
  });

  (window as unknown as { game: Game }).game = game;

  function togglePhoto() {
    photoMode = !photoMode;
    document.body.classList.toggle('photo-mode', photoMode);
    hud.root.style.display = photoMode ? 'none' : '';
    game.view.setPhotoMode(photoMode);
    sfx.play('pop');

    if (photoMode) {
      showPhotoHint();
    }
  }

  function shootPhoto() {
    const canvas = app.renderer.extract.canvas(app.stage) as HTMLCanvasElement;
    const link = document.createElement('a');
    link.download = `kilela-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    sfx.play('pop');
  }

  function showPhotoHint() {
    const hint = document.createElement('div');
    hint.className = 'photo-hint';
    hint.textContent = 'Фоторежим: P — выйти, C — сохранить снимок';
    document.body.appendChild(hint);
    window.setTimeout(() => hint.remove(), 3500);
  }

  window.addEventListener('keydown', e => {
    if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') {
      return;
    }

    const key = e.key.toLowerCase();

    if (key === 'p' || key === 'з') {
      togglePhoto();
    } else if (photoMode && (key === 'c' || key === 'с')) {
      shootPhoto();
    } else if (key === 'm' || key === 'ь') {
      const on = !sfx.enabled;
      sfx.resume();
      sfx.setEnabled(on);
      hud.setSoundOn(on);
    }
  });

  app.ticker.add(() => {
    game.update(app.ticker.deltaMS / 1000);
    hud.setDayTime(game.view.dayTime);
  });

  game.start(app, name, currentLook).catch(err => {
    hud.addSystem('Не удалось подключиться к серверу. Обнови страницу.');
    console.error(err);
  });
}

boot().catch(err => {
  console.error(err);
  document.body.textContent = 'Не удалось запустить игру: ' + (err instanceof Error ? err.message : String(err));
});
