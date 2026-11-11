import { Application } from 'pixi.js';
import { WorldView, directionFromVector } from '../world/view';
import { TILE_W, TILE_H } from '../world/tiles';
import { Net } from '../net';
import { getMap, type ChatKind, type PortalDef } from '../../../shared/protocol';
import type { PathPoint } from '../../../shared/world';
import { PonyActor, type Target } from '../pony/anim';
import { ChatPrefs } from './chatPrefs';
import { buildPaletteLook, decodeLook, encodeLook, type Look, type PaletteLook } from '../pony/look';
import { boop } from '../pony/pt/animations';
import { parseChatExpression } from '../pony/expressions';
import { sfx } from '../audio/sfx';

const SPEED = 4.2;
const PORTAL_RADIUS = 1.8;

export interface GameCallbacks {
  onChat(id: number, name: string, text: string, kind: ChatKind, to?: string): void;
  onSys(text: string): void;
  onErr(text: string): void;
  onOnline(n: number): void;
  onMap(id: string, name: string): void;
}

export class Game {
  net = new Net();
  view = new WorldView();
  myId = -1;
  myName = '';
  myActor = new PonyActor();
  myLook: PaletteLook;
  myLookCode: string;
  playerX = 80;
  playerY = 84;
  playerDir = 0;
  moving = false;
  switching = false;
  private switchTimer = 0;
  private walkTarget: PathPoint[] | undefined;
  private keys = new Set<string>();
  private posTimer = 0;
  private lastSent = { x: 0, y: 0, dir: 0 };
  private zzzTimer = 0;
  private wasInWater = false;
  private cb: GameCallbacks;
  chatPrefs: ChatPrefs;
  private started = false;
  private pendingPortal: { to: string; x: number; y: number } | undefined;

  constructor(look: Look, cb: GameCallbacks, chatPrefs: ChatPrefs) {
    this.myLook = buildPaletteLook(look);
    this.myLookCode = encodeLook(look);
    this.cb = cb;
    this.chatPrefs = chatPrefs;
  }

  async start(app: Application, name: string, savedLook: Look) {
    if (this.started) return;

    this.started = true;
    this.myName = name;
    this.view.init(app);
    this.view.onFadePeak = () => {
      if (this.pendingPortal) {
        const portal = this.pendingPortal;
        this.pendingPortal = undefined;
        this.rebuildAt(portal.to, portal.x, portal.y);
      }
    };
    this.net.on(msg => this.handleMsg(msg));
    await this.net.connect();
    this.net.send({ t: 'hello', name, look: this.myLookCode });
    this.bindInput(app);
    this.myActor.onTransitSound = name => sfx.play(name);
  }

  setLook(look: Look) {
    this.myLook = buildPaletteLook(look);
    this.myLookCode = encodeLook(look);
    this.net.send({ t: 'look', look: this.myLookCode });

    if (this.myId >= 0) {
      this.view.setEntityLook(this.myId, this.myLook, this.myLookCode);
    }
  }

  setToy(toy: number) {
    this.net.send({ t: 'toys', toy });
    this.view.setEntityToy(this.myId, toy);
  }

