import { WebSocketServer, WebSocket } from 'ws';
import {
  TICK_HZ, LOOK_PREFIX, MAX_NAME, MAX_CHAT, MAPS, getMap, validEmote, TOYS, toyIndexByName,
  type ClientMsg,
} from '../../shared/protocol';
import { buildWorld, isBlockedTile } from '../../shared/world';
import { randomName } from './names';
import { getRoom, type Player } from './rooms';

const PORT = Number(process.env.PORT || 8080);
const LOOK_MAX = 220;
const PORTAL_RADIUS = 2.5;
const MAX_POS_STEP = 3;
const POS_SAMPLE = 0.25;

const worlds = new Map<string, Uint8Array>();
const worldWalls = new Map<string, Uint8Array>();

for (const map of MAPS) {
  const world = buildWorld(map);
  worlds.set(map.id, world.blocked);
  worldWalls.set(map.id, world.walls);
}

let nextId = 1;
const players = new Map<number, Player>();

const BOT_PHRASES = [
  'Какой тёплый денёк!',
  'Кто-нибудь видел мою кьютимарку? Кажется, она где-то здесь…',
  'Пойду полежу на солнышке.',
  'А вы пробовали танцевать под боссанову?',
  'Снежные пики сегодня особенно пушистые.',
  'Приветик! Присоединяйтесь!',
];

const BOT_REPLIES = [
  'Привет-привет!',
  'Да-да?',
  'Поняла тебя!',
  'Согласна!',
  'Ой, а расскажи подробнее!',
  '*радостно машет копытом*',
];

const BOT_WANDER = { x0: 60, y0: 64, x1: 104, y1: 104 };

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function humanCount(roomId: string): number {
  const room = getRoom(roomId);
  let count = 0;

  for (const p of room.players.values()) {
    if (!p.bot) count++;
  }

  return count;
}

function broadcast(roomId: string, data: unknown, exceptId?: number) {
  const room = getRoom(roomId);

  for (const p of room.players.values()) {
    if (p.bot || p.id === exceptId) continue;

    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(JSON.stringify(data));
    }
  }
}

function clampToMap(p: Player) {
  const map = getMap(p.map);
  p.x = Math.max(1, Math.min(map.w - 2, p.x));
  p.y = Math.max(1, Math.min(map.h - 2, p.y));
}

function round10(v: number): number {
  return Math.round(v * 10) / 10;
}

function sendFix(p: Player, x = p.x, y = p.y) {
  if (p.ws) {
    send(p.ws, { t: 'fix', x: round10(x), y: round10(y) });
  }
}

function walkable(mapId: string, x: number, y: number, flying = false): boolean {
  const blocked = flying ? worldWalls.get(mapId) : worlds.get(mapId);

  if (!blocked) return true;

  return !isBlockedTile(blocked, getMap(mapId), Math.round(x), Math.round(y));
}

function acceptPosition(p: Player, nx: number, ny: number): void {
  const map = getMap(p.map);
  const x = Math.max(1, Math.min(map.w - 2, nx));
  const y = Math.max(1, Math.min(map.h - 2, ny));
  const blocked = p.flying ? worldWalls.get(p.map) : worlds.get(p.map);

  if (!blocked) {
    p.x = x;
    p.y = y;
    return;
  }

  const fromOk = !isBlockedTile(blocked, map, Math.round(p.x), Math.round(p.y));

  if (!fromOk) {
    p.x = x;
    p.y = y;
    return;
  }

  const dist = Math.hypot(x - p.x, y - p.y);

  if (dist > MAX_POS_STEP) {
    sendFix(p);
    return;
  }

  const steps = Math.max(1, Math.ceil(dist / POS_SAMPLE));
  let ax = p.x;
  let ay = p.y;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = p.x + (x - p.x) * t;
    const py = p.y + (y - p.y) * t;

    if (!walkable(p.map, px, py, p.flying)) break;

    ax = px;
    ay = py;
  }

  p.x = ax;
  p.y = ay;

  if (Math.hypot(x - ax, y - ay) > 0.25) {
    sendFix(p, ax, ay);
  }
}

function findPortal(p: Player) {
  const map = getMap(p.map);

  for (const portal of map.portals) {
    const dx = p.x - portal.x;
    const dy = p.y - portal.y;

    if (dx * dx + dy * dy <= PORTAL_RADIUS * PORTAL_RADIUS) {
      return portal;
    }
  }

  return undefined;
}

