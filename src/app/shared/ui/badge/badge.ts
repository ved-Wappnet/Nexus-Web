import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UserRoles } from '@core/constants/user.constant';
import {
  OrderStatuses,
  PaymentStatuses,
  ProductStatus,
  ProductStatuses,
  RfqStatuses,
  TicketStatuses,
  UserRole,
} from '@core/models';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-normal uppercase {{ cls() }}">
      <ng-content />
    </span>
  `,
})
export class Badge {
  readonly tone = input<'muted' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'zinc'>('muted');

  cls(): string {
    switch (this.tone()) {
      case 'indigo':
        return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20';
      case 'amber':
        return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
      case 'rose':
        return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
      case 'zinc':
        return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
      default:
        return 'bg-zinc-800/80 text-zinc-400 border border-zinc-700';
    }
  }
}

export function roleTone(role: UserRole): 'muted' | 'indigo' | 'emerald' | 'amber' {
  switch (role) {
    case UserRoles.ADMIN:
      return 'emerald';
    case UserRoles.SUPPLIER:
      return 'indigo';
    case UserRoles.SUBADMIN:
      return 'amber';
    case UserRoles.DELIVERY_PARTNER:
      return 'indigo';
    default:
      return 'muted';
  }
}

export function statusTone(status: ProductStatus | string): 'muted' | 'indigo' | 'emerald' | 'amber' | 'rose' {
  switch (status) {
    case ProductStatuses.APPROVED:
    case OrderStatuses.DELIVERED:
    case TicketStatuses.RESOLVED:
    case RfqStatuses.ACCEPTED:
    case PaymentStatuses.PAID:
      return 'emerald';
    case OrderStatuses.PENDING:
    case ProductStatuses.PENDING_APPROVAL:
    case OrderStatuses.PROCESSING:
    case TicketStatuses.IN_REVIEW:
    case RfqStatuses.UNDER_REVIEW:
    case RfqStatuses.COUNTER_OFFERED:
      return 'amber';
    case OrderStatuses.SHIPPED:
    case OrderStatuses.OUT_FOR_DELIVERY:
    case TicketStatuses.OPEN:
    case RfqStatuses.SUBMITTED:
      return 'indigo';
    case ProductStatuses.REJECTED:
    case OrderStatuses.CANCELLED:
    case PaymentStatuses.FAILED:
    case PaymentStatuses.CANCELLED:
      return 'rose';
    default:
      return 'muted';
  }
}

export function actionTone(action: string): 'muted' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'zinc' {
  const upper = action?.toUpperCase() || '';
  if (upper.includes('CANCEL') || upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('FAIL') || upper.includes('REFUND')) {
    return 'rose';
  }
  if (upper.includes('CREATE') || upper.includes('APPROVE') || upper.includes('RESOLVE') || upper.includes('SUCCESS') || upper.includes('REGISTER')) {
    return 'emerald';
  }
  if (upper.includes('UPDATE') || upper.includes('SHIP') || upper.includes('FULFILL')) {
    return 'indigo';
  }
  if (upper.includes('LOGIN') || upper.includes('AUTH')) {
    return 'amber';
  }
  return 'zinc';
}
