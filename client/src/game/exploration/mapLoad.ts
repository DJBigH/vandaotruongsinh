export class MapLoad<T> {
  private generation = 0;
  private prefetched: { id: string; data: Promise<T | null> } | null = null;

  constructor(private readonly load: (id: string) => Promise<T>) {}

  prefetch(id: string) {
    if (this.prefetched?.id !== id) {
      this.prefetched = { id, data: this.fetch(id) };
    }
  }

  async show(id: string, render: (data: T) => void, onFailure?: () => void) {
    const generation = ++this.generation;
    const pending = this.prefetched?.id === id ? this.prefetched.data : this.fetch(id);
    this.prefetched = null;
    const data = await pending;
    if (this.generation !== generation) return;
    if (data !== null) render(data);
    else onFailure?.();
  }

  clear() {
    this.generation++;
    this.prefetched = null;
  }

  private async fetch(id: string) {
    try {
      return await this.load(id);
    } catch {
      return null;
    }
  }
}
