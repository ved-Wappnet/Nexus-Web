import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'doc';
  url: string;
  size?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
  lastMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  metadata?: {
    provider?: string;
    model?: string;
  };
}

export interface SendChatMessagePayload {
  message: string;
  history?: { role: string; content: string }[];
  activeOrderId?: string;
  attachments?: ChatAttachment[];
}

export interface ChatbotApiResponse {
  reply: string;
  metadata?: {
    provider: string;
    model: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/chatbot/chat`;
  private readonly streamUrl = `${environment.apiUrl}/chatbot/chat/stream`;

  private readonly STORAGE_KEY = 'nexus_chat_history';
  private readonly SESSIONS_KEY = 'nexus_chat_sessions';

  readonly messages = signal<ChatMessage[]>(this.loadPersistedMessages());
  readonly pastSessions = signal<ChatSession[]>(this.loadPastSessions());
  readonly isThinking = signal<boolean>(false);
  readonly isOpen = signal<boolean>(false);
  readonly isTypewriterEnabled = signal<boolean>(this.loadTypewriterPreference());

  private loadTypewriterPreference(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem('nexus_chat_typewriter_enabled');
        if (val !== null) return val === 'true';
      }
    } catch {}
    return true;
  }

  toggleTypewriterPreference(): boolean {
    const nextVal = !this.isTypewriterEnabled();
    this.isTypewriterEnabled.set(nextVal);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('nexus_chat_typewriter_enabled', String(nextVal));
      }
    } catch {}
    return nextVal;
  }

  private loadPersistedMessages(): ChatMessage[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
          }
        }
      }
    } catch {
      // ignore storage access error
    }

    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: `👋 Hello! I am **Nexus AI Assistant**.\n\nHow can I help you today? I can help with:\n- 📦 **Real-time Order Tracking** & carrier status\n- 🔍 **Product specs** and pricing\n- 🛡️ **Escrow & Inspection Dispute** guidance`,
        timestamp: new Date(),
      },
    ];
  }

  private savePersistedMessages(list: ChatMessage[]) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      }
    } catch {
      // ignore storage quota error
    }
  }

  private loadPastSessions(): ChatSession[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(this.SESSIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map((s) => ({
              ...s,
              timestamp: new Date(s.timestamp),
              messages: (s.messages || []).map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              })),
            }));
          }
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  private savePastSessions(sessions: ChatSession[]) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
      }
    } catch {
      // ignore
    }
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
  }

  openChatWithPrompt(promptText: string, activeOrderId?: string) {
    this.isOpen.set(true);
    this.sendMessage(promptText, activeOrderId);
  }

  sendMessage(
    userText: string,
    activeOrderId?: string,
    attachments?: ChatAttachment[]
  ): Observable<ChatbotApiResponse> {
    let text = userText.trim();
    if (!text && attachments && attachments.length > 0) {
      text = `Attached ${attachments.length} file(s): ${attachments.map((a) => a.name).join(', ')}`;
    }
    if (!text) throw new Error('Message cannot be empty');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
      attachments: attachments && attachments.length > 0 ? [...attachments] : undefined,
    };

    // Add user message to signal state & persist
    this.messages.update((list) => {
      const updated = [...list, userMessage];
      this.savePersistedMessages(updated);
      return updated;
    });
    this.isThinking.set(true);

    // Prepare message history for context
    const currentHistory = this.messages()
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    const payload: SendChatMessagePayload = {
      message: text,
      history: currentHistory.slice(0, -1), // exclude current message
      activeOrderId,
      attachments,
    };

    return new Observable<ChatbotApiResponse>((observer) => {
      const msgId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: msgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      this.messages.update((list) => [...list, assistantMessage]);

      const abortController = new AbortController();
      let accumulated = '';
      let lastMetadata: { provider: string; model: string } | undefined = undefined;

      fetch(this.streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok || !response.body) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.token) {
                    accumulated += data.token;
                    this.isThinking.set(false);
                    this.messages.update((list) =>
                      list.map((m) => (m.id === msgId ? { ...m, content: accumulated } : m))
                    );
                  }
                  if (data.metadata) {
                    lastMetadata = data.metadata;
                    this.messages.update((list) =>
                      list.map((m) => (m.id === msgId ? { ...m, metadata: data.metadata } : m))
                    );
                  }
                } catch {
                  // Partial JSON chunk, continue
                }
              }
            }
          }

          this.isThinking.set(false);
          this.savePersistedMessages(this.messages());
          observer.next({ reply: accumulated, metadata: lastMetadata });
          observer.complete();
        })
        .catch((err) => {
          this.isThinking.set(false);
          this.messages.update((list) =>
            list.map((m) =>
              m.id === msgId && !m.content
                ? {
                    ...m,
                    content:
                      "I'm currently having trouble connecting to the AI server. Please check your network or try again shortly.",
                  }
                : m
            )
          );
          this.savePersistedMessages(this.messages());
          observer.error(err);
        });

      return () => {
        abortController.abort();
      };
    });
  }

  addDirectBotResponse(userText: string, botReply: string) {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: botReply,
      timestamp: new Date(),
      metadata: { provider: 'nexus-client', model: 'cart-engine' },
    };
    this.messages.update((list) => {
      const updated = [...list, userMessage, assistantMessage];
      this.savePersistedMessages(updated);
      return updated;
    });
  }

  archiveCurrentSession(): boolean {
    const current = this.messages();
    const userMsg = current.find((m) => m.role === 'user');
    if (!userMsg) return false;

    let title = userMsg.content.replace(/\n+/g, ' ').trim();
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }

    const lastMsg = current[current.length - 1]?.content?.replace(/\n+/g, ' ').trim() || '';
    const lastPreview = lastMsg.length > 60 ? lastMsg.substring(0, 57) + '...' : lastMsg;

    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: title || 'Conversation',
      timestamp: new Date(),
      messages: [...current],
      lastMessage: lastPreview,
    };

    this.pastSessions.update((list) => {
      const updated = [newSession, ...list].slice(0, 30);
      this.savePastSessions(updated);
      return updated;
    });

    return true;
  }

  loadSession(sessionId: string) {
    const session = this.pastSessions().find((s) => s.id === sessionId);
    if (!session) return;

    this.archiveCurrentSession();

    this.messages.set(session.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })));
    this.savePersistedMessages(this.messages());
  }

  deleteSession(sessionId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.pastSessions.update((list) => {
      const updated = list.filter((s) => s.id !== sessionId);
      this.savePastSessions(updated);
      return updated;
    });
  }

  clearAllPastSessions() {
    this.pastSessions.set([]);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.SESSIONS_KEY);
      }
    } catch {
      // ignore
    }
  }

  clearHistory() {
    this.archiveCurrentSession();

    const defaultWelcome: ChatMessage[] = [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: `👋 Hello! Conversation has been saved to your archives. How can I assist you in this new session?`,
        timestamp: new Date(),
      },
    ];
    this.messages.set(defaultWelcome);
    this.savePersistedMessages(defaultWelcome);
  }

  exportChatHistory() {
    const msgs = this.messages();
    if (!msgs || msgs.length === 0) return;

    let transcript = `# Nexus AI Assistant - Chat Transcript\nExported on: ${new Date().toLocaleString()}\n\n` +
      `======================================================\n\n`;

    msgs.forEach((m) => {
      const dateStr = new Date(m.timestamp).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const author = m.role === 'user' ? 'YOU' : 'NEXUS AI ASSISTANT';
      transcript += `[${dateStr} at ${timeStr}] ${author}:\n${m.content}\n`;
      if (m.attachments && m.attachments.length > 0) {
        transcript += `Attached Files: ${m.attachments.map((a) => `${a.name} (${a.type})`).join(', ')}\n`;
      }
      transcript += `\n------------------------------------------------------\n\n`;
    });

    if (typeof document !== 'undefined') {
      const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-chat-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }
}
