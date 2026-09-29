import { DatePipe, JsonPipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { useDebounce } from '@core/hooks/use-debounce';
import { AuditLogItem, AuditService, AuditStats } from '@core/services/audit.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideCalendar,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCopy,
  LucideDatabase,
  LucideDownload,
  LucideEye,
  LucideHistory,
  LucideRefreshCw,
  LucideSearch,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import { Badge, actionTone } from '@shared/ui/badge/badge';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Loader } from '@shared/ui/loader/loader';
import { Modal } from '@shared/ui/modal/modal';
import { StatCard } from '@shared/ui/stat-card/stat-card';

@Component({
  selector: 'app-audit-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    JsonPipe,
    SlicePipe,
    LabelFormatPipe,
    Badge,
    Loader,
    EmptyState,
    Modal,
    StatCard,
    LucideSearch,
    LucideChevronLeft,
    LucideChevronRight,
    LucideHistory,
    LucideUser,
    LucideDatabase,
    LucideCalendar,
    LucideRefreshCw,
    LucideDownload,
    LucideEye,
    LucideCopy,
    LucideCheck,
    LucideX,
  ],
  templateUrl: './audit-list.html',
})
export class AuditList {
  private readonly auditService = inject(AuditService);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly debouncedSearch = useDebounce(this.searchQuery, 350);

  readonly selectedEntity = signal<string>('ALL');
  readonly selectedAction = signal<string>('ALL');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(15);

  readonly loading = signal(true);
  readonly logs = signal<AuditLogItem[]>([]);
  readonly stats = signal<AuditStats | null>(null);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  readonly isExporting = signal(false);
  readonly selectedLog = signal<AuditLogItem | null>(null);
  readonly detailModalOpen = signal(false);
  readonly copiedMetadata = signal(false);

  readonly actionTone = actionTone;

  readonly entityOptions = [
    { label: 'All Entities', value: 'ALL' },
    { label: 'Orders', value: 'orders' },
    { label: 'Products', value: 'products' },
    { label: 'Users & Auth', value: 'users' },
    { label: 'RFQ Quotes', value: 'quotes' },
    { label: 'Support Tickets', value: 'tickets' },
  ];

  readonly actionOptions = [
    { label: 'All Actions', value: 'ALL' },
    { label: 'Created Events', value: '_CREATED' },
    { label: 'Updated Events', value: '_UPDATED' },
    { label: 'Deleted Events', value: '_DELETED' },
    { label: 'Auth & Login', value: 'LOGIN' },
    { label: 'Reviewed Events', value: '_REVIEWED' },
  ];

  constructor() {
    this.fetchStats();

    effect(() => {
      const q = this.debouncedSearch();
      const entity = this.selectedEntity();
      const action = this.selectedAction();
      const start = this.startDate();
      const end = this.endDate();
      const page = this.currentPage();
      const limit = this.pageSize();

      this.fetchLogs(q, entity, action, start, end, page, limit);
    });
  }

  fetchStats() {
    this.auditService.getStats().subscribe({
      next: (res) => this.stats.set(res),
      error: () => {},
    });
  }

  fetchLogs(
    q?: string,
    entity?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 15,
  ) {
    this.loading.set(true);
    this.auditService
      .getAuditLogs({
        q,
        entity,
        action,
        startDate,
        endDate,
        page,
        limit,
      })
      .subscribe({
        next: (res) => {
          this.logs.set(res.data);
          this.totalItems.set(res.total);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load audit logs.');
        },
      });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  selectEntity(value: string) {
    this.selectedEntity.set(value);
    this.currentPage.set(1);
  }

  selectAction(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedAction.set(value);
    this.currentPage.set(1);
  }

  onStartDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.startDate.set(value);
    this.currentPage.set(1);
  }

  onEndDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.endDate.set(value);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedEntity.set('ALL');
    this.selectedAction.set('ALL');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return (
      Boolean(this.searchQuery().trim()) ||
      this.selectedEntity() !== 'ALL' ||
      this.selectedAction() !== 'ALL' ||
      Boolean(this.startDate()) ||
      Boolean(this.endDate())
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  refresh() {
    this.fetchStats();
    this.fetchLogs(
      this.debouncedSearch(),
      this.selectedEntity(),
      this.selectedAction(),
      this.startDate(),
      this.endDate(),
      this.currentPage(),
      this.pageSize(),
    );
  }

  openDetail(log: AuditLogItem) {
    this.selectedLog.set(log);
    this.copiedMetadata.set(false);
    this.detailModalOpen.set(true);
  }

  closeDetail() {
    this.detailModalOpen.set(false);
    this.selectedLog.set(null);
  }

  copyMetadata() {
    const metadata = this.selectedLog()?.metadata;
    if (!metadata) return;

    const formatted = JSON.stringify(metadata, null, 2);
    navigator.clipboard.writeText(formatted).then(() => {
      this.copiedMetadata.set(true);
      this.toast.success('Metadata copied to clipboard!');
      setTimeout(() => this.copiedMetadata.set(false), 2000);
    });
  }

  hasMetadataKeys(metadata: Record<string, any> | null | undefined): boolean {
    return Boolean(metadata && Object.keys(metadata).length > 0);
  }

  downloadCsv() {
    if (this.isExporting()) return;
    this.isExporting.set(true);

    this.auditService
      .exportCsv({
        q: this.debouncedSearch(),
        entity: this.selectedEntity(),
        action: this.selectedAction(),
        startDate: this.startDate(),
        endDate: this.endDate(),
      })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
          a.href = url;
          a.download = `nexus-audit-logs-${timestamp}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.isExporting.set(false);
          this.toast.success('Audit log export downloaded successfully.');
        },
        error: () => {
          this.isExporting.set(false);
          this.toast.error('Failed to export audit logs.');
        },
      });
  }
}
