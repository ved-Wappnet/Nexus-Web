import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RfqChatMessage, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { RfqChatService } from '@core/services/rfq-chat.service';
import { NexusCurrencyPipe } from '@shared/pipes/nexus-currency.pipe';
import {
  LucideCheck,
  LucideCheckCheck,
  LucideHandshake,
  LucideMessageSquare,
  LucidePackage,
  LucideSend,
  LucideSparkles,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';

import { ForexVolatilityBadge } from '@shared/ui/forex-volatility-badge/forex-volatility-badge';

@Component({
  selector: 'app-rfq-chat-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NexusCurrencyPipe,
    ForexVolatilityBadge,
    DatePipe,
    FormsModule,
    LucideX,
    LucideSend,
    LucideTrash2,
    LucideMessageSquare,
    LucideCheck,
    LucideCheckCheck,
    LucidePackage,
    LucideSparkles,
    LucideHandshake,
  ],
  templateUrl: './rfq-chat-drawer.html',
})
export class RfqChatDrawer {
  readonly chat = inject(RfqChatService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  readonly inputText = signal('');
  readonly deletingMessageId = signal<string | null>(null);

  // Preset negotiation quick-prompts
  readonly negotiationPrompts = [
    { label: 'Sample Request', text: 'Could you arrange a pre-production sample before final confirmation?' },
    { label: 'Custom Packaging', text: 'Can this order support custom retail packaging and private labeling?' },
    { label: 'Lead Times', text: 'What is your guaranteed production lead time for this target volume?' },
    { label: 'Freight Terms', text: 'Are freight and customs handling fees included in this unit quotation?' },
  ];

  constructor() {
    // Auto-scroll to bottom when messages update
    effect(() => {
      const msgs = this.chat.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 60);
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    } else {
      this.chat.sendTyping(true);
    }
  }

  onInput() {
    this.chat.sendTyping(this.inputText().length > 0);
  }

  insertPrompt(text: string) {
    const current = this.inputText().trim();
    this.inputText.set(current ? `${current} ${text}` : text);
  }

  send() {
    const text = this.inputText().trim();
    if (!text || this.chat.isSending()) return;

    this.chat.sendMessage(text);
    this.inputText.set('');
    this.chat.sendTyping(false);
  }

  canDelete(msg: RfqChatMessage): boolean {
    if (msg.isDeleted) return false;
    const currentUserId = this.auth.currentUser()?.id;
    const isAdmin = this.auth.currentUser()?.role === UserRoles.ADMIN;
    return msg.senderId === currentUserId || isAdmin;
  }

  confirmDelete(messageId: string) {
    this.deletingMessageId.set(messageId);
  }

  cancelDelete() {
    this.deletingMessageId.set(null);
  }

  executeDelete(messageId: string) {
    this.chat.deleteMessage(messageId);
    this.deletingMessageId.set(null);
  }

  private scrollToBottom() {
    if (this.messagesContainer?.nativeElement) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