function movePlayer(p: Player, to: string, tx: number, ty: number) {
  const oldRoom = getRoom(p.map);
  oldRoom.remove(p);
  broadcast(p.map, { t: 'leave', id: p.id, online: humanCount(p.map) });

  p.map = to;
  p.x = tx;
  p.y = ty;

  const room = getRoom(to);
  room.add(p);

  const map = getMap(to);
  send(p.ws!, { t: 'switch', to, x: tx, y: ty });
  send(p.ws!, { t: 'sys', text: `Ты попал${p.name.endsWith('а') || p.name.endsWith('я') ? 'а' : ''} на локацию «${map.name}».` });

  for (const other of room.players.values()) {
    if (other.id !== p.id) {
      send(p.ws!, { t: 'join', id: other.id, name: other.name, look: other.look, x: other.x, y: other.y, online: humanCount(to) });
    }
  }

  broadcast(to, { t: 'join', id: p.id, name: p.name, look: p.look, x: p.x, y: p.y, online: humanCount(to) }, p.id);
}

function stepBot(bot: Player, dt: number) {
  if (Math.random() < 0.02) {
    bot.dir = Math.floor(Math.random() * 4);
  }

  const speed = 2.2 * dt;

  if (Math.random() < 0.6) {
    let vx = 0;
    let vy = 0;

    if (bot.dir === 0) vy = speed;
    else if (bot.dir === 1) vy = -speed;
    else if (bot.dir === 2) vx = -speed;
    else vx = speed;

    if (vx !== 0 && walkable(bot.map, bot.x + vx, bot.y)) bot.x += vx;

    if (vy !== 0 && walkable(bot.map, bot.x, bot.y + vy)) bot.y += vy;
  }

  bot.x = Math.max(BOT_WANDER.x0, Math.min(BOT_WANDER.x1, bot.x));
  bot.y = Math.max(BOT_WANDER.y0, Math.min(BOT_WANDER.y1, bot.y));
}

function sanitizeName(raw: string): string {
  const name = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, MAX_NAME);
  return name.length >= 2 ? name : randomName();
}

function sanitizeLook(raw: string): string {
  const look = String(raw || '');
  return look.startsWith(LOOK_PREFIX) && look.length <= LOOK_MAX ? look : LOOK_PREFIX;
}

function handleChat(p: Player, text: string) {
  const clean = String(text || '').trim().slice(0, MAX_CHAT);

  if (!clean) return;

  if (clean === '/roll' || clean.startsWith('/roll ')) {
    const arg = clean.slice(5).trim();
    const sides = Math.min(100, Math.max(2, Number(arg) || 6));
    const value = 1 + Math.floor(Math.random() * sides);
    broadcast(p.map, { t: 'chat', id: p.id, text: `🎲 ${value}` });
    return;
  }

  if (clean === '/toys' || clean.startsWith('/toys ')) {
    const arg = clean.slice(5).trim();

    if (!arg || arg === 'none' || arg === 'нет') {
      applyToy(p, 0);
      return;
    }

    const index = toyIndexByName(arg);

    if (index > 0) {
      applyToy(p, index);
    } else {
      send(p.ws!, { t: 'sys', text: `Не знаю такой предмет. Попробуй: ${TOYS.map(t => t.name).join(', ')}.` });
    }

    return;
  }

  broadcast(p.map, { t: 'chat', id: p.id, text: clean });

  const room = getRoom(p.map);
  const bot = [...room.players.values()].find(o => o.bot);

  if (bot && (clean.toLowerCase().includes('искорка') || Math.random() < 0.25)) {
    const reply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];

    setTimeout(() => {
      broadcast(bot.map, { t: 'chat', id: bot.id, text: reply });
    }, 900 + Math.random() * 1200);
  }
}

function applyToy(p: Player, toy: number) {
  p.toy = toy;
  broadcast(p.map, { t: 'toys', id: p.id, toy });

  if (p.ws) {
    const label = toy > 0 && toy <= TOYS.length ? TOYS[toy - 1].label : '';
    send(p.ws, { t: 'sys', text: toy > 0 ? `Теперь ты держишь: ${label}.` : 'Ты убрал предмет.' });
  }
}

