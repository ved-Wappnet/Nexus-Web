import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Category, Paginated, ProductStatus, ProductStatuses, ProductView, Supplier, UserRoles } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CatalogService } from '@core/services/catalog.service';
import { ProductService } from '@core/services/product.service';
import { ToastService } from '@core/services/toast.service';
import { useDebounce } from '@core/hooks/use-debounce';
import { Badge, statusTone } from '@shared/ui/badge/badge';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Modal } from '@shared/ui/modal/modal';
import { Select, SelectOption } from '@shared/ui/select/select';
import { LabelFormatPipe } from '@shared/pipes/label-format.pipe';
import {
  LucideAlertTriangle,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-product-manage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    Badge,
    EmptyState,
    Modal,
    Select,
    LabelFormatPipe,
    LucideSearch,
    LucideX,
    LucidePencil,
    LucideTrash2,
    LucidePlus,
    LucidePackage,
    LucideAlertTriangle,
  ],
  templateUrl: './product-manage.html',
})
export class ProductManage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ProductService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;

  readonly statusTone = statusTone;
  readonly statuses: ProductStatus[] = [
    ProductStatuses.DRAFT,
    ProductStatuses.PENDING_APPROVAL,
    ProductStatuses.APPROVED,
    ProductStatuses.REJECTED,
  ];
  readonly result = signal<Paginated<ProductView> | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly statusFilter = signal<ProductStatus | ''>('');
  readonly searchQuery = signal<string>('');
  readonly debouncedSearchQuery = useDebounce(this.searchQuery, 350);
  readonly page = signal(1);
  readonly modalOpen = signal(false);
  readonly step = signal(1);
  readonly editingId = signal<string | null>(null);
  readonly preview = signal<string | null>(null);
  readonly imageFile = signal<File | null>(null);
  private previewObjectUrl: string | null = null;

  // Deletion state signals
  readonly deleteConfirmOpen = signal(false);
  readonly deletingProduct = signal<ProductView | null>(null);
  readonly isDeleting = signal(false);

  readonly categoryOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Select category' },
    ...this.categories().map((c) => ({
      value: c.id,
      label: c.parentId
        ? `${this.categories().find((p) => p.id === c.parentId)?.name ?? ''} › ${c.name}`
        : c.name,
    })),
  ]);

  readonly supplierOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Select supplier' },
    ...this.suppliers().map((s) => ({ value: s.id, label: s.storeName })),
  ]);

  readonly isAdmin = computed(() => this.auth.role() === UserRoles.ADMIN);

  readonly steps = [
    { id: 1, label: 'Basics', detail: 'Title, category & price' },
    { id: 2, label: 'Media', detail: 'Product image' },
    { id: 3, label: 'Inventory', detail: 'Stock & attributes' },
  ] as const;

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', Validators.required),
    categoryId: this.fb.nonNullable.control('', Validators.required),
    supplierId: this.fb.nonNullable.control(''),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    platformFeePercent: this.fb.nonNullable.control<number>(10, [Validators.required, Validators.min(0), Validators.max(100)]),
    description: this.fb.nonNullable.control(''),
    stockQuantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    attributes: this.fb.array([this.attrGroup('color', 'graphite')]),
  });

  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly netPayoutPreview = computed(() => {
    const vals = this.formValues();
    const price = Number(vals?.price ?? 0);
    const feePct = Number(vals?.platformFeePercent ?? 10);
    const fee = Math.round((price * (feePct / 100)) * 100) / 100;
    const payout = Math.round((price - fee) * 100) / 100;
    return { price, feePct, fee, payout };
  });

  constructor() {
    this.catalog.categories().subscribe((c) => this.categories.set(c));
    this.catalog.suppliers().subscribe((s) => this.suppliers.set(s));

    effect(() => {
      const q = this.debouncedSearchQuery();
      const status = this.statusFilter();
      const page = this.page();

      this.api
        .list({
          q: q || undefined,
          status: status || undefined,
          page,
          pageSize: 8,
        })
        .subscribe((res) => this.result.set(res));
    });
  }

  get attributes(): FormArray {
    return this.form.controls.attributes;
  }

  stepMeta(id: number) {
    return this.steps.find((s) => s.id === id)!;
  }

  stepState(id: number): 'done' | 'current' | 'upcoming' {
    const current = this.step();
    if (id < current) return 'done';
    if (id === current) return 'current';
    return 'upcoming';
  }

  goToStep(id: number) {
    if (id < this.step()) this.step.set(id);
  }

  attrGroup(key = '', value = '') {
    return this.fb.nonNullable.group({
      key: [key, Validators.required],
      value: [value, Validators.required],
    });
  }

  load() {
    this.api
      .list({
        q: this.searchQuery() || undefined,
        status: this.statusFilter() || undefined,
        page: this.page(),
        pageSize: 8,
      })
      .subscribe((res) => this.result.set(res));
  }

  onSearch(event: Event) {
    const q = (event.target as HTMLInputElement).value;
    this.searchQuery.set(q);
    this.page.set(1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.page.set(1);
  }

  setStatus(status: ProductStatus | '') {
    this.statusFilter.set(status);
    this.page.set(1);
    this.load();
  }

  confirmDelete(product: ProductView) {
    this.deletingProduct.set(product);
    this.deleteConfirmOpen.set(true);
  }

  executeDelete() {
    const prod = this.deletingProduct();
    if (!prod) return;
    this.isDeleting.set(true);
    this.api.delete(prod.id).subscribe({
      next: (res) => {
        this.isDeleting.set(false);
        this.deleteConfirmOpen.set(false);
        this.deletingProduct.set(null);
        this.toast.success(res?.message || 'Product deleted successfully');
        this.load();
      },
      error: (err) => {
        this.isDeleting.set(false);
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Unable to delete product');
      },
    });
  }

  go(page: number) {
    this.page.set(page);
    this.load();
  }

  pages(): number[] {
    const total = this.result()?.total ?? 0;
    return Array.from({ length: Math.max(1, Math.ceil(total / 8)) }, (_, i) => i + 1);
  }

  toggleStock(product: ProductView) {
    const next = product.stockQuantity > 0 ? 0 : 12;
    this.api.setStock(product.id, next).subscribe({
      next: () => {
        this.toast.success(next === 0 ? 'Marked out of stock' : 'Restocked');
        this.load();
      },
      error: () => this.toast.error('Stock update denied'),
    });
  }

  openCreate() {
    this.editingId.set(null);
    this.step.set(1);
    this.clearImage();
    this.form.reset({
      title: '',
      categoryId: '',
      supplierId: '',
      price: null,
      platformFeePercent: 10,
      description: '',
      stockQuantity: null,
    });
    this.setSupplierValidators(true);
    this.attributes.clear();
    this.attributes.push(this.attrGroup('color', 'graphite'));
    this.modalOpen.set(true);
  }

  openEdit(product: ProductView) {
    this.editingId.set(product.id);
    this.step.set(1);
    this.clearImage();
    this.preview.set(product.images[0]?.url ?? null);
    this.form.reset({
      title: product.title,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      price: product.price,
      platformFeePercent: product.platformFeePercent ?? 10,
      description: product.description,
      stockQuantity: product.stockQuantity,
    });
    this.setSupplierValidators(false);
    this.attributes.clear();
    for (const [key, value] of Object.entries(product.attributes)) {
      this.attributes.push(this.attrGroup(key, String(value)));
    }
    this.modalOpen.set(true);
  }

  private setSupplierValidators(required: boolean) {
    const control = this.form.controls.supplierId;
    if (required && this.isAdmin()) {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity();
  }

  addAttr() {
    this.attributes.push(this.attrGroup());
  }

  removeAttr(i: number) {
    this.attributes.removeAt(i);
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.clearImage(false);
    this.imageFile.set(file);
    this.previewObjectUrl = URL.createObjectURL(file);
    this.preview.set(this.previewObjectUrl);
  }

  private clearImage(resetPreview = true) {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.imageFile.set(null);
    if (resetPreview) this.preview.set(null);
  }

  next() {
    if (this.step() === 1) {
      this.form.controls.title.markAsTouched();
      this.form.controls.categoryId.markAsTouched();
      this.form.controls.price.markAsTouched();
      if (this.isAdmin() && !this.editingId()) {
        this.form.controls.supplierId.markAsTouched();
      }
      if (
        this.form.controls.title.invalid ||
        this.form.controls.categoryId.invalid ||
        this.form.controls.price.invalid ||
        (this.isAdmin() && !this.editingId() && this.form.controls.supplierId.invalid)
      ) {
        this.toast.error(
          this.isAdmin() && !this.editingId()
            ? 'Fill in title, supplier, category, and price'
            : 'Fill in title, category, and price',
        );
        return;
      }
    }
    this.step.update((s) => Math.min(3, s + 1));
  }

  back() {
    this.step.update((s) => Math.max(1, s - 1));
  }

  save() {
    this.form.controls.stockQuantity.markAsTouched();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Complete required fields before saving');
      return;
    }
    const v = this.form.getRawValue();
    const attributes: Record<string, string> = {};
    for (const row of v.attributes) attributes[row.key] = row.value;
    const payload = {
      title: v.title,
      categoryId: v.categoryId,
      price: Number(v.price),
      platformFeePercent: Number(v.platformFeePercent ?? 10),
      description: v.description,
      stockQuantity: Number(v.stockQuantity),
      attributes,
      ...(this.isAdmin() && v.supplierId ? { supplierId: v.supplierId } : {}),
    };
    const id = this.editingId();
    const image = this.imageFile();
    const req = id ? this.api.update(id, payload, image) : this.api.create(payload, image);
    req.subscribe({
      next: () => {
        this.toast.success(id ? 'Product updated' : 'Submitted for approval');
        this.modalOpen.set(false);
        this.clearImage();
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.toast.error(typeof msg === 'string' ? msg : 'Unable to save product');
      },
    });
  }

  canEdit(): boolean {
    const role = this.auth.role();
    return role === UserRoles.ADMIN || role === UserRoles.SUPPLIER;
  }

  attrCtrl(i: number, name: 'key' | 'value'): FormControl<string> {
    return this.attributes.at(i).get(name) as FormControl<string>;
  }
}
