import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category } from '@core/models';
import { CatalogService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Modal } from '@shared/ui/modal/modal';
import { Select, SelectOption } from '@shared/ui/select/select';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, EmptyState, Modal, Select],
  templateUrl: './categories.html',
})
export class Categories {
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly categories = signal<Category[]>([]);
  readonly modalOpen = signal(false);
  readonly saving = signal(false);

  readonly roots = computed(() => this.categories().filter((c) => !c.parentId));

  readonly parentOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'None (root category)' },
    ...this.roots().map((c) => ({ value: c.id, label: c.name })),
  ]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    parentId: [''],
  });

  constructor() {
    this.load();
  }

  load() {
    this.catalog.categories().subscribe({
      next: (list) => this.categories.set(list),
      error: () => this.toast.error('Could not load categories'),
    });
  }

  parentName(id: string | null): string {
    if (!id) return '—';
    return this.categories().find((c) => c.id === id)?.name ?? '—';
  }

  childrenOf(id: string): Category[] {
    return this.categories().filter((c) => c.parentId === id);
  }

  openCreate() {
    this.form.reset({ name: '', slug: '', parentId: '' });
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
  }

  submit() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    this.catalog
      .createCategory({
        name: v.name.trim(),
        slug: v.slug.trim() || undefined,
        parentId: v.parentId || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Category created');
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          const msg = err?.error?.message;
          this.toast.error(typeof msg === 'string' ? msg : 'Could not create category');
        },
      });
  }
}