  private handleMsg(msg: Parameters<Parameters<Net['on']>[0]>[0]) {
    switch (msg.t) {
      case 'welcome': {
        this.myId = msg.id;
        this.playerX = msg.x;
        this.playerY = msg.y;
        this.cb.onOnline(msg.online);
        this.enterMap(msg.map);
        this.view.myEntityId = this.myId;
        this.view.addEntity(this.myId, this.myName, this.myLook, this.myLookCode, this.myActor, this.playerX, this.playerY, msg.toy || 0);
        this.cb.onSys('Добро пожаловать в Килелу!');
        sfx.play('welcome');
        break;
      }
      case 'join': {
        this.cb.onOnline(msg.online);

        if (msg.id === this.myId) return;

        this.view.removeEntity(msg.id);

        const look = buildPaletteLook(decodeLook(msg.look));
        const actor = new PonyActor();
        actor.setTarget('stand');
        this.view.addEntity(msg.id, msg.name, look, msg.look, actor, msg.x, msg.y, msg.toy || 0);
        break;
      }
      case 'leave': {
        this.cb.onOnline(msg.online);
        this.view.removeEntity(msg.id);
        break;
      }
      case 'pos': {
        for (const [id, x, y, dir] of msg.list) {
          if (id === this.myId) continue;
          this.view.setEntityPos(id, x, y, dir);
        }

        break;
      }
      case 'fix': {
        this.playerX = msg.x;
        this.playerY = msg.y;
        this.walkTarget = undefined;
        this.view.setEntityPos(this.myId, this.playerX, this.playerY, this.playerDir);
        break;
      }
      case 'chat': {
        const kind: ChatKind = msg.kind ?? 'say';
        const name = msg.id === this.myId ? this.myName : msg.name || this.view.entities.get(msg.id)?.name || '?';
        const own = msg.id === this.myId;

        if (!own && (this.chatPrefs.isIgnored(name) || this.chatPrefs.matchesWordFilter(msg.text))) {
          break;
        }

        if (kind === 'whisper') {
          if (this.chatPrefs.kinds.whisper) {
            this.cb.onChat(msg.id, name, msg.text, kind, msg.to);
          }

          break;
        }

        this.view.showBubble(msg.id, msg.text, kind);

        if (this.chatPrefs.kinds[kind]) {
          this.cb.onChat(msg.id, name, msg.text, kind);
        }

        const view = this.view.entities.get(msg.id);

        if (view && kind === 'say' && view.actor.target !== 'fly') {
          view.actor.applyExpression(parseChatExpression(msg.text));
        }

        break;
      }
      case 'emote': {
        if (msg.id !== this.myId) {
          this.applyEmote(msg.id, this.view.entities.get(msg.id)?.actor, msg.action);
        }

        break;
      }
      case 'switch': {
        this.playerX = msg.x;
        this.playerY = msg.y;
        this.pendingPortal = { to: msg.to, x: msg.x, y: msg.y };
        break;
      }
      case 'look': {
        if (msg.id !== this.myId) {
          const look = buildPaletteLook(decodeLook(msg.look));
          this.view.setEntityLook(msg.id, look, msg.look);
        }

        break;
      }
      case 'toys': {
        this.view.setEntityToy(msg.id, msg.toy || 0);
        break;
      }
      case 'sys':
        this.cb.onSys(msg.text);
        break;
      case 'err':
        this.cb.onErr(msg.text);
        break;
    }
  }

  private enterMap(mapId: string) {
    for (const id of [...this.view.entities.keys()]) {
      if (id !== this.myId) {
        this.view.removeEntity(id);
      }
    }

    this.wasInWater = false;
    this.view.buildMap(mapId);
    const map = getMap(mapId);
    this.cb.onMap(map.id, map.name);
  }

  private rebuildAt(mapId: string, x: number, y: number) {
    this.enterMap(mapId);
    this.playerX = x;
    this.playerY = y;
    this.view.setEntityPos(this.myId, x, y, this.playerDir);
  }

  sendEmote(action: string) {
    if (action === 'sit' || action === 'sleep' || action === 'dance') {
      this.walkTarget = undefined;
    }

    if (this.myActor.target === 'swim' && (action === 'sit' || action === 'sleep' || action === 'dance' || action === 'wave' || action === 'boop')) {
      return;
    }

    if (action === 'sit' && this.myActor.target === 'sit') {
      action = 'stand';
    } else if (action === 'sleep' && this.myActor.target === 'lie') {
      action = 'stand';
    } else if (action === 'dance' && this.myActor.target === 'dance') {
      action = 'stand';
    }

    if (action === 'fly' && this.myActor.target === 'fly') {
      action = 'land';
    }

    if (this.myActor.target === 'fly' && (action === 'sit' || action === 'sleep' || action === 'dance' || action === 'stand' || action === 'wake')) {
      this.net.send({ t: 'emote', action: 'land' });
    }

    this.net.send({ t: 'emote', action });
    this.applyEmote(this.myId, this.myActor, action);
  }

