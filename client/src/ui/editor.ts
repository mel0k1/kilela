import { el, clear, colorSwatches, cssToColor, colorToCss, WARM_SWATCHES, MANE_SWATCHES } from './dom';
import { PonyActor } from '../pony/anim';
import { drawPonyToCanvas } from '../pony/draw';
import {
  buildPaletteLook, encodeLook, decodeLook, EXPRESSION_PRESETS, CUTIE_MARKS, randomLook,
  maneCount, backManeCount, tailCount, wingsCount, hornCount, earsCount, facialHairCount,
  headAccessoryCount, chestAccessoryCount, backAccessoryCount, legAccessoryCount,
  sleevesCount, waistCount, neckCount, muzzleCount,
  faceMarkCount, bodyMarkCount, legMarkCount,
  DEFAULT_LOOK,
  type Look,
} from '../pony/look';
import { sfx } from '../audio/sfx';
import { Eye } from '../pony/pt/interfaces';

const EYE_SHAPES: number[] = [
  Eye.Neutral, Eye.Neutral2, Eye.Neutral3, Eye.Neutral4, Eye.Neutral5, Eye.Closed,
  Eye.ClosedHappy, Eye.ClosedHappy2, Eye.ClosedHappy3,
  Eye.Sad, Eye.Sad2, Eye.Angry, Eye.Angry2, Eye.Frown, Eye.Frown2,
  Eye.Peaceful, Eye.Peaceful2, Eye.X, Eye.Lines,
];

export interface EditorCallbacks {
  onSave(look: Look): void;
  onClose(): void;
}

export class Editor {
  look: Look;
  private overlay: HTMLElement;
  private tabsRow: HTMLElement;
  private body: HTMLElement;
  private previewCanvas: HTMLCanvasElement;
  private actor = new PonyActor();
  private paletteLook = buildPaletteLook(DEFAULT_LOOK_PROXY());
  private dir = 0;
  private cb: EditorCallbacks;
  private tab: string = 'body';
  private raf = 0;
  private lastTime = 0;
  private renderTimer = 0;
  private history: string[] = [];
  private historyIndex = -1;
  private undoButton: HTMLButtonElement;
  private redoButton: HTMLButtonElement;
  private keyHandler: (e: KeyboardEvent) => void;
  private exportButton: HTMLButtonElement;
  private importButton: HTMLButtonElement;
  private sharePanel: HTMLElement | undefined;
  private shareMode: 'export' | 'import' | undefined;

