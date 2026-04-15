import { ChatMessage } from "./types";

const MAX_MESSAGES = 500;

class ChatStore {
  private messages: ChatMessage[] = [];

  push(msg: ChatMessage): void {
    this.messages.push(msg);
    if (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  getRecent(n = 100): ChatMessage[] {
    return this.messages.slice(-n);
  }

  clear(): void {
    this.messages = [];
  }
}

// Singleton — the whole backend shares one store
export const chatStore = new ChatStore();
