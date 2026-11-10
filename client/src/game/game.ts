import { Application } from 'pixi.js';
import { WorldView, directionFromVector } from '../world/view';
import { Net } from '../net';
import { getMap, type PortalDef } from '../../../shared/protocol';
import { PonyActor, type Target } from '../pony/anim';
import { buildPaletteLook, decodeLook, encodeLook, type Look, type PaletteLook } from '../pony/look';
import { boop } from '../pony/pt/animations';
import { sfx } from '../audio/sfx';

const SPEED = 4.2;
const PORTAL_RADIUS = 1.8;

export interface GameCallbacks {
  onChat(id: number, name: string, text: string): void;
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
  private walkTarget: { x: number; y: number } | undefined;
  private keys = new Set<string>();
  private posTimer = 0;
  private lastSent = { x: 0, y: 0, dir: 0 };
  private cb: GameCallbacks;
  private started = false;
  private pendingPortal: { to: string; x: number; y: number } | undefined;

  constructor(look: Look, cb: GameCallbacks) {
    this.myLook = buildPaletteLook(look);
    this.myLookCode = encodeLook(look);
    this.cb = cb;
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

  private handleMsg(msg: Parameters<Parameters<Net['on']>[0]>[0]) {
    switch (msg.t) {
      case 'welcome': {
        this.myId = msg.id;
        this.playerX = msg.x;
        this.playerY = msg.y;
        this.cb.onOnline(msg.online);
        this.enterMap(msg.map);
        this.view.addEntity(this.myId, this.myName, this.myLook, this.myLookCode, this.myActor, this.playerX, this.playerY);
        this.cb.onSys('Добро пожаловать в Килелу!');
        sfx.play('welcome');
        break;
      }
      case 'join': {
        this.cb.onOnline(msg.online);

        if (msg.id === this.myId) return;

        const look = buildPaletteLook(decodeLook(msg.look));
        const actor = new PonyActor();
        actor.setTarget('stand');
        this.view.addEntity(msg.id, msg.name, look, msg.look, actor, msg.x, msg.y);
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
      case 'chat': {
        const name = msg.id === this.myId ? this.myName : this.view.entities.get(msg.id)?.name || '?';
        this.view.showBubble(msg.id, msg.text);
        this.cb.onChat(msg.id, name, msg.text);
        break;
      }
      case 'emote': {
        if (msg.id !== this.myId) {
          this.applyEmote(this.view.entities.get(msg.id)?.actor, msg.action);
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
      case 'sys':
        this.cb.onSys(msg.text);
        break;
      case 'err':
        this.cb.onErr(msg.text);
        break;
    }
  }

  private enterMap(mapId: string) {
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

    if (action === 'sit' && this.myActor.target === 'sit') {
      action = 'stand';
    } else if (action === 'sleep' && this.myActor.target === 'lie') {
      action = 'stand';
    } else if (action === 'dance' && this.myActor.target === 'dance') {
      action = 'stand';
    }

    this.net.send({ t: 'emote', action });
    this.applyEmote(this.myActor, action);
  }

  applyEmote(actor: PonyActor | undefined, action: string) {
    if (!actor) return;

    switch (action) {
      case 'sit':
        actor.setTarget('sit');
        break;
      case 'stand':
      case 'wake':
        actor.setTarget('stand');
        break;
      case 'sleep':
        actor.setTarget('lie');
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
      case 'angry':
      case 'happy':
      case 'wink':
      case 'hearts':
        actor.playExpression(action);
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
      const worldX = (screenX - this.view.tileLayer.position.x) / 32;
      const worldY = (screenY - this.view.tileLayer.position.y) / 32;
      this.walkTarget = { x: worldX, y: worldY };
    });
  }

  update(dt: number) {
    if (this.myId < 0) return;

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

    if (dx === 0 && dy === 0 && this.walkTarget) {
      const tx = this.walkTarget.x - this.playerX;
      const ty = this.walkTarget.y - this.playerY;

      if (Math.hypot(tx, ty) < 0.15) {
        this.walkTarget = undefined;
      } else {
        dx = tx;
        dy = ty;
      }
    }

    const len = Math.hypot(dx, dy);
    this.moving = len > 0.01;

    if (this.moving) {
      dx /= len;
      dy /= len;
      this.playerX += dx * SPEED * dt;
      this.playerY += dy * SPEED * dt;
      this.playerDir = directionFromVector(dx, dy);
      this.walkTarget = this.keys.size > 0 ? undefined : this.walkTarget;
      sfx.step();
    }

    const map = getMap(this.view.mapId);
    this.playerX = Math.max(1, Math.min(map.w - 2, this.playerX));
    this.playerY = Math.max(1, Math.min(map.h - 2, this.playerY));

    if (this.moving) {
      this.myActor.setTarget('walk');
    } else if (this.myActor.target === 'walk') {
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
    this.net.send({ t: 'loc', to: portal.to });
    this.view.fadeDir = 1;
    sfx.play('portal');
  }

}
