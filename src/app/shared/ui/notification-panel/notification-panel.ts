import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { AppNotification, NotificationType } from '@core/models';
import { NotificationService } from '@core/services/notification.service';
import {
  LucideBell,
  LucideBellOff,
  LucideCheck,
  LucideCheckCheck,
  LucideExternalLink,
  LucideFileText,
  LucideMessageSquare,
  LucideReceipt,
  LucideTrash2,
  LucideTrendingDown,
  LucideVolume2,
  LucideVolumeX,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-notification-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideBell,
    LucideBellOff,
    LucideCheck,
    LucideCheckCheck,
    LucideVolume2,
    LucideVolumeX,
    LucideTrash2,
    LucideX,
    LucideFileText,
    LucideReceipt,
    LucideMessageSquare,
    LucideTrendingDown,
    LucideExternalLink,
  ],
  templateUrl: './notification-panel.html',
})
export class NotificationPanelComponent {
  readonly notificationService = inject(NotificationService);
  private readonly elRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.notificationService.isOpen()) return;

    // Check if clicked element is inside this panel or the bell trigger
    const target = event.target as HTMLElement;
    const isInside = this.elRef.nativeElement.contains(target);
    const isBellTrigger = target.closest('#notification-bell-trigger');

    if (!isInside && !isBellTrigger) {
      this.notificationService.closePanel();
    }
  }

  getTypeIconBg(type: NotificationType): string {
    switch (type) {
      case 'RFQ':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'ORDER':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'TICKET':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'WATCHLIST':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'SYSTEM':
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  }

  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const now = Date.now();
    const past = new Date(dateStr).getTime();
    const diffSeconds = Math.floor((now - past) / 1000);

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  handleClick(notification: AppNotification) {
    this.notificationService.handleNotificationClick(notification);
  }
}