function handleHello(ws: WebSocket, msg: Extract<ClientMsg, { t: 'hello' }>): Player {
  const id = nextId++;
  const name = sanitizeName(msg.name);
  const look = sanitizeLook(msg.look);
  const map = getMap('meadow');

  const p: Player = {
    id,
    ws,
    name,
    look,
    map: map.id,
    x: map.spawnX,
    y: map.spawnY,
    dir: 0,
    emote: '',
    flying: false,
    toy: 0,
    bot: false,
  };

  clampToMap(p);
  players.set(id, p);
  getRoom(map.id).add(p);

  send(ws, { t: 'welcome', id, name, look, x: p.x, y: p.y, map: p.map, online: players.size - 1, toy: p.toy });

  const room = getRoom(map.id);

  for (const other of room.players.values()) {
    if (other.id !== id) {
      send(ws, { t: 'join', id: other.id, name: other.name, look: other.look, x: other.x, y: other.y, online: humanCount(map.id), toy: other.toy });
    }
  }

  broadcast(map.id, { t: 'join', id, name, look, x: p.x, y: p.y, online: humanCount(map.id), toy: p.toy }, id);
  return p;
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', ws => {
  let player: Player | undefined;
  let alive = true;

  ws.on('pong', () => {
    alive = true;
  });

  ws.on('message', raw => {
    let msg: ClientMsg;

    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (!player) {
      if (msg.t === 'hello') {
        player = handleHello(ws, msg);
      }

      return;
    }

    switch (msg.t) {
      case 'pos': {
        const x = Number(msg.x);
        const y = Number(msg.y);

        if (Number.isFinite(x) && Number.isFinite(y)) {
          player.dir = [0, 1, 2, 3].includes(msg.dir) ? msg.dir : player.dir;
          acceptPosition(player, x, y);
          clampToMap(player);
        }

        break;
      }
      case 'chat':
        handleChat(player, msg.text);
        break;
      case 'toys': {
        const toy = Number(msg.toy);

        if (Number.isInteger(toy) && toy >= 0 && toy <= TOYS.length) {
          applyToy(player, toy);
        }

        break;
      }
      case 'emote': {
        const action = String(msg.action || '').slice(0, 24);

        if (validEmote(action)) {
          player.emote = action;

          if (action === 'fly') {
            player.flying = true;
          } else if (action === 'land' || action === 'sit' || action === 'sleep' || action === 'dance' || action === 'wake' || action === 'stand') {
            player.flying = false;
          }

          broadcast(player.map, { t: 'emote', id: player.id, action });
        }

        break;
      }
      case 'look': {
        const look = String(msg.look || '');

        if (look.startsWith(LOOK_PREFIX) && look.length <= LOOK_MAX) {
          player.look = look;
          broadcast(player.map, { t: 'look', id: player.id, look });
        }

        break;
      }
      case 'loc': {
        if (player.map !== msg.to) {
          const portal = findPortal(player);

          if (portal && portal.to === msg.to) {
            movePlayer(player, portal.to, portal.tx, portal.ty);
          }
        }

        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    if (player) {
      getRoom(player.map).remove(player);
      players.delete(player.id);
      broadcast(player.map, { t: 'leave', id: player.id, online: humanCount(player.map) });
    }
  });

  const interval = setInterval(() => {
    if (!alive) {
      clearInterval(interval);
      ws.terminate();
      return;
    }

    alive = false;
    ws.ping();
  }, 30000);
});

const bot: Player = {
  id: nextId++,
  ws: null,
  name: 'Искорка',
  look: LOOK_PREFIX,
  map: 'meadow',
  x: 82,
  y: 86,
  dir: 0,
  emote: '',
  flying: false,
  toy: 0,
  bot: true,
};

getRoom('meadow').add(bot);
players.set(bot.id, bot);

setInterval(() => {
  const dt = 1 / TICK_HZ;
  stepBot(bot, dt);

  if (Math.random() < 0.0015) {
    const phrase = BOT_PHRASES[Math.floor(Math.random() * BOT_PHRASES.length)];
    broadcast(bot.map, { t: 'chat', id: bot.id, text: phrase });
  }

  if (Math.random() < 0.004) {
    broadcast(bot.map, { t: 'emote', id: bot.id, action: 'wave' });
  }

  for (const mapId of new Set([...players.values()].map(p => p.map))) {
    const room = getRoom(mapId);
    const list: [number, number, number, number][] = [];

    for (const p of room.players.values()) {
      if (p.bot) continue;
      list.push([p.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, p.dir]);
    }

    for (const p of room.players.values()) {
      if (p.bot || !p.ws || p.ws.readyState !== WebSocket.OPEN) continue;
      const others = list.filter(entry => entry[0] !== p.id);
      p.ws.send(JSON.stringify({ t: 'pos', list: others }));
    }
  }
}, 1000 / TICK_HZ);

console.log(`Kilela server listening on port ${PORT}`);
