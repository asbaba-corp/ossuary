import type { SerializedSave, SaveStore } from "./save.js";

export class MemorySaveStore implements SaveStore {
  private value: SerializedSave | null = null;
  async load(): Promise<SerializedSave | null> { return this.value; }
  async save(save: SerializedSave): Promise<void> { this.value = save; }
  async clear(): Promise<void> { this.value = null; }
}