  applyEmote(id: number, actor: PonyActor | undefined, action: string) {
    if (!actor) return;

    switch (action) {
      case 'sit':
        actor.setTarget('sit');
        break;
      case 'stand':
      case 'wake':
      case 'land':
        actor.setTarget('stand');
        break;
      case 'sleep':
        actor.setTarget('lie');
        this.view.showEmote(id, 'emote_sleep', 10);
        break;
      case 'fly':
        actor.setTarget('fly');
        break;
      case 'dance':
        actor.setTarget('dance');
        break;
      case 'wave':
      case 'boop':
        actor.playOnce(boop);
        break;
      case 'hug':
        actor.playExpression('hearts');
        this.view.showEmote(id, 'emote_hearts', 4);
        break;
      case 'laugh':
      case 'surprise':
      case 'excite':
      case 'nom':
      case 'yawn':
      case 'tongue':
        actor.playHead(action);
        break;
      case 'sad':
        actor.playExpression('sad');
        this.view.showEmote(id, 'emote_tears', 4);
        break;
      case 'cry':
        actor.playExpression('sad');
        this.view.showEmote(id, 'emote_cry', 5);
        break;
      case 'sneeze':
        this.view.showEmote(id, 'emote_sneeze', 2.2);
        break;
      case 'angry':
      case 'happy':
      case 'wink':
        actor.playExpression(action);
        break;
      case 'hearts':
        actor.playExpression('hearts');
        this.view.showEmote(id, 'emote_hearts', 4);
        break;
      case 'kiss':
        actor.playHead('kiss');
        actor.playExpression('kiss');
        this.view.showEmote(id, 'emote_hearts', 3);
        break;
      case 'turn':
        actor.state.headTurned = !actor.state.headTurned;
        break;
    }
  }

  private bindInput(app: Application) {
    window.addEventListener('keydown', e => {
      if (document.activeElement && (document.activeElement as HTMLElement).tagName === 'INPUT') {
        return;
      }

      this.keys.add(e.key.toLowerCase());
      this.walkTarget = undefined;
    });
    window.addEventListener('keyup', e => {
      this.keys.delete(e.key.toLowerCase());
    });

    app.canvas.addEventListener('pointerdown', e => {
      if (this.switching) return;

      const rect = app.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = (screenX - this.view.tileLayer.position.x) / TILE_W;
      const worldY = (screenY - this.view.tileLayer.position.y) / TILE_H;
      const path = this.myActor.target === 'fly'
        ? this.view.computeFlyPath(this.playerX, this.playerY, worldX, worldY)
        : this.view.computePath(this.playerX, this.playerY, worldX, worldY);
      this.walkTarget = path.length > 0 ? path : undefined;
    });
  }