  constructor(look: Look, cb: EditorCallbacks) {
    this.look = { ...look };
    this.cb = cb;
    this.paletteLook = buildPaletteLook(this.look);
    this.actor.setTarget('stand');

    this.overlay = el('div', 'overlay editor-overlay', document.body);
    const panel = el('div', 'panel editor-panel', this.overlay);
    const header = el('div', 'editor-header', panel);
    const title = el('h2', 'editor-title', header);
    title.textContent = 'Внешность';
    const dirButtons = el('div', 'dir-buttons', header);
    const dirs: [string, string, number][] = [['▼', 'Юг', 0], ['◀', 'Запад', 2], ['▶', 'Восток', 3], ['▲', 'Север', 1]];

    for (const [icon, name, d] of dirs) {
      const button = el('button', 'btn small dir-btn', dirButtons);
      button.textContent = icon;
      button.title = name;

      if (d === 0) button.classList.add('active');

      button.addEventListener('click', () => {
        this.dir = d;
        dirButtons.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
      });
    }

    const historyButtons = el('div', 'dir-buttons history-buttons', header);
    this.undoButton = el('button', 'btn small', historyButtons) as HTMLButtonElement;
    this.undoButton.textContent = '↩';
    this.undoButton.title = 'Отменить (Ctrl+Z)';
    this.undoButton.disabled = true;
    this.undoButton.addEventListener('click', () => this.undo());
    this.redoButton = el('button', 'btn small', historyButtons) as HTMLButtonElement;
    this.redoButton.textContent = '↪';
    this.redoButton.title = 'Вернуть (Ctrl+Y)';
    this.redoButton.disabled = true;
    this.redoButton.addEventListener('click', () => this.redo());

    const content = el('div', 'editor-content', panel);
    const previewWrap = el('div', 'editor-preview', content);
    this.previewCanvas = el('canvas', 'preview-canvas', previewWrap) as HTMLCanvasElement;
    this.previewCanvas.width = 80;
    this.previewCanvas.height = 70;
    const previewBg = el('div', 'preview-bg', previewWrap);
    previewWrap.insertBefore(previewBg, this.previewCanvas);
    const randomButton = el('button', 'btn small', previewWrap);
    randomButton.textContent = 'Случайная пони';
    randomButton.addEventListener('click', () => {
      sfx.play('pop');
      this.look = { ...randomLook() };
      this.commit();
      this.refreshAll();
    });

    const right = el('div', 'editor-right', content);
    this.tabsRow = el('div', 'editor-tabs', right);
    this.body = el('div', 'editor-body', right);

    const footer = el('div', 'editor-footer', panel);
    const shareWrap = el('div', 'editor-footer-buttons', footer);
    this.exportButton = el('button', 'btn small', shareWrap) as HTMLButtonElement;
    this.exportButton.textContent = 'Экспорт';
    this.exportButton.title = 'Скопировать код образа, чтобы поделиться';
    this.exportButton.addEventListener('click', () => {
      sfx.play('click');
      this.toggleShare('export');
    });
    this.importButton = el('button', 'btn small', shareWrap) as HTMLButtonElement;
    this.importButton.textContent = 'Импорт';
    this.importButton.title = 'Загрузить образ из кода';
    this.importButton.addEventListener('click', () => {
      sfx.play('click');
      this.toggleShare('import');
    });
    const closeButton = el('button', 'btn', footer);
    closeButton.textContent = 'Отмена';
    closeButton.addEventListener('click', () => {
      sfx.play('click');
      this.close(false);
    });
    const saveButton = el('button', 'btn primary', footer);
    saveButton.textContent = 'Сохранить';
    saveButton.addEventListener('click', () => {
      sfx.play('pop');
      this.close(true);
    });

    const tabs: [string, string][] = [
      ['body', 'Тело'], ['mane', 'Грива'], ['tail', 'Хвост'], ['face', 'Морда'], ['acc', 'Одежда'], ['mark', 'Метка'],
    ];

    for (const [id, label] of tabs) {
      const tabButton = el('button', 'btn small tab-btn' + (id === this.tab ? ' active' : ''), this.tabsRow);
      tabButton.textContent = label;
      tabButton.dataset.tab = id;
      tabButton.addEventListener('click', () => {
        sfx.play('click');
        this.tab = id;
        this.tabsRow.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        tabButton.classList.add('active');
        this.renderTab();
      });
    }

    this.renderTab();
    this.commit();
    this.keyHandler = e => {
      if (e.ctrlKey || e.metaKey) {
        const target = e.target as HTMLElement | null;

        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }

        const key = e.key.toLowerCase();

        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.redo();
        }
      }
    };
    window.addEventListener('keydown', this.keyHandler);
    this.lastTime = performance.now();
    this.loop();
  }

  private commit() {
    const code = encodeLook(this.look);

    if (code === this.history[this.historyIndex]) return;

    this.history.splice(this.historyIndex + 1);
    this.history.push(code);

    if (this.history.length > 100) {
      this.history.shift();
    }

    this.historyIndex = this.history.length - 1;
    this.updateHistoryButtons();
  }

  private undo() {
    if (this.historyIndex <= 0) return;

    sfx.play('click');
    this.historyIndex--;
    this.applyHistory();
  }

  private redo() {
    if (this.historyIndex >= this.history.length - 1) return;

    sfx.play('click');
    this.historyIndex++;
    this.applyHistory();
  }

  private applyHistory() {
    this.look = decodeLook(this.history[this.historyIndex]);
    this.paletteLook = buildPaletteLook(this.look);
    this.renderTab();
    this.updateHistoryButtons();
  }

  private updateHistoryButtons() {
    this.undoButton.disabled = this.historyIndex <= 0;
    this.redoButton.disabled = this.historyIndex >= this.history.length - 1;
  }

  private toggleShare(mode: 'export' | 'import') {
    if (this.shareMode === mode) {
      this.closeShare();
      return;
    }

    this.sharePanel?.remove();
    this.shareMode = mode;
    this.exportButton.classList.toggle('active', mode === 'export');
    this.importButton.classList.toggle('active', mode === 'import');
    const panel = this.overlay.querySelector('.editor-panel') as HTMLElement | null;
    const footer = this.overlay.querySelector('.editor-footer') as HTMLElement | null;

    if (!panel || !footer) return;

    const share = el('div', 'editor-share', panel);
    panel.insertBefore(share, footer);
    this.sharePanel = share;

    if (mode === 'export') {
      const hint = el('div', 'share-hint', share);
      hint.textContent = 'Код твоей пони. Скопируй и передай другу — он вставит его через «Импорт».';
      const textarea = el('textarea', 'share-code', share) as HTMLTextAreaElement;
      textarea.readOnly = true;
      textarea.value = encodeLook(this.look);
      textarea.addEventListener('focus', () => textarea.select());
      const copyButton = el('button', 'btn small', share);
      copyButton.textContent = 'Скопировать код';
      copyButton.addEventListener('click', () => {
        const code = encodeLook(this.look);
        textarea.value = code;
        const done = () => {
          sfx.play('pop');
          copyButton.textContent = 'Скопировано!';
          window.setTimeout(() => {
            copyButton.textContent = 'Скопировать код';
          }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done).catch(() => {
            textarea.focus();
            document.execCommand('copy');
            done();
          });
        } else {
          textarea.focus();
          document.execCommand('copy');
          done();
        }
      });
    } else {
      const hint = el('div', 'share-hint', share);
      hint.textContent = 'Вставь код образа (начинается с KL…). Текущий образ сохранится в истории — можно отменить.';
      const textarea = el('textarea', 'share-code', share) as HTMLTextAreaElement;
      textarea.placeholder = 'KL6.…';
      const status = el('div', 'share-status', share);
      const row = el('div', 'share-row', share);
      const loadButton = el('button', 'btn small primary', row);
      loadButton.textContent = 'Загрузить образ';
      loadButton.addEventListener('click', () => {
        const code = textarea.value.trim();

        if (!/^KL[2-9]\./.test(code)) {
          status.textContent = 'Не похоже на код образа. Код начинается с KL6.';
          status.classList.add('error');
          return;
        }

        this.look = decodeLook(code);
        this.commit();
        this.refreshAll();
        sfx.play('pop');
        status.textContent = 'Образ загружен!';
        status.classList.remove('error');
      });
    }
  }

  private closeShare() {
    this.sharePanel?.remove();
    this.sharePanel = undefined;
    this.shareMode = undefined;
    this.exportButton.classList.remove('active');
    this.importButton.classList.remove('active');
  }

  private refreshAll() {
    this.paletteLook = buildPaletteLook(this.look);
    this.renderTab();
  }

  private scheduleRefresh() {
    this.commit();
    this.paletteLook = buildPaletteLook(this.look);
    clearTimeout(this.renderTimer);
    this.renderTimer = window.setTimeout(() => this.renderTab(), 180);
  }

  private close(save: boolean) {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.keyHandler);
    this.overlay.remove();
    if (save) {
      this.cb.onSave(this.look);
    } else {
      this.cb.onClose();
    }
  }

  private loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.actor.update(dt);
    this.actor.state.headTurned = this.dir === 1;
    drawPonyToCanvas(this.previewCanvas, this.paletteLook, this.actor.state, this.dir === 2);
    this.raf = requestAnimationFrame(this.loop);
  };

  private miniPreview(look: Look): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 70;
    const paletteLook = buildPaletteLook(look);
    const state = { ...this.actor.state };
    state.animationFrame = 0;
    drawPonyToCanvas(canvas, paletteLook, state, false);
    return canvas;
  }

  private optionGrid(
    parent: HTMLElement, count: number, current: number, noneLabel: string,
    build: (index: number) => Look, onPick: (index: number) => void,
  ) {
    const grid = el('div', 'option-grid', parent);

    for (let i = 0; i < count; i++) {
      const button = el('button', 'option-btn' + (i === current ? ' active' : ''), grid) as HTMLButtonElement;

      if (i === 0 && noneLabel) {
        const label = el('span', 'option-none', button);
        label.textContent = noneLabel;
      } else {
        const canvas = this.miniPreview(build(i));
        canvas.className = 'option-canvas';
        button.appendChild(canvas);
      }

      button.addEventListener('click', () => {
        sfx.play('click');
        onPick(i);
        grid.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
      });
    }

    return grid;
  }

  private colorRow(parent: HTMLElement, label: string, swatches: string[], current: number, onPick: (c: number) => void) {
    const row = el('div', 'editor-row', parent);
    const labelEl = el('div', 'editor-row-label', row);
    labelEl.textContent = label;
    colorSwatches(row, swatches, current, onPick);
  }

  private renderTab() {
    clear(this.body);
    const look = this.look;

    if (this.tab === 'body') {
      this.colorRow(this.body, 'Окрас', WARM_SWATCHES, look.coat, c => {
        look.coat = c;

        if (look.wings > 0) {
          look.wingsColor = c;
        }

        this.scheduleRefresh();
      });

      const bodyMarkLabel = el('div', 'editor-row-label', this.body);
      bodyMarkLabel.textContent = 'Отметины на теле';
      this.optionGrid(this.body, bodyMarkCount() + 1, look.bodyMark, 'Нет',
        i => ({ ...look, bodyMark: i }),
        i => {
          look.bodyMark = i;
          this.scheduleRefresh();
        });

      if (look.bodyMark > 0) {
        this.colorRow(this.body, 'Цвет отметин', WARM_SWATCHES, look.bodyMarkColor, c => {
          look.bodyMarkColor = c;
          this.scheduleRefresh();
        });
      }

      const legMarkLabel = el('div', 'editor-row-label', this.body);
      legMarkLabel.textContent = 'Отметины на ногах';
      this.optionGrid(this.body, legMarkCount() + 1, look.legMark, 'Нет',
        i => ({ ...look, legMark: i }),
        i => {
          look.legMark = i;
          this.scheduleRefresh();
        });

      if (look.legMark > 0) {
        this.colorRow(this.body, 'Цвет отметин', WARM_SWATCHES, look.legMarkColor, c => {
          look.legMarkColor = c;
          this.scheduleRefresh();
        });
      }

      const hoovesRow = el('div', 'editor-row', this.body);
      const hoovesLabel = el('div', 'editor-row-label', hoovesRow);
      hoovesLabel.textContent = 'Копыта';
      const hoovesToggle = el('button', 'btn small' + (look.hooves ? ' active' : ''), hoovesRow);
      hoovesToggle.textContent = look.hooves ? 'Есть' : 'Нет';
      hoovesToggle.addEventListener('click', () => {
        look.hooves = look.hooves ? 0 : 0xf5deb3ff;
        hoovesToggle.textContent = look.hooves ? 'Есть' : 'Нет';
        hoovesToggle.classList.toggle('active', !!look.hooves);
        this.scheduleRefresh();
      });

      if (look.hooves) {
        colorSwatches(hoovesRow, WARM_SWATCHES.slice(0, 12), look.hooves, c => {
          look.hooves = c;
          this.scheduleRefresh();
        });
      }

      const wingsLabel = el('div', 'editor-row-label', this.body);
      wingsLabel.textContent = 'Крылья';
      this.optionGrid(this.body, wingsCount(), look.wings, 'Нет',
        i => ({ ...look, wings: i, wingsColor: look.wingsColor || look.coat }),
        i => {
          look.wings = i;

          if (i > 0 && !look.wingsColor) {
            look.wingsColor = look.coat;
          }

          this.scheduleRefresh();
        });

      if (look.wings > 0) {
        this.colorRow(this.body, 'Цвет крыльев', WARM_SWATCHES, look.wingsColor, c => {
          look.wingsColor = c;
          this.scheduleRefresh();
        });
      }

      const hornLabel = el('div', 'editor-row-label', this.body);
      hornLabel.textContent = 'Рог';
      this.optionGrid(this.body, hornCount(), look.horn, 'Нет',
        i => ({ ...look, horn: i }),
        i => {
          look.horn = i;
          this.scheduleRefresh();
        });

      const earsLabel = el('div', 'editor-row-label', this.body);
      earsLabel.textContent = 'Ушки';
      this.optionGrid(this.body, earsCount(), look.ears, '',
        i => ({ ...look, ears: i }),
        i => {
          look.ears = i;
          this.scheduleRefresh();
        });
    } else if (this.tab === 'mane') {
      this.optionGrid(this.body, maneCount(), look.mane, 'Лысая',
        i => ({ ...look, mane: i }),
        i => {
          look.mane = i;
          this.scheduleRefresh();
        });

      this.colorRow(this.body, 'Цвет гривы', MANE_SWATCHES, look.maneColors[0], c => {
        look.maneColors[0] = c;
        this.scheduleRefresh();
      });

      const twoRow = el('div', 'editor-row', this.body);
      const twoLabel = el('div', 'editor-row-label', twoRow);
      twoLabel.textContent = 'Пряди';
      const twoToggle = el('button', 'btn small' + (look.maneColors[1] ? ' active' : ''), twoRow);
      twoToggle.textContent = look.maneColors[1] ? 'Двухцветная' : 'Однотонная';
      twoToggle.addEventListener('click', () => {
        if (look.maneColors[1]) {
          look.maneColors = [look.maneColors[0]];
          twoToggle.textContent = 'Однотонная';
        } else {
          look.maneColors = [look.maneColors[0], MANE_SWATCHES[3] ? cssToColor('#ff8ac2') : look.maneColors[0]];
          twoToggle.textContent = 'Двухцветная';
        }

        twoToggle.classList.toggle('active', !!look.maneColors[1]);
        this.scheduleRefresh();
      });

      if (look.maneColors[1]) {
        colorSwatches(twoRow, MANE_SWATCHES, look.maneColors[1], c => {
          look.maneColors[1] = c;
          this.scheduleRefresh();
        });
      }

      const backLabel = el('div', 'editor-row-label', this.body);
      backLabel.textContent = 'Задняя грива';
      this.optionGrid(this.body, backManeCount(), look.backMane, 'Нет',
        i => ({ ...look, backMane: i }),
        i => {
          look.backMane = i;
          this.scheduleRefresh();
        });

      if (look.backMane > 0) {
        this.colorRow(this.body, 'Цвет задней гривы', MANE_SWATCHES, look.backManeColors[0], c => {
          look.backManeColors[0] = c;
          this.scheduleRefresh();
        });
      }
    } else if (this.tab === 'tail') {
      this.optionGrid(this.body, tailCount(), look.tail, '',
        i => ({ ...look, tail: i }),
        i => {
          look.tail = i;
          this.scheduleRefresh();
        });

      this.colorRow(this.body, 'Цвет хвоста', MANE_SWATCHES, look.tailColors[0], c => {
        look.tailColors[0] = c;
        this.scheduleRefresh();
      });

      const twoRow = el('div', 'editor-row', this.body);
      const twoLabel = el('div', 'editor-row-label', twoRow);
      twoLabel.textContent = 'Пряди';
      const twoToggle = el('button', 'btn small' + (look.tailColors[1] ? ' active' : ''), twoRow);
      twoToggle.textContent = look.tailColors[1] ? 'Двухцветный' : 'Однотонный';
      twoToggle.addEventListener('click', () => {
        if (look.tailColors[1]) {
          look.tailColors = [look.tailColors[0]];
          twoToggle.textContent = 'Однотонный';
        } else {
          look.tailColors = [look.tailColors[0], cssToColor('#56c7ff')];
          twoToggle.textContent = 'Двухцветный';
        }

        twoToggle.classList.toggle('active', !!look.tailColors[1]);
        this.scheduleRefresh();
      });

      if (look.tailColors[1]) {
        colorSwatches(twoRow, MANE_SWATCHES, look.tailColors[1], c => {
          look.tailColors[1] = c;
          this.scheduleRefresh();
        });
      }
    } else if (this.tab === 'face') {
      this.colorRow(this.body, 'Цвет глаз', MANE_SWATCHES, look.eyeColor, c => {
        look.eyeColor = c;
        this.scheduleRefresh();
      });

      const lashRow = el('div', 'editor-row', this.body);
      const lashLabel = el('div', 'editor-row-label', lashRow);
      lashLabel.textContent = 'Ресницы';

      for (let i = 0; i < 3; i++) {
        const button = el('button', 'btn small' + (look.eyelashes === i ? ' active' : ''), lashRow);
        button.textContent = ['Нет', 'Есть', 'Длинные'][i];
        button.addEventListener('click', () => {
          look.eyelashes = i;
          lashRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          button.classList.add('active');
          this.scheduleRefresh();
        });
      }

      const shadowRow = el('div', 'editor-row', this.body);
      const shadowLabel = el('div', 'editor-row-label', shadowRow);
      shadowLabel.textContent = 'Тени для глаз';
      const shadowToggle = el('button', 'btn small' + (look.eyeShadowColor ? ' active' : ''), shadowRow);
      shadowToggle.textContent = look.eyeShadowColor ? 'Есть' : 'Нет';
      shadowToggle.addEventListener('click', () => {
        look.eyeShadowColor = look.eyeShadowColor ? 0 : 0x4a2a52ff;
        shadowToggle.textContent = look.eyeShadowColor ? 'Есть' : 'Нет';
        shadowToggle.classList.toggle('active', !!look.eyeShadowColor);
        this.scheduleRefresh();
      });

      if (look.eyeShadowColor) {
        colorSwatches(shadowRow, MANE_SWATCHES, look.eyeShadowColor, c => {
          look.eyeShadowColor = c;
          this.scheduleRefresh();
        });
      }

      const eyeLabel = el('div', 'editor-row-label', this.body);
      eyeLabel.textContent = 'Глаза (форма)';
      this.optionGrid(this.body, EYE_SHAPES.length + 1, EYE_SHAPES.indexOf(look.eyeOpenness) + 1, 'Как пресет',
        i => ({ ...look, eyeOpenness: i > 0 ? EYE_SHAPES[i - 1] : 0 }),
        i => {
          look.eyeOpenness = i > 0 ? EYE_SHAPES[i - 1] : 0;
          this.scheduleRefresh();
        });

      const blushRow = el('div', 'editor-row', this.body);
      const blushLabel = el('div', 'editor-row-label', blushRow);
      blushLabel.textContent = 'Румянец';
      const blushToggle = el('button', 'btn small' + (look.blush ? ' active' : ''), blushRow);
      blushToggle.textContent = look.blush ? 'Есть' : 'Нет';
      blushToggle.addEventListener('click', () => {
        look.blush = !look.blush;
        blushToggle.textContent = look.blush ? 'Есть' : 'Нет';
        blushToggle.classList.toggle('active', look.blush);
        this.scheduleRefresh();
      });

      if (look.blush) {
        colorSwatches(blushRow, WARM_SWATCHES.slice(0, 12), look.blushColor, c => {
          look.blushColor = c;
          this.scheduleRefresh();
        });
      }

      const exprLabel = el('div', 'editor-row-label', this.body);
      exprLabel.textContent = 'Выражение морды';
      const exprGrid = el('div', 'expression-grid', this.body);

      EXPRESSION_PRESETS.forEach((preset, index) => {
        const button = el('button', 'option-btn expression-btn' + (look.expression === index ? ' active' : ''), exprGrid);
        button.textContent = preset.label;
        button.addEventListener('click', () => {
          look.expression = index;
          exprGrid.querySelectorAll('.expression-btn').forEach(b => b.classList.remove('active'));
          button.classList.add('active');
          this.scheduleRefresh();
        });
      });

      const hairLabel = el('div', 'editor-row-label', this.body);
      hairLabel.textContent = 'Бородка';
      this.optionGrid(this.body, facialHairCount(), look.facialHair, 'Нет',
        i => ({ ...look, facialHair: i }),
        i => {
          look.facialHair = i;
          this.scheduleRefresh();
        });

      if (look.facialHair > 0) {
        this.colorRow(this.body, 'Цвет бородки', MANE_SWATCHES, look.facialHairColors[0], c => {
          look.facialHairColors[0] = c;
          this.scheduleRefresh();
        });
      }

      const muzzleLabel = el('div', 'editor-row-label', this.body);
      muzzleLabel.textContent = 'Морда и рот';
      this.optionGrid(this.body, muzzleCount(), look.muzzle, '',
        i => ({ ...look, muzzle: i }),
        i => {
          look.muzzle = i;
          this.scheduleRefresh();
        });

      const fangsRow = el('div', 'editor-row', this.body);
      const fangsLabel = el('div', 'editor-row-label', fangsRow);
      fangsLabel.textContent = 'Клыки';
      const fangsToggle = el('button', 'btn small' + (look.fangs ? ' active' : ''), fangsRow);
      fangsToggle.textContent = look.fangs ? 'Есть' : 'Нет';
      fangsToggle.addEventListener('click', () => {
        look.fangs = !look.fangs;
        fangsToggle.textContent = look.fangs ? 'Есть' : 'Нет';
        fangsToggle.classList.toggle('active', look.fangs);
        this.scheduleRefresh();
      });

      const faceMarkLabel = el('div', 'editor-row-label', this.body);
      faceMarkLabel.textContent = 'Метки на морде';
      this.optionGrid(this.body, faceMarkCount() + 1, look.faceMark, 'Нет',
        i => ({ ...look, faceMark: i }),
        i => {
          look.faceMark = i;
          this.scheduleRefresh();
        });

      if (look.faceMark > 0) {
        this.colorRow(this.body, 'Цвет метки', MANE_SWATCHES, look.faceMarkColors[0], c => {
          look.faceMarkColors[0] = c;
          this.scheduleRefresh();
        });

        const markTwoRow = el('div', 'editor-row', this.body);
        const markTwoLabel = el('div', 'editor-row-label', markTwoRow);
        markTwoLabel.textContent = 'Второй цвет';
        const markTwoToggle = el('button', 'btn small' + (look.faceMarkColors[1] ? ' active' : ''), markTwoRow);
        markTwoToggle.textContent = look.faceMarkColors[1] ? 'Есть' : 'Нет';
        markTwoToggle.addEventListener('click', () => {
          if (look.faceMarkColors[1]) {
            look.faceMarkColors = [look.faceMarkColors[0]];
            markTwoToggle.textContent = 'Нет';
          } else {
            look.faceMarkColors = [look.faceMarkColors[0], look.faceMarkColors[0]];
            markTwoToggle.textContent = 'Есть';
          }

          markTwoToggle.classList.toggle('active', !!look.faceMarkColors[1]);
          this.scheduleRefresh();
        });

        if (look.faceMarkColors[1]) {
          colorSwatches(markTwoRow, MANE_SWATCHES, look.faceMarkColors[1], c => {
            look.faceMarkColors[1] = c;
            this.scheduleRefresh();
          });
        }
      }
    } else if (this.tab === 'acc') {
      const hatLabel = el('div', 'editor-row-label', this.body);
      hatLabel.textContent = 'Головной убор';
      this.optionGrid(this.body, headAccessoryCount(), look.headAccessory, 'Нет',
        i => ({ ...look, headAccessory: i }),
        i => {
          look.headAccessory = i;
          this.scheduleRefresh();
        });

      if (look.headAccessory > 0) {
        this.colorRow(this.body, 'Цвет убора', WARM_SWATCHES, look.headAccessoryColor, c => {
          look.headAccessoryColor = c;
          this.scheduleRefresh();
        });
      }

      const chestLabel = el('div', 'editor-row-label', this.body);
      chestLabel.textContent = 'Шарф и жилет';
      this.optionGrid(this.body, chestAccessoryCount(), look.chestAccessory, 'Нет',
        i => ({ ...look, chestAccessory: i }),
        i => {
          look.chestAccessory = i;
          this.scheduleRefresh();
        });

      if (look.chestAccessory > 0) {
        this.colorRow(this.body, 'Цвет', WARM_SWATCHES, look.chestAccessoryColor, c => {
          look.chestAccessoryColor = c;
          this.scheduleRefresh();
        });
      }

      const backLabel = el('div', 'editor-row-label', this.body);
      backLabel.textContent = 'Сумка и седельная сумка';
      this.optionGrid(this.body, backAccessoryCount(), look.backAccessory, 'Нет',
        i => ({ ...look, backAccessory: i }),
        i => {
          look.backAccessory = i;
          this.scheduleRefresh();
        });

      if (look.backAccessory > 0) {
        this.colorRow(this.body, 'Цвет', WARM_SWATCHES, look.backAccessoryColor, c => {
          look.backAccessoryColor = c;
          this.scheduleRefresh();
        });
      }

      const sockLabel = el('div', 'editor-row-label', this.body);
      sockLabel.textContent = 'Носочки';
      this.optionGrid(this.body, legAccessoryCount(), look.legAccessory, 'Нет',
        i => ({ ...look, legAccessory: i }),
        i => {
          look.legAccessory = i;
          this.scheduleRefresh();
        });

      if (look.legAccessory > 0) {
        this.colorRow(this.body, 'Цвет носочков', WARM_SWATCHES, look.legAccessoryColor, c => {
          look.legAccessoryColor = c;
          this.scheduleRefresh();
        });
      }

      const sleeveLabel = el('div', 'editor-row-label', this.body);
      sleeveLabel.textContent = 'Рукава';
      this.optionGrid(this.body, sleevesCount() + 1, look.sleeves, 'Нет',
        i => ({ ...look, sleeves: i }),
        i => {
          look.sleeves = i;
          this.scheduleRefresh();
        });

      if (look.sleeves > 0) {
        this.colorRow(this.body, 'Цвет рукавов', WARM_SWATCHES, look.sleevesColor, c => {
          look.sleevesColor = c;
          this.scheduleRefresh();
        });
      }

      const waistLabel = el('div', 'editor-row-label', this.body);
      waistLabel.textContent = 'Пояс и юбка';
      this.optionGrid(this.body, waistCount(), look.waist, 'Нет',
        i => ({ ...look, waist: i }),
        i => {
          look.waist = i;
          this.scheduleRefresh();
        });

      if (look.waist > 0) {
        this.colorRow(this.body, 'Цвет пояса', WARM_SWATCHES, look.waistColor, c => {
          look.waistColor = c;
          this.scheduleRefresh();
        });
      }

      const neckLabel = el('div', 'editor-row-label', this.body);
      neckLabel.textContent = 'Шейный платок';
      this.optionGrid(this.body, neckCount(), look.neck, 'Нет',
        i => ({ ...look, neck: i }),
        i => {
          look.neck = i;
          this.scheduleRefresh();
        });

      if (look.neck > 0) {
        this.colorRow(this.body, 'Цвет платка', WARM_SWATCHES, look.neckColor, c => {
          look.neckColor = c;
          this.scheduleRefresh();
        });
      }
    } else if (this.tab === 'mark') {
      const markLabel = el('div', 'editor-row-label', this.body);
      markLabel.textContent = 'Кьютимарка';
      this.optionGrid(this.body, CUTIE_MARKS.length, look.cm, 'Нет',
        i => ({ ...look, cm: i }),
        i => {
          look.cm = i;
          this.scheduleRefresh();
        });

      if (look.cm > 0) {
        this.colorRow(this.body, 'Цвет метки', MANE_SWATCHES, look.cmColor, c => {
          look.cmColor = c;
          this.scheduleRefresh();
        });

        const flipRow = el('div', 'editor-row', this.body);
        const flipLabel = el('div', 'editor-row-label', flipRow);
        flipLabel.textContent = 'Отражение';
        const flipToggle = el('button', 'btn small' + (look.cmFlip ? ' active' : ''), flipRow);
        flipToggle.textContent = look.cmFlip ? 'Да' : 'Нет';
        flipToggle.addEventListener('click', () => {
          look.cmFlip = !look.cmFlip;
          flipToggle.textContent = look.cmFlip ? 'Да' : 'Нет';
          flipToggle.classList.toggle('active', look.cmFlip);
          this.scheduleRefresh();
        });
      }
    }
  }
}

function DEFAULT_LOOK_PROXY(): Look {
  return { ...DEFAULT_LOOK };
}
