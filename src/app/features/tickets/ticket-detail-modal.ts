import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  OrderView,
  Ticket,
  TicketAttachment,
  TicketMessage,
  TicketReplyTo,
  TicketStatus,
  TicketStatuses,
  UserRoles,
} from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { OrderService } from '@core/services/catalog.service';
import { TicketChatService } from '@core/services/ticket-chat.service';
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideAtSign,
  LucideCheck,
  LucideCheckCheck,
  LucideClock,
  LucideCopy,
  LucideDownload,
  LucideEye,
  LucideFileText,
  LucideImage,
  LucideMessageSquare,
  LucidePaperclip,
  LucidePlus,
  LucideReply,
  LucideSearch,
  LucideSend,
  LucideSmile,
  LucideSparkles,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { EMOJI_CATEGORY_TABS, FULL_EMOJI_LIST, EmojiCategoryTab, EmojiItem } from '@core/constants/emoji.constant';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { Badge, statusTone } from '@shared/ui/badge/badge';

export interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  previewUrl?: string;
  url?: string;
  isUploading: boolean;
  error?: string;
}

export interface MentionableUser {
  id: string;
  name: string;
  tagHandle: string;
  role: string;
  subtitle?: string;
  avatarInitials: string;
  isRoleShortcut?: boolean;
}

export interface MessageToken {
  type: 'text' | 'mention';
  text: string;
  tagType?: 'all' | 'admin' | 'supplier' | 'customer' | 'user';
  userId?: string;
  isSelfMention?: boolean;
}

@Component({
  selector: 'app-ticket-detail-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    CurrencyPipe,
    FormsModule,
    Badge,
    LabelFormatPipe,
    LucideX,
    LucideSend,
    LucideFileText,
    LucideMessageSquare,
    LucidePaperclip,
    LucideImage,
    LucideDownload,
    LucideEye,
    LucideCheck,
    LucideCheckCheck,
    LucideCopy,
    LucideReply,
    LucideSmile,
    LucideSearch,
    LucideArrowDown,
    LucideArrowUp,
    LucideSparkles,
    LucideAtSign,
    LucideTrash2,
    LucidePlus,
  ],
  templateUrl: './ticket-detail-modal.html',
})
export class TicketDetailModal {
  readonly auth = inject(AuthService);
  readonly chat = inject(TicketChatService);
  private readonly orderService = inject(OrderService);
  readonly TicketStatuses = TicketStatuses;

  readonly ticket = input<Ticket | null>(null);
  readonly open = input(false);
  readonly order = input<OrderView | null>(null);

  readonly closed = output<void>();
  readonly statusUpdated = output<{ id: string; status: TicketStatus }>();

  readonly replyText = signal('');
  readonly pendingAttachments = signal<PendingAttachment[]>([]);
  readonly isDragging = signal(false);
  readonly activePreviewImage = signal<{ url: string; name?: string } | null>(null);

  // Modern Chat UX Signals
  readonly replyingTo = signal<TicketMessage | null>(null);
  readonly searchOpen = signal(false);
  readonly chatSearchQuery = signal('');
  readonly emojiBarOpen = signal(false);
  readonly showScrollBottom = signal(false);
  readonly copiedMessageId = signal<string | null>(null);
  readonly deletingMessageId = signal<string | null>(null);

  // Full Emoji Reaction Picker Signals
  readonly activeReactionPickerMessageId = signal<string | null>(null);
  readonly reactionEmojiSearch = signal<string>('');
  readonly reactionEmojiCategory = signal<'all' | 'smileys' | 'gestures' | 'symbols' | 'objects' | 'nature'>('all');
  readonly emojiCategoryTabs = EMOJI_CATEGORY_TABS;

  readonly filteredReactionEmojis = computed<EmojiItem[]>(() => {
    const cat = this.reactionEmojiCategory();
    const query = this.reactionEmojiSearch().trim().toLowerCase();

    return FULL_EMOJI_LIST.filter((item) => {
      const matchCat = cat === 'all' || item.category === cat;
      const matchQuery = !query || item.name.toLowerCase().includes(query) || item.char.includes(query);
      return matchCat && matchQuery;
    });
  });

  // Mention Tagging Signals
  readonly mentionMenuOpen = signal(false);
  readonly mentionSearchQuery = signal('');
  readonly mentionStartIndex = signal(-1);
  readonly selectedMentionIndex = signal(0);
  readonly replyTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('replyTextarea');

  readonly popularEmojis = ['👍', '❤️', '🙌', '🙏', '😊', '🎉', '✅', '⚡', '👀', '🔥'];
  readonly quickTemplates = [
    'Thank you for the update!',
    'Checking on this right now.',
    'Please see the attached files.',
    'The issue has been resolved. Thank you!',
  ];

