import { Application } from 'pixi.js';
import { loadPonySheets } from './pony/atlas';
import { encodeLook, type Look } from './pony/look';
import { Game } from './game/game';
import { showLogin } from './ui/login';
import { Editor } from './ui/editor';
import { Hud } from './ui/hud';

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

  showLogin(({ name, look }) => {
    startGame(app, name, look);
  });
}

function startGame(app: Application, name: string, look: Look) {
  let currentLook = look;

  const music = new Audio();
  music.volume = 0.45;

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
      const mapMusic = `/music/${getMusicFor(id)}`;
      music.src = mapMusic;
      music.loop = true;
      music.play().catch(() => undefined);
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
    onLogout() {
      music.pause();
      location.reload();
    },
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

function getMusicFor(mapId: string): string {
  switch (mapId) {
    case 'forest':
      return 'trees.mp3';
    case 'peaks':
      return 'reindeer-winter.mp3';
    default:
      return 'bossanova.mp3';
  }
}

boot().catch(err => {
  console.error(err);
  document.body.textContent = 'Не удалось запустить игру: ' + (err instanceof Error ? err.message : String(err));
});
