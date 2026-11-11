export type LogKind = 'say' | 'think' | 'whisper' | 'system';

export class ChatPrefs {
  ignored = new Set<string>();
  words: string[] = [];
  kinds: Record<LogKind, boolean> = { say: true, think: true, whisper: true, system: true };

  constructor() {
    try {
      for (const name of JSON.parse(localStorage.getItem('kilela.ignore') || '[]')) {
        this.ignored.add(String(name).toLowerCase());
      }

      const words = JSON.parse(localStorage.getItem('kilela.words') || '[]');

      if (Array.isArray(words)) {
        this.words = words.map(w => String(w).toLowerCase()).slice(0, 30);
      }

      const kinds = JSON.parse(localStorage.getItem('kilela.kinds') || '{}');

      for (const key of Object.keys(this.kinds) as LogKind[]) {
        if (typeof kinds[key] === 'boolean') {
          this.kinds[key] = kinds[key];
        }
      }
    } catch {
      undefined;
    }
  }

  private save() {
    localStorage.setItem('kilela.ignore', JSON.stringify([...this.ignored]));
    localStorage.setItem('kilela.words', JSON.stringify(this.words));
    localStorage.setItem('kilela.kinds', JSON.stringify(this.kinds));
  }

  isIgnored(name: string): boolean {
    return this.ignored.has(name.trim().toLowerCase());
  }

  toggleIgnore(name: string): 'added' | 'removed' | undefined {
    const q = name.trim().toLowerCase();

    if (!q) return undefined;

    if (this.ignored.has(q)) {
      this.ignored.delete(q);
      this.save();
      return 'removed';
    }

    this.ignored.add(q);
    this.save();
    return 'added';
  }

  ignoredNames(): string[] {
    return [...this.ignored].sort();
  }

  matchesWordFilter(text: string): boolean {
    const low = text.toLowerCase();
    return this.words.some(w => low.includes(w));
  }

  toggleWord(raw: string): 'added' | 'removed' | undefined {
    const q = raw.trim().toLowerCase();

    if (!q) return undefined;

    if (this.words.includes(q)) {
      this.words = this.words.filter(w => w !== q);
      this.save();
      return 'removed';
    }

    this.words.push(q);
    this.save();
    return 'added';
  }

  toggleKind(kind: LogKind): boolean {
    this.kinds[kind] = !this.kinds[kind];
    this.save();
    return this.kinds[kind];
  }
}