  readonly statusTone = statusTone;
  readonly UserRoles = UserRoles;

  private typingTimeout: any = null;
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');
  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');

  readonly availableMentionUsers = computed<MentionableUser[]>(() => {
    const currentUserId = this.auth.currentUser()?.id;
    const currentUserRole = this.auth.currentUser()?.role;
    const list: MentionableUser[] = [];
    const seenIds = new Set<string>();

    // 1. "@all" shortcut - notify all ticket participants
    list.push({
      id: 'all',
      name: 'all',
      tagHandle: 'all',
      role: 'ALL',
      subtitle: 'Notify all ticket participants',
      avatarInitials: 'ALL',
      isRoleShortcut: true,
    });

    // 2. Role Shortcuts
    if (currentUserRole !== UserRoles.ADMIN && currentUserRole !== UserRoles.SUBADMIN) {
      list.push({
        id: 'role:support',
        name: 'Support',
        tagHandle: 'Support',
        role: UserRoles.ADMIN,
        subtitle: 'Nexus Support & Admins',
        avatarInitials: 'SP',
        isRoleShortcut: true,
      });
    }

    if (currentUserRole !== UserRoles.CUSTOMER) {
      list.push({
        id: 'role:customer',
        name: 'Customer',
        tagHandle: 'Customer',
        role: UserRoles.CUSTOMER,
        subtitle: 'Ticket Creator',
        avatarInitials: 'CU',
        isRoleShortcut: true,
      });
    }

    if (currentUserRole !== UserRoles.SUPPLIER) {
      list.push({
        id: 'role:supplier',
        name: 'Supplier',
        tagHandle: 'Supplier',
        role: UserRoles.SUPPLIER,
        subtitle: 'Order Vendor / Supplier',
        avatarInitials: 'SU',
        isRoleShortcut: true,
      });
    }

    // 3. Add participants from ticket messages
    for (const m of this.chat.messages()) {
      if (m.senderId && m.senderId !== currentUserId && !seenIds.has(m.senderId)) {
        seenIds.add(m.senderId);
        const cleanName = m.senderName || 'Participant';
        const tagHandle = cleanName.replace(/\s+/g, '');
        list.push({
          id: m.senderId,
          name: cleanName,
          tagHandle,
          role: m.senderRole || UserRoles.CUSTOMER,
          subtitle:
            m.senderRole === UserRoles.ADMIN || m.senderRole === UserRoles.SUBADMIN
              ? 'Support Staff'
              : m.senderRole === UserRoles.SUPPLIER
              ? 'Vendor / Supplier'
              : 'Customer',
          avatarInitials: this.getSenderInitials(m.senderName, '', m.senderRole),
          isRoleShortcut: false,
        });
      }
    }

    // 4. Add ticket customer if not already in list
    const t = this.ticket();
    if (t?.customerId && t.customerId !== currentUserId && !seenIds.has(t.customerId)) {
      seenIds.add(t.customerId);
      list.push({
        id: t.customerId,
        name: 'Customer',
        tagHandle: 'Customer',
        role: UserRoles.CUSTOMER,
        subtitle: 'Ticket Owner',
        avatarInitials: 'C',
        isRoleShortcut: false,
      });
    }

    // 5. Add order suppliers if not already in list
    const ord = this.order();
    if (ord?.items) {
      for (const item of ord.items) {
        if (item.supplierId && item.supplierId !== currentUserId && !seenIds.has(item.supplierId)) {
          seenIds.add(item.supplierId);
          list.push({
            id: item.supplierId,
            name: 'Order Supplier',
            tagHandle: 'Supplier',
            role: UserRoles.SUPPLIER,
            subtitle: item.productTitle ? `Supplier of ${item.productTitle}` : 'Order Supplier',
            avatarInitials: 'S',
            isRoleShortcut: false,
          });
        }
      }
    }

    return list;
  });

