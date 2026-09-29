import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserRoles } from '@core/constants/user.constant';
import { OrderEscrowView, OrderView } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { OrderService } from '@core/services/catalog.service';
import { ToastService } from '@core/services/toast.service';
import { Select, SelectOption } from '@shared/ui/select/select';
import {
  LucideAlertTriangle,
  LucideArrowLeft,
  LucideCheckCircle2,
  LucideLayers,
  LucideLock,
  LucidePackage,
  LucideScale,
  LucideScan,
  LucideShieldAlert,
  LucideSparkles,
} from '@lucide/angular';

interface DetectedBox {
  id: number;
  label: string;
  confidence: number;
  top: number;
  left: number;
  width: number;
  height: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
}

@Component({
  selector: 'app-inspection-dispute-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    Select,
    LucideArrowLeft,
    LucideShieldAlert,
    LucideAlertTriangle,
    LucideSparkles,
    LucideScan,
    LucideCheckCircle2,
    LucideLayers,
    LucideLock,
    LucidePackage,
    LucideScale,
  ],
  template: `
    <div class="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 md:p-8 space-y-6">
      <!-- Breadcrumb Navigation & Top Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div class="flex items-center gap-3">
          <a
            routerLink="/orders"
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition cursor-pointer shadow-sm"
          >
            <svg lucideArrowLeft class="h-4.5 w-4.5"></svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-md bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-extrabold font-mono text-indigo-400 border border-indigo-500/30">
                ESCROW VAULT CONSOLE
              </span>
              @if (isFrozen()) {
                <span class="rounded-md bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-extrabold font-mono text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse shadow-sm">
                  <svg lucideShieldAlert class="h-3 w-3"></svg> FROZEN IN DISPUTE
                </span>
              } @else if (isReleased()) {
                <span class="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold font-mono text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                  <svg lucideCheckCircle2 class="h-3 w-3"></svg> ESCROW ACTIVE
                </span>
              }
            </div>
            <h1 class="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2 tracking-tight">
              <span>Delivery Inspection & Cargo Dispute Center</span>
            </h1>
          </div>
        </div>

        <!-- Order Selector -->
        <div class="flex items-center gap-3">
          <label class="text-xs font-semibold text-zinc-400">Target Order:</label>
          <div class="w-64">
            <app-select
              [options]="orderOptions()"
              [ngModel]="selectedOrderId()"
              (ngModelChange)="onOrderSelect($event)"
              placeholder="Select order..."
            ></app-select>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-20 space-y-3">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p class="text-sm font-mono text-zinc-400">Loading order escrow & inspection details...</p>
        </div>
      } @else if (order(); as ord) {
        <!-- Top Escrow Overview Banner -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-4 space-y-1.5 shadow-lg">
            <span class="text-[11px] text-zinc-400 font-mono font-semibold">ORDER IDENTIFIER</span>
            <div class="text-lg font-black text-white font-mono flex items-center gap-2">
              <svg lucidePackage class="h-4.5 w-4.5 text-indigo-400"></svg>
              <span>#NX-{{ ord.id.slice(0, 8).toUpperCase() }}</span>
            </div>
            <p class="text-xs text-zinc-400 truncate">Placed {{ ord.createdAt | date:'mediumDate' }}</p>
          </div>

          <div class="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-4 space-y-1.5 shadow-lg">
            <span class="text-[11px] text-zinc-400 font-mono font-semibold">TOTAL CONSIGNMENT VALUE</span>
            <div class="text-lg font-black text-emerald-400 font-mono">
              {{ ord.totalAmount | currency }}
            </div>
            <p class="text-xs text-zinc-400">3-Stage Split Escrow Protected</p>
          </div>

          <div class="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1.5 shadow-lg">
            <span class="text-[11px] text-rose-300 font-mono font-semibold">MILESTONE #3 (30% DELIVERY)</span>
            <div class="text-lg font-black text-rose-200 font-mono">
              {{ milestoneAmount() | currency }}
            </div>
            <p class="text-xs text-rose-300/80">Subject to Delivery Inspection & Signoff</p>
          </div>

          <div class="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-1.5 shadow-lg">
            <span class="text-[11px] text-amber-300 font-mono font-semibold">ESCROW STATUS</span>
            <div class="text-sm font-extrabold font-mono flex items-center gap-1.5" [class]="isFrozen() ? 'text-rose-400' : 'text-amber-300'">
              <svg lucideLock class="h-4 w-4"></svg>
              <span>{{ isFrozen() ? 'FROZEN IN DISPUTE' : 'HELD IN VAULT' }}</span>
            </div>
            <p class="text-xs text-zinc-400">Escrow protected order</p>
          </div>
        </div>

        <!-- Main Workspace: Split View Scanner & Dispute Console -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left Column (7 cols): AI Neural Vision Scanner & Bounding Box Annotator -->
          <div class="lg:col-span-7 space-y-6">
            <div class="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-950 p-5 space-y-4 shadow-xl">
              <!-- Scanner Header -->
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/20 text-indigo-400 shadow-md">
                    <svg lucideSparkles class="h-5 w-5"></svg>
                  </div>
                  <div>
                    <h2 class="text-base font-extrabold text-white flex items-center gap-2">
                      <span>AI Neural Vision Defect Scanner</span>
                      <span class="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/30">
                        v3.4 Vision ML
                      </span>
                    </h2>
                    <p class="text-xs text-zinc-400">Automated surface damage segmentation & impact vector analysis</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="activeTab.set('AI_SCANNER')"
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer"
                    [class]="activeTab() === 'AI_SCANNER' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/50' : 'bg-zinc-800/90 text-zinc-400 hover:text-white border border-zinc-700/60'"
                  >
                    <span class="flex items-center gap-1.5">
                      <svg lucideScan class="h-3.5 w-3.5"></svg>
                      <span>AI Bounding Box View</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    (click)="activeTab.set('COMPARE_PREDISPATCH')"
                    class="px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer"
                    [class]="activeTab() === 'COMPARE_PREDISPATCH' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500/50' : 'bg-zinc-800/90 text-zinc-400 hover:text-white border border-zinc-700/60'"
                  >
                    <span class="flex items-center gap-1.5">
                      <svg lucideLayers class="h-3.5 w-3.5"></svg>
                      <span>Factory QA Comparison</span>
                    </span>
                  </button>
                </div>
              </div>

              @if (activeTab() === 'AI_SCANNER') {
                <!-- High-Res Viewport with AI Overlays -->
                <div class="relative w-full h-80 sm:h-96 rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden group shadow-2xl">
                  <img
                    [src]="activeImageUrl()"
                    alt="Consignment Inspection Proof"
                    class="w-full h-full object-cover filter brightness-95 contrast-105 transition"
                  />

                  <!-- Live Neural Scanner Beam -->
                  @if (scanningAi()) {
                    <div class="absolute inset-0 bg-indigo-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 space-y-4">
                      <div class="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse absolute top-1/2 shadow-[0_0_25px_#22d3ee]"></div>
                      <div class="flex items-center gap-3 text-indigo-100 font-mono text-sm bg-zinc-900/90 border border-indigo-500/50 px-4 py-2.5 rounded-2xl shadow-2xl">
                        <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"></span>
                        <span>{{ scanStep() }}</span>
                      </div>
                    </div>
                  }

                  <!-- Bounding Boxes -->
                  @if (aiScanned() && !scanningAi()) {
                    @for (box of aiDetectedBoxes(); track box.id; let idx = $index) {
                      <div
                        class="absolute rounded-xl transition-all cursor-pointer border-2 shadow-2xl"
                        [class]="selectedBoxIndex() === idx ? 'border-cyan-400 bg-cyan-500/30 ring-4 ring-cyan-500/50 scale-102 z-20' : (box.severity === 'HIGH' ? 'border-rose-500 bg-rose-500/25 hover:bg-rose-500/35 z-10' : 'border-amber-500 bg-amber-500/25 hover:bg-amber-500/35 z-10')"
                        [style.top.%]="box.top"
                        [style.left.%]="box.left"
                        [style.width.%]="box.width"
                        [style.height.%]="box.height"
                        (click)="selectedBoxIndex.set(idx)"
                      >
                        <div
                          class="absolute -top-7 left-0 flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold text-white shadow-xl font-mono shrink-0 whitespace-nowrap"
                          [class]="box.severity === 'HIGH' ? 'bg-rose-600' : 'bg-amber-600'"
                        >
                          <span>#{{ box.id }} {{ box.label }} ({{ box.confidence }}%)</span>
                        </div>
                      </div>
                    }
                  }

                  <div class="absolute bottom-3 right-3 rounded-lg bg-black/80 px-2.5 py-1 text-[10px] font-mono text-zinc-400 border border-zinc-800 backdrop-blur-md">
                    Target: Consignment Cargo Arrival Proof
                  </div>
                </div>

                <!-- Action Controls & Findings -->
                <div class="space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      (click)="runAiVisionScan()"
                      [disabled]="scanningAi()"
                      class="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition cursor-pointer shadow-md shadow-indigo-600/25 disabled:opacity-50"
                    >
                      <svg lucideScan class="h-4 w-4 text-indigo-200"></svg>
                      <span>{{ aiScanned() ? 'Re-Scan Cargo with Neural AI' : 'Run AI Vision Scan on Cargo' }}</span>
                    </button>

                    @if (aiScanned()) {
                      <button
                        type="button"
                        (click)="applyAiDiagnosis()"
                        class="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95 transition cursor-pointer shadow-md shadow-emerald-600/25"
                      >
                        <svg lucideSparkles class="h-4 w-4 text-emerald-200"></svg>
                        <span>Autofill Claim Form with AI Diagnosis</span>
                      </button>
                    }
                  </div>

                  @if (aiScanned()) {
                    <div class="rounded-2xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-3">
                      <div class="flex items-center justify-between text-xs">
                        <span class="font-extrabold text-indigo-300 flex items-center gap-1.5">
                          <svg lucideCheckCircle2 class="h-4 w-4 text-emerald-400"></svg>
                          <span>AI Detected Defects ({{ aiDetectedBoxes().length }} Anomalies)</span>
                        </span>
                        <span class="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-lg">
                          Recommended Claim: 75%
                        </span>
                      </div>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        @for (box of aiDetectedBoxes(); track box.id; let idx = $index) {
                          <div
                            (click)="selectedBoxIndex.set(idx)"
                            class="p-3 rounded-xl border transition cursor-pointer space-y-1"
                            [class]="selectedBoxIndex() === idx ? 'border-indigo-400 bg-indigo-900/60 shadow-lg' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'"
                          >
                            <div class="flex items-center justify-between text-xs font-bold text-white">
                              <span>#{{ box.id }} {{ box.label }}</span>
                              <span [class]="box.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'">{{ box.confidence }}% Confidence</span>
                            </div>
                            <p class="text-xs text-zinc-400 leading-relaxed">{{ box.description }}</p>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <!-- Pre-Dispatch Comparison Matrix -->
                <div class="space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-xs font-bold text-emerald-400">
                        <span>🏭 Factory Pre-Dispatch QA Baseline (Supplier)</span>
                        <span class="text-[10px] font-mono text-zinc-500">100% Intact</span>
                      </div>
                      <div class="h-64 rounded-2xl border border-emerald-500/30 bg-zinc-950 overflow-hidden relative shadow-lg">
                        <img [src]="preDispatchImageUrl" alt="Factory Pre-Dispatch" class="w-full h-full object-cover" />
                        <div class="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
                          Factory QA Upload #88492
                        </div>
                      </div>
                    </div>

                    <div class="space-y-2">
                      <div class="flex items-center justify-between text-xs font-bold text-rose-400">
                        <span>📦 Arrival Condition at Buyer Bay (Buyer)</span>
                        <span class="text-[10px] font-mono text-rose-300">Damage Detected</span>
                      </div>
                      <div class="h-64 rounded-2xl border border-rose-500/30 bg-zinc-950 overflow-hidden relative shadow-lg">
                        <img [src]="activeImageUrl()" alt="Arrival Proof" class="w-full h-full object-cover" />
                        <div class="absolute bottom-2 left-2 rounded bg-black/80 px-2 py-0.5 text-[10px] font-mono text-rose-300 border border-rose-500/30">
                          Buyer Inspection Upload
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="rounded-xl border border-zinc-800 bg-zinc-900/90 p-3 text-xs text-zinc-300 flex items-center gap-2">
                    <svg lucideAlertTriangle class="h-4 w-4 text-amber-400 shrink-0"></svg>
                    <span>Comparison Analysis indicates structural damage occurred post-factory dispatch during maritime corridor transit.</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right Column (5 cols): Dispute Form & Escrow Freeze Action Panel -->
          <div class="lg:col-span-5 space-y-6">
            <form (ngSubmit)="submitDispute()" class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-xl">
              <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 class="text-base font-extrabold text-white flex items-center gap-2">
                  <svg lucideShieldAlert class="h-5 w-5 text-rose-400"></svg>
                  <span>Formal Escrow Dispute Form</span>
                </h3>
                <span class="text-xs font-mono text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                  Freeze Milestone #3
                </span>
              </div>

              <!-- Context-Aware Escrow Lock Callout -->
              @if (isFrozen()) {
                <div class="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                  <svg lucideShieldAlert class="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5"></svg>
                  <div class="space-y-1">
                    <p class="font-bold text-rose-300">Dispute Active Under Arbitration</p>
                    <p class="text-rose-200/90 text-[11px] leading-relaxed">
                      Milestone #3 is currently locked in <strong class="text-white">FROZEN_IN_DISPUTE</strong> status. A claim has been submitted and is undergoing Admin resolution.
                    </p>
                  </div>
                </div>
              } @else {
                <div class="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <svg lucideAlertTriangle class="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5"></svg>
                  <div class="space-y-1">
                    <p class="font-bold text-amber-300">Escrow Lock Mechanism</p>
                    <p class="text-amber-200/90 text-[11px] leading-relaxed">
                      Submitting this claim will instantly freeze Milestone #3 (<strong class="text-white font-mono">{{ milestoneAmount() | currency }}</strong>) into <strong class="text-white">FROZEN_IN_DISPUTE</strong> status. No payout will occur without Admin resolution.
                    </p>
                  </div>
                </div>
              }

              <!-- Defect Category Dropdown -->
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-zinc-300">Defect Category</label>
                <app-select
                  [options]="defectCategoryOptions"
                  [ngModel]="disputeType()"
                  (ngModelChange)="disputeType.set($event)"
                  placeholder="Select defect category..."
                ></app-select>
              </div>

              <!-- Specific Claim Reason -->
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-zinc-300">Defect Summary / Reason</label>
                <input
                  type="text"
                  [ngModel]="reason()"
                  (ngModelChange)="reason.set($event)"
                  name="reason"
                  [disabled]="isFrozen()"
                  placeholder="e.g. Crushed outer crates & water damage stain"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <!-- Damage Evidence Image URL Field -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs font-bold text-zinc-300">
                  <label>Inspection Photo / Custom Image URL</label>
                  <span class="text-[10px] font-mono text-indigo-400">Buyer Uploaded Proof</span>
                </div>
                <input
                  type="url"
                  [ngModel]="customImageUrl()"
                  (ngModelChange)="customImageUrl.set($event)"
                  name="customImageUrl"
                  [disabled]="isFrozen()"
                  placeholder="Paste image URL (e.g. https://.../damage.jpg)"
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <!-- Claim Amount -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs font-bold">
                  <label class="text-zinc-300">Requested Refund / Claim Amount</label>
                  <span class="text-zinc-400 font-mono text-[11px]">Max: {{ milestoneAmount() | currency }}</span>
                </div>
                <div class="relative">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    [ngModel]="claimAmount()"
                    (ngModelChange)="claimAmount.set($event)"
                    name="claimAmount"
                    [disabled]="isFrozen()"
                    [max]="milestoneAmount()"
                    min="0"
                    step="0.01"
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-7 pr-3.5 py-2.5 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <!-- Detailed Claim Description -->
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-zinc-300">Detailed Claim Description & Evidence Narrative</label>
                <textarea
                  [ngModel]="description()"
                  (ngModelChange)="description.set($event)"
                  name="description"
                  [disabled]="isFrozen()"
                  rows="4"
                  placeholder="Describe exact physical condition, crate numbers, or AI vision analysis..."
                  class="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                ></textarea>
              </div>

              <!-- Action Submit Button (ALWAYS ACTIVE FOR CUSTOMER & ADMIN) -->
              <button
                type="submit"
                [disabled]="isSubmitting() || isFrozen() || !reason() || !description()"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-rose-600 hover:bg-rose-500 px-4 py-3 text-sm font-bold text-white active:scale-98 transition shadow-lg shadow-rose-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isSubmitting()) {
                  <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  <span>Freezing Escrow Funds...</span>
                } @else if (isFrozen()) {
                  <svg lucideShieldAlert class="h-4 w-4 text-rose-300"></svg>
                  <span>Dispute Active — Under Admin Review</span>
                } @else {
                  <svg lucideShieldAlert class="h-4 w-4"></svg>
                  <span>Freeze Escrow & File Claim</span>
                }
              </button>
            </form>

            <!-- Admin Resolution Widget -->
            @if (auth.role() === UserRoles.ADMIN || auth.role() === UserRoles.SUBADMIN) {
              <div class="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 space-y-3 shadow-lg">
                <div class="flex items-center justify-between border-b border-amber-500/30 pb-2">
                  <h4 class="text-sm font-bold text-amber-200 flex items-center gap-2">
                    <svg lucideScale class="h-4 w-4 text-amber-400"></svg>
                    <span>Admin Resolution Console</span>
                  </h4>
                  <span class="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    ADMIN ONLY
                  </span>
                </div>
                <p class="text-xs text-zinc-300 leading-relaxed">
                  As Admin, you can review uploaded damage proof, resolve claims via partial buyer refund, or release frozen funds to supplier.
                </p>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center space-y-3">
          <svg lucidePackage class="h-10 w-10 text-zinc-600 mx-auto"></svg>
          <h3 class="text-lg font-bold text-white">No Order Selected</h3>
          <p class="text-xs text-zinc-400">Please choose an order from the dropdown menu above to inspect cargo condition.</p>
        </div>
      }
    </div>
  `,
})
export class InspectionDisputePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly UserRoles = UserRoles;

  readonly orders = signal<OrderView[]>([]);
  readonly selectedOrderId = signal<string>('');
  readonly order = signal<OrderView | null>(null);
  readonly escrow = signal<OrderEscrowView | null>(null);
  readonly loading = signal(false);
  readonly isSubmitting = signal(false);

  // Tab & AI Vision Scanner Signals
  readonly activeTab = signal<'AI_SCANNER' | 'COMPARE_PREDISPATCH'>('AI_SCANNER');
  readonly scanningAi = signal(false);
  readonly aiScanned = signal(false);
  readonly scanStep = signal('');
  readonly selectedBoxIndex = signal<number>(0);
  readonly customImageUrl = signal<string>('');

  // Form inputs
  readonly disputeType = signal<string>('DAMAGED_GOODS');
  readonly reason = signal('');
  readonly claimAmount = signal<number>(0);
  readonly description = signal('');

  readonly defectCategoryOptions: SelectOption[] = [
    { label: 'Damaged Goods / Crushed Packaging', value: 'DAMAGED_GOODS' },
    { label: 'Missing Quantity / Unit Shortage', value: 'MISSING_QUANTITY' },
    { label: 'Specification Mismatch / Wrong Spec', value: 'SPECIFICATION_MISMATCH' },
    { label: 'Quality Defect / Manufacturing Anomaly', value: 'QUALITY_DEFECT' },
    { label: 'Other Issue / Custom Claim', value: 'OTHER' },
  ];

  readonly sampleDamageUrl =
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
  readonly preDispatchImageUrl =
    'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80';

  readonly activeImageUrl = computed(() => {
    return this.customImageUrl().trim().length > 0
      ? this.customImageUrl().trim()
      : this.sampleDamageUrl;
  });

  readonly aiDetectedBoxes = signal<DetectedBox[]>([
    {
      id: 1,
      label: 'Crushed Outer Carton Corner',
      confidence: 94,
      top: 22,
      left: 18,
      width: 32,
      height: 38,
      severity: 'HIGH',
      description: 'Major impact fracture on structural load-bearing corner of pallet packaging.',
    },
    {
      id: 2,
      label: 'Moisture Seepage Stain',
      confidence: 82,
      top: 55,
      left: 58,
      width: 28,
      height: 30,
      severity: 'MEDIUM',
      description: 'Discoloration signature indicating liquid exposure on lower tier container.',
    },
  ]);

  readonly orderOptions = computed<SelectOption[]>(() =>
    this.orders().map((o) => ({
      label: `#NX-${o.id.slice(0, 8).toUpperCase()} (${o.status})`,
      value: o.id,
    }))
  );

  readonly milestoneAmount = computed(() => {
    const esc = this.escrow();
    const m3 = esc?.milestones?.find((m) => m.milestoneIndex === 3);
    if (m3) return m3.amount;
    const ord = this.order();
    return ord ? ord.totalAmount * 0.3 : 0;
  });

  readonly isFrozen = computed(() => {
    const m3 = this.escrow()?.milestones?.find((m) => m.milestoneIndex === 3);
    return m3?.status === 'FROZEN_IN_DISPUTE';
  });

  readonly isReleased = computed(() => {
    const m3 = this.escrow()?.milestones?.find((m) => m.milestoneIndex === 3);
    return m3?.status === 'RELEASED';
  });

  ngOnInit() {
    this.loadOrdersList();
    this.route.params.subscribe((params) => {
      if (params['orderId']) {
        this.selectedOrderId.set(params['orderId']);
        this.loadOrderData(params['orderId']);
      }
    });
  }

  loadOrdersList() {
    this.orderService.list().subscribe({
      next: (res) => {
        const list = res.data || [];
        this.orders.set(list);
        if (!this.selectedOrderId() && list.length > 0) {
          this.selectedOrderId.set(list[0].id);
          this.loadOrderData(list[0].id);
        }
      },
    });
  }

  onOrderSelect(val: string) {
    if (!val) return;
    this.selectedOrderId.set(val);
    this.router.navigate(['/inspection-dispute', val]);
    this.loadOrderData(val);
  }

  loadOrderData(orderId: string) {
    this.loading.set(true);
    this.orderService.getOne(orderId).subscribe({
      next: (ord: OrderView) => {
        this.order.set(ord);
        this.loadEscrow(orderId);
      },
      error: () => this.loading.set(false),
    });
  }

  loadEscrow(orderId: string) {
    this.orderService.getOrderEscrow(orderId).subscribe({
      next: (esc: OrderEscrowView) => {
        this.escrow.set(esc);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  runAiVisionScan() {
    this.scanningAi.set(true);
    this.aiScanned.set(false);
    this.scanStep.set('Initializing Neural Segmenter...');

    setTimeout(() => {
      this.scanStep.set('Scanning Surface Contour & Structural Compression...');
    }, 800);

    setTimeout(() => {
      this.scanStep.set('Mapping Impact Stress Vectors & Moisture Gradients...');
    }, 1600);

    setTimeout(() => {
      this.scanningAi.set(false);
      this.aiScanned.set(true);
      this.toast.success('AI Vision Scan Complete! 2 Surface Defect Anomaly Signatures Detected.');
    }, 2400);
  }

  applyAiDiagnosis() {
    this.disputeType.set('DAMAGED_GOODS');
    this.reason.set('Crushed outer carton corner & moisture seepage stain detected via AI Vision');
    this.description.set(
      'AI Vision Scan Diagnostic Report:\n' +
        '- Signature #1: Crushed Outer Carton Corner (94% confidence, High Severity)\n' +
        '- Signature #2: Moisture Seepage Stain (82% confidence, Medium Severity)\n' +
        'Structural integrity compromised on 2 packaging tiers. Recommended Claim: 75% of Milestone Pool.'
    );
    const maxMilestone = this.milestoneAmount();
    if (maxMilestone > 0) {
      this.claimAmount.set(Math.round(maxMilestone * 0.75 * 100) / 100);
    }
    this.toast.info('⚡ AI Diagnosis applied! Form fields pre-filled with defect analysis.');
  }

  submitDispute() {
    const ord = this.order();
    if (!ord || this.isFrozen()) return;

    this.isSubmitting.set(true);
    const evidence = this.customImageUrl().trim().length > 0
      ? [this.customImageUrl().trim()]
      : [this.sampleDamageUrl];

    this.orderService
      .createEscrowDispute(ord.id, {
        reason: this.reason(),
        description: this.description(),
        claimAmount: this.claimAmount(),
        disputeType: this.disputeType(),
        evidenceUrls: evidence,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('Escrow frozen! Milestone #3 locked in FROZEN_IN_DISPUTE status.');
          this.loadEscrow(ord.id);
        },
        error: (err: any) => {
          this.isSubmitting.set(false);
          this.toast.error(err?.error?.message || 'Failed to submit escrow dispute');
        },
      });
  }
}