  update(dt: number) {
    if (this.myId < 0) return;

    if (this.pendingPortal && this.view.fadeDir === 0 && this.view.fade === 0) {
      const portal = this.pendingPortal;
      this.pendingPortal = undefined;
      this.rebuildAt(portal.to, portal.x, portal.y);
    }

    if (this.switching) {
      this.switchTimer += dt;

      if (this.view.fadeDir === 0 && this.view.fade === 0) {
        this.switching = false;
      }

      if (this.switchTimer > 3) {
        this.switching = false;
        this.view.fade = 0;
        this.view.fadeDir = 0;
      }
    }

    let dx = 0;
    let dy = 0;

    if (!this.switching) {
      if (this.keys.has('w') || this.keys.has('arrowup') || this.keys.has('ц')) dy -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown') || this.keys.has('ы')) dy += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft') || this.keys.has('ф')) dx -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright') || this.keys.has('в')) dx += 1;
    }

    if (dx === 0 && dy === 0 && this.walkTarget && this.walkTarget.length > 0) {
      const wp = this.walkTarget[0];
      const tx = wp.x - this.playerX;
      const ty = wp.y - this.playerY;

      if (Math.hypot(tx, ty) < 0.2) {
        this.walkTarget.shift();
      } else {
        dx = tx;
        dy = ty;
      }
    }

    const len = Math.hypot(dx, dy);
    this.moving = len > 0.01;
    const flying = this.myActor.target === 'fly';

    if (this.moving) {
      dx /= len;
      dy /= len;
      const speed = flying ? SPEED * 1.35 : this.myActor.target === 'swim' ? SPEED * 0.8 : SPEED;
      const nx = this.playerX + dx * speed * dt;
      const ny = this.playerY + dy * speed * dt;
      const blockX = flying
        ? this.view.isFlyBlockedAt(Math.round(nx), Math.round(this.playerY))
        : this.view.isBlockedAt(Math.round(nx), Math.round(this.playerY));
      const blockY = flying
        ? this.view.isFlyBlockedAt(Math.round(this.playerX), Math.round(ny))
        : this.view.isBlockedAt(Math.round(this.playerX), Math.round(ny));

      if (!blockX) {
        this.playerX = nx;
      }

      if (!blockY) {
        this.playerY = ny;
      }

      if (blockX && blockY) {
        this.moving = false;
        this.walkTarget = undefined;
      }
    }

    if (this.moving) {
      this.playerDir = directionFromVector(dx, dy);
      this.walkTarget = this.keys.size > 0 ? undefined : this.walkTarget;
      sfx.step();
    }

    const waterHere = !flying && this.view.isWaterAt(Math.round(this.playerX), Math.round(this.playerY));

    if (waterHere !== this.wasInWater) {
      this.wasInWater = waterHere;
      sfx.play('splash');
      this.view.showSplash(this.myId);
    }

    const map = getMap(this.view.mapId);
    this.playerX = Math.max(1, Math.min(map.w - 2, this.playerX));
    this.playerY = Math.max(1, Math.min(map.h - 2, this.playerY));

    if (this.myActor.target === 'lie') {
      this.zzzTimer -= dt;

      if (this.zzzTimer <= 0) {
        this.zzzTimer = 6;
        this.view.showEmote(this.myId, 'emote_sleep', 6);
      }
    } else if (this.zzzTimer > 0) {
      this.zzzTimer = 0;
    }

    if (waterHere && this.myActor.target !== 'swim' && this.myActor.target !== 'fly') {
      this.myActor.setTarget('swim');
    } else if (this.moving && !waterHere) {
      this.myActor.setTarget(flying ? 'fly' : 'walk');
    } else if (this.myActor.target === 'walk') {
      this.myActor.setTarget('stand');
    } else if (!waterHere && this.myActor.target === 'swim') {
      this.myActor.setTarget('stand');
    }

    if (!this.switching) {
      for (const portal of map.portals) {
        const pdx = this.playerX - portal.x;
        const pdy = this.playerY - portal.y;

        if (pdx * pdx + pdy * pdy <= PORTAL_RADIUS * PORTAL_RADIUS) {
          this.travel(portal);
          break;
        }
      }
    }

    this.posTimer -= dt;

    if (this.posTimer <= 0) {
      this.posTimer = 0.1;
      const rx = Math.round(this.playerX * 10) / 10;
      const ry = Math.round(this.playerY * 10) / 10;

      if (rx !== this.lastSent.x || ry !== this.lastSent.y || this.playerDir !== this.lastSent.dir) {
        this.lastSent = { x: rx, y: ry, dir: this.playerDir };
        this.net.send({ t: 'pos', x: rx, y: ry, dir: this.playerDir });
      }
    }

    this.view.setEntityPos(this.myId, this.playerX, this.playerY, this.playerDir);
    this.view.update(dt, this.playerX, this.playerY, this.playerDir);
  }

  private travel(portal: PortalDef) {
    if (this.switching) return;

    this.switching = true;
    this.switchTimer = 0;
    this.walkTarget = undefined;
    this.net.send({ t: 'pos', x: Math.round(this.playerX * 10) / 10, y: Math.round(this.playerY * 10) / 10, dir: this.playerDir });
    this.net.send({ t: 'loc', to: portal.to });
    this.view.fadeDir = 1;
    sfx.play('portal');
  }

}