  readonly filteredMentionUsers = computed<MentionableUser[]>(() => {
    const query = this.mentionSearchQuery().trim().toLowerCase();
    const all = this.availableMentionUsers();
    if (!query) return all;
    return all.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.tagHandle.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query) ||
        (u.subtitle && u.subtitle.toLowerCase().includes(query))
    );
  });

  readonly activeMatchIndex = signal(0);

  readonly searchMatches = computed<TicketMessage[]>(() => {
    const q = this.chatSearchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.chat.messages().filter((m) => {
      return (
        (m.message || '').toLowerCase().includes(q) ||
        (m.senderName || '').toLowerCase().includes(q) ||
        (m.attachments?.some((a) => a.name.toLowerCase().includes(q)) ?? false)
      );
    });
  });

  readonly searchMatchesCount = computed(() => this.searchMatches().length);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const currentTicket = this.ticket();

      if (isOpen && currentTicket) {
        this.chat.joinTicket(currentTicket.id);
        this.scrollToBottom();
      } else {
        this.chat.leaveTicket();
      }
    });

    // Auto-scroll when messages update
    effect(() => {
      this.chat.messages();
      if (!this.showScrollBottom()) {
        this.scrollToBottom();
      }
    });
  }

  isDiscussionClosed(): boolean {
    const status = this.ticket()?.status;
    return status === TicketStatuses.RESOLVED || status === TicketStatuses.CLOSED;
  }

  hasUploadingAttachments(): boolean {
    return this.pendingAttachments().some((a) => a.isUploading);
  }

  canSend(): boolean {
    if (this.isDiscussionClosed()) return false;
    const hasText = this.replyText().trim().length > 0;
    const hasReadyAttachments = this.pendingAttachments().some((a) => !!a.url && !a.isUploading);
    const isUploading = this.hasUploadingAttachments();
    return (hasText || hasReadyAttachments) && !isUploading && !this.chat.isSending();
  }

  onInput() {
    if (this.isDiscussionClosed()) return;
    const text = this.replyText();
    this.chat.sendTyping(text.length > 0);

    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.chat.sendTyping(false);
    }, 1500);
  }

  checkMentionTrigger() {
    const textarea = this.replyTextarea()?.nativeElement;
    if (!textarea) return;

    const text = this.replyText();
    const selEnd = textarea.selectionEnd ?? text.length;

    // Look backwards from cursor for the nearest '@'
    const textBeforeCursor = text.slice(0, selEnd);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if '@' is at index 0 or preceded by whitespace
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isWordStart = /\s/.test(charBeforeAt);

      if (isWordStart) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!/\s/.test(query)) {
          this.mentionStartIndex.set(lastAtIndex);
          this.mentionSearchQuery.set(query);
          this.selectedMentionIndex.set(0);
          this.mentionMenuOpen.set(true);
          return;
        }
      }
    }

    this.mentionMenuOpen.set(false);
  }

  onComposerInput() {
    this.onInput();
    this.checkMentionTrigger();
  }

  selectMention(user: MentionableUser) {
    const textarea = this.replyTextarea()?.nativeElement;
    const text = this.replyText();
    const startIdx = this.mentionStartIndex();

    if (startIdx === -1) return;

    const selEnd = textarea?.selectionEnd ?? text.length;
    const before = text.slice(0, startIdx);
    const after = text.slice(selEnd);

    // Format as clean @Name or @all - never expose internal UUIDs!
    const handle = user.tagHandle || user.name.replace(/\s+/g, '');
    const tag = `@${handle} `;
    const newText = before + tag + after;

    this.replyText.set(newText);
    this.mentionMenuOpen.set(false);
    this.mentionStartIndex.set(-1);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = before.length + tag.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  }

  triggerMention() {
    if (this.isDiscussionClosed()) return;
    const textarea = this.replyTextarea()?.nativeElement;
    const text = this.replyText();
    const selStart = textarea?.selectionStart ?? text.length;
    const selEnd = textarea?.selectionEnd ?? text.length;

    const before = text.slice(0, selStart);
    const after = text.slice(selEnd);

    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const prefix = needsSpace ? ' @' : '@';
    const newText = before + prefix + after;

    this.replyText.set(newText);
    const atPos = before.length + (needsSpace ? 1 : 0);
    this.mentionStartIndex.set(atPos);
    this.mentionSearchQuery.set('');
    this.selectedMentionIndex.set(0);
    this.mentionMenuOpen.set(true);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newPos = atPos + 1;
        textarea.setSelectionRange(newPos, newPos);
      }
    }, 10);
  }

  onKeydown(event: KeyboardEvent) {
    if (this.isDiscussionClosed()) return;

    if (this.mentionMenuOpen()) {
      const list = this.filteredMentionUsers();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (list.length > 0) {
          this.selectedMentionIndex.update((i) => (i + 1) % list.length);
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (list.length > 0) {
          this.selectedMentionIndex.update((i) => (i - 1 + list.length) % list.length);
        }
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        if (list.length > 0) {
          event.preventDefault();
          const selected = list[this.selectedMentionIndex()];
          if (selected) {
            this.selectMention(selected);
            return;
          }
        }
        this.mentionMenuOpen.set(false);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.mentionMenuOpen.set(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.canSend()) {
        this.send();
      }
    }
  }

  triggerFileInput(type: 'image' | 'doc') {
    if (this.isDiscussionClosed()) return;
    if (type === 'image') {
      this.imageInput()?.nativeElement.click();
    } else {
      this.documentInput()?.nativeElement.click();
    }
  }

  onFilesSelected(event: Event) {
    if (this.isDiscussionClosed()) return;
    const input = event.target as HTMLInputElement;
    if (input?.files && input.files.length > 0) {
      this.processFiles(input.files);
      input.value = '';
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    if (!this.open() || !this.ticket() || this.isDiscussionClosed()) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      event.preventDefault();
      this.processFiles(files);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.activeReactionPickerMessageId()) {
      this.closeReactionPicker();
    }
  }

  onDragOver(event: DragEvent) {
    if (!this.open() || this.isDiscussionClosed()) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (!this.open() || !this.ticket() || this.isDiscussionClosed()) return;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFiles(event.dataTransfer.files);
    }
  }

  processFiles(files: FileList | File[]) {
    const currentTicket = this.ticket();
    if (!currentTicket) return;

    const fileList = Array.from(files);
    for (const file of fileList) {
      const isImg = file.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;
      const attachmentItem: PendingAttachment = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        previewUrl,
        isUploading: true,
      };

      this.pendingAttachments.update((prev) => [...prev, attachmentItem]);

      this.orderService.uploadTicketAttachment(currentTicket.id, file).subscribe({
        next: (res) => {
          this.pendingAttachments.update((items) =>
            items.map((it) =>
              it.id === attachmentItem.id
                ? { ...it, isUploading: false, url: res.url }
                : it,
            ),
          );
        },
        error: (err) => {
          this.pendingAttachments.update((items) =>
            items.map((it) =>
              it.id === attachmentItem.id
                ? { ...it, isUploading: false, error: err?.error?.message || 'Upload failed' }
                : it,
            ),
          );
        },
      });
    }
  }

  removePendingAttachment(id: string) {
    const found = this.pendingAttachments().find((a) => a.id === id);
    if (found?.previewUrl) {
      URL.revokeObjectURL(found.previewUrl);
    }
    this.pendingAttachments.update((items) => items.filter((a) => a.id !== id));
  }

  send() {
    if (!this.canSend()) return;

    const text = this.replyText().trim();
    const reply = this.replyingTo();
    let replyToPayload: TicketReplyTo | null = null;
    if (reply) {
      let textSummary = reply.message ? reply.message.replace(/\n/g, ' ').trim().substring(0, 120) : '';
      if (reply.attachments && reply.attachments.length > 0) {
        const imgCount = reply.attachments.filter((a) => this.isImageAttachment(a)).length;
        const docCount = reply.attachments.length - imgCount;
        if (imgCount > 0 && docCount === 0) {
          const label = imgCount === 1 ? 'Photo' : `${imgCount} Photos`;
          textSummary = textSummary ? `${label} • ${textSummary}` : label;
        } else if (docCount > 0 && imgCount === 0) {
          const firstDoc = reply.attachments.find((a) => !this.isImageAttachment(a))?.name || 'Document';
          const label = docCount === 1 ? firstDoc : `${docCount} Documents`;
          textSummary = textSummary ? `${label} • ${textSummary}` : label;
        } else {
          const label = `${reply.attachments.length} Attachments`;
          textSummary = textSummary ? `${label} • ${textSummary}` : label;
        }
      } else if (!textSummary) {
        textSummary = 'Message';
      }

      replyToPayload = {
        id: reply.id,
        senderName: reply.senderName,
        text: textSummary,
      };
      this.replyingTo.set(null);
    }

    const readyAttachments: TicketAttachment[] = this.pendingAttachments()
      .filter((a) => !!a.url && !a.isUploading)
      .map((a) => ({
        url: a.url!,
        name: a.name,
        size: a.size,
        mimeType: a.mimeType,
      }));

    this.chat.sendMessage(text, readyAttachments.length > 0 ? readyAttachments : undefined, replyToPayload);

    this.pendingAttachments().forEach((a) => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    this.pendingAttachments.set([]);
    this.replyText.set('');
    this.emojiBarOpen.set(false);
    this.scrollToBottom();
  }

  scrollToQuotedMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-500', 'rounded-2xl', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-500');
      }, 1800);
    }
  }

  toggleReaction(messageId: string, emoji: string) {
    if (this.isDiscussionClosed()) return;
    this.chat.toggleReaction(messageId, emoji);
  }

  toggleReactionPicker(messageId: string) {
    if (this.isDiscussionClosed()) return;
    if (this.activeReactionPickerMessageId() === messageId) {
      this.activeReactionPickerMessageId.set(null);
    } else {
      this.activeReactionPickerMessageId.set(messageId);
      this.reactionEmojiSearch.set('');
      this.reactionEmojiCategory.set('all');
    }
  }

  closeReactionPicker() {
    this.activeReactionPickerMessageId.set(null);
    this.reactionEmojiSearch.set('');
  }

  selectReactionFromPicker(messageId: string, emoji: string) {
    this.toggleReaction(messageId, emoji);
    this.closeReactionPicker();
  }

  hasReacted(reactions: Record<string, string[]> | undefined, emoji: string): boolean {
    if (!reactions || !reactions[emoji]) return false;
    const myId = this.auth.currentUser()?.id;
    return Boolean(myId && reactions[emoji].includes(myId));
  }

  getReactionEntries(reactions: Record<string, string[]> | undefined): { emoji: string; count: number; users: string[] }[] {
    if (!reactions) return [];
    return Object.entries(reactions)
      .filter(([_, users]) => users && users.length > 0)
      .map(([emoji, users]) => ({ emoji, count: users.length, users }));
  }

  exportTranscript() {
    const t = this.ticket();
    if (!t) return;

    const msgs = this.chat.messages();
    const divider = '='.repeat(60);
    let output = `NEXUS MARKETPLACE - SUPPORT TICKET TRANSCRIPT\n${divider}\n`;
    output += `Ticket ID:       ${t.id}\n`;
    output += `Subject:         ${t.subject}\n`;
    output += `Status:          ${t.status}\n`;
    output += `Created Date:    ${new Date(t.createdAt).toLocaleString()}\n`;
    if (this.order()) {
      output += `Related Order:   ${this.order()?.id} (${this.order()?.totalAmount ? '$' + this.order()?.totalAmount : ''})\n`;
    }
    output += `Exported At:     ${new Date().toLocaleString()}\n`;
    output += `${divider}\n\n`;

    output += `TICKET INITIAL DESCRIPTION:\n${t.body}\n\n`;
    output += `CONVERSATION LOG (${msgs.length} messages):\n${'-'.repeat(60)}\n\n`;

    for (const msg of msgs) {
      const timeStr = new Date(msg.createdAt).toLocaleString();
      output += `[${timeStr}] ${msg.senderName} (${msg.senderRole}):\n`;
      if (msg.replyTo) {
        output += `  ↳ Quoting ${msg.replyTo.senderName}: "${msg.replyTo.text}"\n`;
      }
      const cleanMessage = msg.message.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
      output += `  ${cleanMessage}\n`;
      if (msg.attachments && msg.attachments.length > 0) {
        output += `  [Attachments: ${msg.attachments.map((a) => `${a.name} (${a.url})`).join(', ')}]\n`;
      }
      output += `\n`;
    }

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${t.id.substring(0, 8)}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  changeStatus(status: TicketStatus) {
    const t = this.ticket();
    if (!t) return;
    this.statusUpdated.emit({ id: t.id, status });
  }

  close() {
    this.pendingAttachments().forEach((a) => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    this.pendingAttachments.set([]);
    this.activePreviewImage.set(null);
    this.replyingTo.set(null);
    this.searchOpen.set(false);
    this.chatSearchQuery.set('');
    this.emojiBarOpen.set(false);
    this.chat.leaveTicket();
    this.closed.emit();
  }

  isCurrentUser(senderId: string): boolean {
    return this.auth.currentUser()?.id === senderId;
  }

  canManage(): boolean {
    const role = this.auth.role();
    return (
      role === UserRoles.ADMIN ||
      role === UserRoles.SUBADMIN ||
      role === UserRoles.SUPPLIER
    );
  }

  openImagePreview(url: string, name?: string) {
    this.activePreviewImage.set({ url, name });
  }

  closeImagePreview() {
    this.activePreviewImage.set(null);
  }

  // Quoted Replies
  setReplyTo(msg: TicketMessage) {
    if (this.isDiscussionClosed()) return;
    this.replyingTo.set(msg);
  }

  clearReplyTo() {
    this.replyingTo.set(null);
  }

  getQuotedMessage(id?: string): TicketMessage | undefined {
    if (!id) return undefined;
    return this.chat.messages().find((m) => m.id === id);
  }

  getMessageThumbnail(msg?: TicketMessage | null): string | null {
    if (!msg || !msg.attachments || msg.attachments.length === 0) return null;
    const firstImg = msg.attachments.find((a) => this.isImageAttachment(a));
    return firstImg ? firstImg.url : null;
  }

  getQuotedThumbnail(reply: TicketReplyTo): string | null {
    const orig = this.getQuotedMessage(reply.id);
    if (orig && orig.attachments && orig.attachments.length > 0) {
      const firstImg = orig.attachments.find((a) => this.isImageAttachment(a));
      if (firstImg) return firstImg.url;
    }
    return null;
  }

  getReplyingToDisplay(msg: TicketMessage): { text: string; icon: 'image' | 'file' | 'text' } {
    const rawText = (msg.message || '').trim();
    if (msg.attachments && msg.attachments.length > 0) {
      const imgCount = msg.attachments.filter((a) => this.isImageAttachment(a)).length;
      const docCount = msg.attachments.length - imgCount;
      if (imgCount > 0 && docCount === 0) {
        const label = imgCount === 1 ? 'Photo' : `${imgCount} Photos`;
        return { text: rawText ? `${label} • ${rawText}` : label, icon: 'image' };
      }
      if (docCount > 0 && imgCount === 0) {
        const firstDoc = msg.attachments.find((a) => !this.isImageAttachment(a))?.name || 'Document';
        const label = docCount === 1 ? firstDoc : `${docCount} Documents`;
        return { text: rawText ? `${label} • ${rawText}` : label, icon: 'file' };
      }
      const label = `${msg.attachments.length} Attachments`;
      return { text: rawText ? `${label} • ${rawText}` : label, icon: 'file' };
    }
    return { text: rawText || 'Message', icon: 'text' };
  }

  getQuotedDisplay(reply: TicketReplyTo): { text: string; icon: 'image' | 'file' | 'text' } {
    const trimmed = (reply.text || '').trim();
    const orig = this.getQuotedMessage(reply.id);

    if (orig && orig.attachments && orig.attachments.length > 0) {
      const imgCount = orig.attachments.filter((a) => this.isImageAttachment(a)).length;
      const docCount = orig.attachments.length - imgCount;

      if (imgCount > 0 && docCount === 0) {
        const label = imgCount === 1 ? 'Photo' : `${imgCount} Photos`;
        if (!trimmed || trimmed === '""' || trimmed === "''") {
          return { text: label, icon: 'image' };
        }
        return {
          text: trimmed.toLowerCase().includes('photo') ? trimmed : `${label} • ${trimmed}`,
          icon: 'image',
        };
      }

      if (docCount > 0 && imgCount === 0) {
        const firstDocName = orig.attachments.find((a) => !this.isImageAttachment(a))?.name || 'Document';
        const label = docCount === 1 ? firstDocName : `${docCount} Documents`;
        if (!trimmed || trimmed === '""' || trimmed === "''") {
          return { text: label, icon: 'file' };
        }
        return {
          text: trimmed.includes(firstDocName) ? trimmed : `${label} • ${trimmed}`,
          icon: 'file',
        };
      }

      const label = `${orig.attachments.length} Attachments`;
      if (!trimmed || trimmed === '""' || trimmed === "''") {
        return { text: label, icon: 'file' };
      }
      return { text: trimmed, icon: 'file' };
    }

    if (!trimmed || trimmed === '""' || trimmed === "''") {
      return { text: 'Photo / Attachment', icon: 'image' };
    }

    return { text: trimmed, icon: 'text' };
  }

  parseMessage(raw: string): { quote?: { author: string; text: string }; body: string } {
    if (raw && raw.startsWith('> [')) {
      const closingBracket = raw.indexOf(']: ');
      const doubleBreak = raw.indexOf('\n\n');
      if (closingBracket !== -1 && doubleBreak !== -1 && doubleBreak > closingBracket) {
        const author = raw.substring(3, closingBracket);
        const quoteText = raw.substring(closingBracket + 3, doubleBreak);
        const body = raw.substring(doubleBreak + 2);
        return { quote: { author, text: quoteText }, body };
      }
    }
    return { body: raw };
  }

  formatMessageTokens(rawText: string): MessageToken[] {
    if (!rawText) return [];

    const tokens: MessageToken[] = [];
    const mentionRegex = /(^|[\s.,!?;:(])(?:@\[([^\]]+)\]\(([^)]+)\)|@([a-zA-Z0-9_-]+))/g;
    const currentUserId = this.auth.currentUser()?.id;
    const currentUserRole = this.auth.currentUser()?.role;
    const currentUserName = (this.auth.currentUser()?.name || '').replace(/\s+/g, '').toLowerCase();
    const currentUserEmailPrefix = (this.auth.currentUser()?.email || '').split('@')[0]?.toLowerCase();

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(rawText)) !== null) {
      const boundary = match[1] || '';
      const matchStart = match.index + boundary.length;

      if (matchStart > lastIndex) {
        tokens.push({
          type: 'text',
          text: rawText.substring(lastIndex, matchStart),
        });
      }

      if (match[2] && match[3]) {
        // Legacy markdown format @[DisplayName](userId)
        const displayName = match[2];
        const userId = match[3];
        const isSelf = Boolean(currentUserId && userId === currentUserId);
        tokens.push({
          type: 'mention',
          text: displayName,
          tagType: 'user',
          userId,
          isSelfMention: isSelf,
        });
      } else if (match[4]) {
        // Natural handle: @all, @Support, @Prem, etc.
        const rawHandle = match[4];
        const lower = rawHandle.toLowerCase();

        if (lower === 'all' || lower === 'everyone') {
          tokens.push({
            type: 'mention',
            text: rawHandle,
            tagType: 'all',
            isSelfMention: false,
          });
        } else if (lower === 'support' || lower === 'admin') {
          const isSelf = currentUserRole === UserRoles.ADMIN || currentUserRole === UserRoles.SUBADMIN;
          tokens.push({
            type: 'mention',
            text: rawHandle,
            tagType: 'admin',
            isSelfMention: isSelf,
          });
        } else if (lower === 'supplier') {
          const isSelf = currentUserRole === UserRoles.SUPPLIER;
          tokens.push({
            type: 'mention',
            text: rawHandle,
            tagType: 'supplier',
            isSelfMention: isSelf,
          });
        } else if (lower === 'customer') {
          const isSelf = currentUserRole === UserRoles.CUSTOMER;
          tokens.push({
            type: 'mention',
            text: rawHandle,
            tagType: 'customer',
            isSelfMention: isSelf,
          });
        } else {
          // Specific user handle (e.g. @Prem)
          const isSelf = Boolean(
            (currentUserName && currentUserName === lower) ||
            (currentUserEmailPrefix && currentUserEmailPrefix === lower)
          );
          tokens.push({
            type: 'mention',
            text: rawHandle,
            tagType: 'user',
            isSelfMention: isSelf,
          });
        }
      }

      lastIndex = mentionRegex.lastIndex;
    }

    if (lastIndex < rawText.length) {
      tokens.push({
        type: 'text',
        text: rawText.substring(lastIndex),
      });
    }

    return tokens;
  }

  getMentionBadgeClass(token: MessageToken): string {
    if (token.isSelfMention) {
      return 'bg-amber-500/25 text-amber-300 border border-amber-400/50 ring-1 ring-amber-400/40 font-bold shadow-sm shadow-amber-500/20 animate-pulse';
    }
    if (token.tagType === 'all') {
      return 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-200 border border-purple-400/40 font-bold shadow-sm shadow-purple-500/20';
    }
    if (token.tagType === 'admin') {
      return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-medium';
    }
    if (token.tagType === 'supplier') {
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium';
    }
    if (token.tagType === 'customer') {
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium';
    }
    return 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium';
  }

  // Copy text to clipboard
  copyMessageText(text: string, id: string) {
    const cleanText = text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
    navigator.clipboard?.writeText(cleanText);
    this.copiedMessageId.set(id);
    setTimeout(() => {
      if (this.copiedMessageId() === id) {
        this.copiedMessageId.set(null);
      }
    }, 2000);
  }

  canDelete(msg: TicketMessage): boolean {
    if (msg.isDeleted) return false;
    const currentUserId = this.auth.currentUser()?.id;
    const isAdmin =
      this.auth.currentUser()?.role === UserRoles.ADMIN ||
      this.auth.currentUser()?.role === UserRoles.SUBADMIN;
    return msg.senderId === currentUserId || isAdmin;
  }

  confirmDelete(messageId: string) {
    this.deletingMessageId.set(messageId);
  }

  cancelDelete() {
    this.deletingMessageId.set(null);
  }

  executeDelete(messageId: string) {
    const t = this.ticket();
    if (!t) return;
    this.chat.deleteMessage(t.id, messageId);
    this.deletingMessageId.set(null);
  }

  // Quick Emoji & Template Chips
  toggleEmojiBar() {
    if (this.isDiscussionClosed()) return;
    this.emojiBarOpen.update((v) => !v);
  }

  insertEmoji(emoji: string) {
    if (this.isDiscussionClosed()) return;
    this.replyText.update((t) => (t ? t + ' ' + emoji : emoji));
    this.onInput();
  }

  useTemplate(tpl: string) {
    if (this.isDiscussionClosed()) return;
    this.replyText.update((t) => (t ? t + ' ' + tpl : tpl));
    this.onInput();
  }

  // In-Chat Search & Result Navigation
  toggleSearch() {
    this.searchOpen.update((v) => !v);
    if (!this.searchOpen()) {
      this.chatSearchQuery.set('');
      this.activeMatchIndex.set(0);
    }
  }

  onSearchQueryChange(query: string) {
    this.chatSearchQuery.set(query);
    this.activeMatchIndex.set(0);
    if (query.trim().length > 0) {
      setTimeout(() => {
        this.scrollToActiveMatch();
      }, 60);
    }
  }

  scrollToActiveMatch() {
    const matches = this.searchMatches();
    if (matches.length === 0) return;
    const idx = this.activeMatchIndex();
    const targetMsg = matches[idx];
    if (!targetMsg) return;

    const el = document.getElementById('msg-' + targetMsg.id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  nextSearchMatch() {
    const count = this.searchMatches().length;
    if (count === 0) return;
    this.activeMatchIndex.update((i) => (i + 1) % count);
    this.scrollToActiveMatch();
  }

  prevSearchMatch() {
    const count = this.searchMatches().length;
    if (count === 0) return;
    this.activeMatchIndex.update((i) => (i - 1 + count) % count);
    this.scrollToActiveMatch();
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        this.prevSearchMatch();
      } else {
        this.nextSearchMatch();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.toggleSearch();
    }
  }

  isCurrentSearchMatch(msgId: string): boolean {
    const q = this.chatSearchQuery().trim();
    if (!q) return false;
    const matches = this.searchMatches();
    if (matches.length === 0) return false;
    const current = matches[this.activeMatchIndex()];
    return current?.id === msgId;
  }

  matchesSearch(msg: TicketMessage): boolean {
    const q = this.chatSearchQuery().trim().toLowerCase();
    if (!q) return true;
    return (
      (msg.message || '').toLowerCase().includes(q) ||
      (msg.senderName || '').toLowerCase().includes(q) ||
      (msg.attachments?.some((a) => a.name.toLowerCase().includes(q)) ?? false)
    );
  }

  // Scroll to bottom
  onScroll(event: Event) {
    const container = event.target as HTMLDivElement;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    this.showScrollBottom.set(distFromBottom > 160);
  }

  scrollToBottomSmooth() {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      this.showScrollBottom.set(false);
    }
  }

  // Date Divider
  getDateDivider(index: number, messages: TicketMessage[]): string | null {
    if (!messages || messages.length === 0 || index >= messages.length) return null;
    const currentMsg = messages[index];
    const currentDate = new Date(currentMsg.createdAt).toDateString();

    if (index === 0) {
      return this.formatDateLabel(currentMsg.createdAt);
    }

    const prevMsg = messages[index - 1];
    const prevDate = new Date(prevMsg.createdAt).toDateString();

    if (currentDate !== prevDate) {
      return this.formatDateLabel(currentMsg.createdAt);
    }
    return null;
  }

  formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Initials & Color Badges
  getSenderInitials(name?: string, email?: string, role?: string): string {
    if (role === UserRoles.ADMIN || role === UserRoles.SUBADMIN) {
      return 'A';
    }
    if (name && name.trim()) {
      const trimmed = name.trim();
      if (/admin/i.test(trimmed)) {
        return 'A';
      }
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        if (parts[0].toLowerCase() === 'nexus' && parts[1]) {
          return parts[1][0].toUpperCase();
        }
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return trimmed.slice(0, 1).toUpperCase();
    }
    if (email && email.includes('@')) {
      const local = email.split('@')[0];
      if (/admin/i.test(local)) {
        return 'A';
      }
      return local.slice(0, 1).toUpperCase();
    }
    if (role === UserRoles.CUSTOMER) {
      return 'C';
    }
    return 'U';
  }

  getSenderRoleRing(role: string): string {
    if (role === 'ALL' || role === 'EVERYONE') {
      return 'border-purple-500/40 bg-purple-950 text-purple-300';
    }
    if (role === UserRoles.ADMIN || role === UserRoles.SUBADMIN) {
      return 'border-indigo-500/40 bg-indigo-950 text-indigo-300';
    }
    if (role === UserRoles.SUPPLIER) {
      return 'border-amber-500/40 bg-amber-950 text-amber-300';
    }
    if (role === UserRoles.CUSTOMER) {
      return 'border-emerald-500/40 bg-emerald-950 text-emerald-300';
    }
    return 'border-sky-500/40 bg-sky-950 text-sky-300';
  }

  getMentionRoleBadgeClass(role: string, isSelected: boolean): string {
    if (isSelected) return 'bg-white/20 text-white';
    if (role === 'ALL' || role === 'EVERYONE') {
      return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    }
    if (role === UserRoles.ADMIN || role === UserRoles.SUBADMIN) {
      return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    }
    if (role === UserRoles.SUPPLIER) {
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    }
    if (role === UserRoles.CUSTOMER) {
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
    return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
  }

  formatFileSize(bytes: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isImageAttachment(attachment: { mimeType?: string; url?: string }): boolean {
    if (attachment.mimeType?.startsWith('image/')) return true;
    return /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(attachment.url || '');
  }

  getFileExt(name: string): string {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
  }

  getFileCardColor(name: string, mimeType: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (mimeType.includes('pdf') || ext === 'pdf') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (mimeType.includes('word') || ext === 'doc' || ext === 'docx') {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    if (mimeType.includes('excel') || mimeType.includes('sheet') || ext === 'xls' || ext === 'xlsx' || ext === 'csv') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (mimeType.includes('zip') || ext === 'zip' || ext === 'rar') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 60);
  }
}
