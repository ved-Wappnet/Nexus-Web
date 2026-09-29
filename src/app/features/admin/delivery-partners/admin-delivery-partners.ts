import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DeliveryPartnerDocument,
  DeliveryPartnerProfile,
  DeliveryPartnerVerificationStatus,
  DeliveryPartnerVerificationStatuses,
} from '@core/models';
import {
  AdminFleetResponse,
  DeliveryPartnerService,
} from '@core/services/delivery-partner.service';
import { OrderSocketService } from '@core/services/order-socket.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideAlertTriangle,
  LucideCheck,
  LucideClock,
  LucideExternalLink,
  LucideEye,
  LucideMapPin,
  LucideRefreshCw,
  LucideSearch,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideTruck,
  LucideUserX,
  LucideX,
} from '@lucide/angular';

@Component({
  selector: 'app-admin-delivery-partners',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideTruck,
    LucideShieldCheck,
    LucideShieldAlert,
    LucideClock,
    LucideSearch,
    LucideMapPin,
    LucideRefreshCw,
    LucideExternalLink,
    LucideEye,
    LucideCheck,
    LucideX,
    LucideUserX,
    LucideAlertTriangle,
  ],
  template: `
    <div class="space-y-6 pb-12">
      <!-- 🚚 Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
            <svg lucideTruck class="h-3.5 w-3.5"></svg>
            <span>Logistics Dispatch & Courier Governance</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Delivery Partner Fleet & Verification
          </h1>
          <p class="text-xs text-zinc-400 mt-1">
            Review partner registrations, inspect KYC credentials (DL, RC, ID), and approve drivers for regional order dispatches.
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <div class="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>

          <a
            routerLink="/delivery-partner"
            class="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
            title="Preview driver-side workspace"
          >
            <svg lucideExternalLink class="h-3.5 w-3.5 text-indigo-400"></svg>
            <span>Driver Portal Preview</span>
          </a>

          <button
            type="button"
            (click)="loadPartners()"
            [disabled]="loading()"
            class="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 cursor-pointer disabled:opacity-50"
          >
            <svg lucideRefreshCw class="h-3.5 w-3.5" [class.animate-spin]="loading()"></svg>
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      <!-- 📊 KPI Metric Stats Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          (click)="filterStatus.set('ALL'); loadPartners()"
          class="rounded-2xl border p-4 transition cursor-pointer"
          [class]="filterStatus() === 'ALL'
            ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-600/20'
            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'"
        >
          <div class="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Total Fleet</span>
            <svg lucideTruck class="h-4 w-4 text-indigo-400"></svg>
          </div>
          <p class="text-2xl font-black text-white">{{ stats().total }}</p>
          <span class="text-[11px] text-zinc-500 mt-1 block">Submitted applicants</span>
        </div>

        <div
          (click)="filterStatus.set('PENDING_APPROVAL'); loadPartners()"
          class="rounded-2xl border p-4 transition cursor-pointer relative"
          [class]="filterStatus() === 'PENDING_APPROVAL'
            ? 'border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-600/20 ring-1 ring-amber-400/40'
            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'"
        >
          @if (stats().pending > 0) {
            <span class="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping"></span>
          }
          <div class="flex items-center justify-between text-xs text-amber-300 mb-1">
            <span>Ready for Review</span>
            <svg lucideClock class="h-4 w-4 text-amber-400"></svg>
          </div>
          <p class="text-2xl font-black text-amber-300">{{ stats().pending }}</p>
          <span class="text-[11px] text-amber-400/80 mt-1 block">Docs submitted</span>
        </div>

        <div
          (click)="filterStatus.set('APPROVED'); loadPartners()"
          class="rounded-2xl border p-4 transition cursor-pointer"
          [class]="filterStatus() === 'APPROVED'
            ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-600/20'
            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'"
        >
          <div class="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>Active & Approved</span>
            <svg lucideShieldCheck class="h-4 w-4 text-emerald-400"></svg>
          </div>
          <p class="text-2xl font-black text-emerald-300">{{ stats().approved }}</p>
          <span class="text-[11px] text-emerald-400/80 mt-1 block">Authorized dispatch</span>
        </div>

        <div
          (click)="filterStatus.set('REJECTED'); loadPartners()"
          class="rounded-2xl border p-4 transition cursor-pointer"
          [class]="filterStatus() === 'REJECTED'
            ? 'border-rose-500 bg-rose-950/30 shadow-lg shadow-rose-600/20'
            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'"
        >
          <div class="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span>Rejected</span>
            <svg lucideShieldAlert class="h-4 w-4 text-rose-400"></svg>
          </div>
          <p class="text-2xl font-black text-rose-300">{{ stats().rejected }}</p>
          <span class="text-[11px] text-rose-400/80 mt-1 block">Needs re-upload</span>
        </div>
      </div>

      <!-- 🔍 Search & Filters Bar -->
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <div class="relative w-full sm:flex-1">
          <svg lucideSearch class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"></svg>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event); onFilterChange()"
            placeholder="Search by driver name, email, or vehicle plate..."
            class="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div class="w-full sm:w-48">
          <input
            type="text"
            [ngModel]="cityFilter()"
            (ngModelChange)="cityFilter.set($event); onFilterChange()"
            placeholder="Filter city (e.g. San Francisco)"
            class="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div class="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          @for (tab of statusTabs; track tab.value) {
            <button
              type="button"
              (click)="filterStatus.set(tab.value); onFilterChange()"
              class="rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5"
              [class]="filterStatus() === tab.value
                ? 'bg-zinc-100 text-zinc-950 font-bold shadow'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'"
            >
              <span>{{ tab.label }}</span>
              @if (tab.value === 'ALL' && stats().total > 0) {
                <span
                  class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                  [class]="filterStatus() === 'ALL' ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-800 text-zinc-400'"
                >
                  {{ stats().total }}
                </span>
              }
              @if (tab.value === 'PENDING_APPROVAL' && stats().pending > 0) {
                <span
                  class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
                  [class]="filterStatus() === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-500/20 text-amber-500'"
                >
                  {{ stats().pending }}
                </span>
              }
            </button>
          }
        </div>
      </div>

      <!-- 📋 Partners Table / Card Grid -->
      <div class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl backdrop-blur-md">
        @if (loading() && partners().length === 0) {
          <div class="p-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <svg lucideRefreshCw class="h-4 w-4 animate-spin text-indigo-400"></svg>
            <span>Loading delivery fleet records...</span>
          </div>
        } @else if (partners().length === 0) {
          <div class="p-12 text-center text-xs text-zinc-400">
            No delivery partners match the selected filter criteria.
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full min-w-[1160px] text-left text-xs text-zinc-300">
              <thead class="border-b border-zinc-800 bg-zinc-950/60 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th class="px-5 py-3.5 min-w-[220px] whitespace-nowrap">Driver & Account</th>
                  <th class="px-5 py-3.5 min-w-[170px] whitespace-nowrap">Vehicle Details</th>
                  <th class="px-5 py-3.5 min-w-[180px] whitespace-nowrap">Operating Territory</th>
                  <th class="px-5 py-3.5 min-w-[180px] whitespace-nowrap">KYC Documents</th>
                  <th class="px-5 py-3.5 min-w-[170px] whitespace-nowrap">Status</th>
                  <th class="px-5 py-3.5 text-right min-w-[240px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-800/60">
                @for (p of partners(); track p.id) {
                  <tr class="transition hover:bg-zinc-800/30">
                    <td class="px-5 py-4">
                      <div class="flex items-center gap-3">
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                          {{ p.full_name?.charAt(0) || 'D' }}
                        </div>
                        <div>
                          <p class="font-bold text-white text-sm">{{ p.full_name }}</p>
                          <p class="text-[11px] text-zinc-400">{{ p.email || 'partner@nexus.local' }}</p>
                          <p class="text-[11px] text-zinc-500 font-mono">{{ p.phone }}</p>
                        </div>
                      </div>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      <p class="font-medium text-zinc-200">{{ p.vehicle_type || 'Cargo Van' }}</p>
                      <p class="font-mono text-indigo-400 uppercase text-[11px]">{{ p.vehicle_plate_number || 'N/A' }}</p>
                      <span class="text-[10px] text-zinc-500">⭐ {{ p.rating || '5.0' }} ({{ p.completed_trips || 0 }} trips)</span>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-1.5 font-medium text-zinc-200">
                        <svg lucideMapPin class="h-3.5 w-3.5 text-zinc-500"></svg>
                        <span>{{ p.city }}, {{ p.region_state }}</span>
                      </div>
                      <span class="text-[11px] text-zinc-500 block">{{ p.country }}</span>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap min-w-[180px]">
                      @let counts = getDocCounts(p.documents);
                      <div
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap border shadow-sm"
                        [class]="counts.verified === 4
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-emerald-950/20'
                          : counts.rejected > 0
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-rose-950/20'
                          : counts.total > 0
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-950/20'
                          : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'"
                      >
                        <span
                          class="h-1.5 w-1.5 rounded-full shrink-0"
                          [class]="counts.verified === 4
                            ? 'bg-emerald-400'
                            : counts.rejected > 0
                            ? 'bg-rose-400'
                            : counts.total > 0
                            ? 'bg-amber-400'
                            : 'bg-zinc-500'"
                        ></span>
                        <span class="font-bold font-mono">{{ counts.total }}/4</span>
                        <span>Documents</span>
                      </div>

                      <p class="text-[11px] text-zinc-400 mt-1 font-medium whitespace-nowrap">
                        @if (counts.verified === 4) {
                          <span class="text-emerald-400 font-semibold">All 4 verified</span>
                        } @else if (counts.rejected === 4) {
                          <span class="text-rose-400 font-semibold">All 4 rejected</span>
                        } @else if (counts.rejected > 0 || counts.verified > 0) {
                          <span class="text-zinc-300">
                            @if (counts.verified > 0) {
                              <span class="text-emerald-400 font-semibold">{{ counts.verified }} verified</span>
                            }
                            @if (counts.verified > 0 && counts.rejected > 0) {
                              <span class="text-zinc-600"> • </span>
                            }
                            @if (counts.rejected > 0) {
                              <span class="text-rose-400 font-semibold">{{ counts.rejected }} rejected</span>
                            }
                            @if (counts.pending > 0) {
                              <span class="text-zinc-600"> • </span>
                              <span class="text-amber-300">{{ counts.pending }} pending</span>
                            }
                          </span>
                        } @else if (counts.total > 0) {
                          <span class="text-amber-300/90">{{ counts.total }} of 4 uploaded</span>
                        } @else {
                          <span class="text-zinc-500">Pending upload</span>
                        }
                      </p>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap min-w-[170px]">
                      @if (p.verification_status === 'APPROVED') {
                        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          <span>APPROVED</span>
                        </span>
                      } @else if (p.verification_status === 'REJECTED') {
                        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                          <span>REJECTED</span>
                        </span>
                      } @else if (p.verification_status === 'PENDING_APPROVAL') {
                        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 ring-1 ring-amber-400/40">
                          <span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                          <span>PENDING_APPROVAL</span>
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                          <span class="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
                          <span>PENDING_SUBMISSION</span>
                        </span>
                      }
                      @if (p.verification_status === 'REJECTED' && p.rejection_reason) {
                        <p class="text-[10px] text-rose-400/90 mt-1 max-w-[200px] truncate font-medium" [title]="p.rejection_reason">
                          Reason: {{ p.rejection_reason }}
                        </p>
                      }
                    </td>

                    <td class="px-5 py-4 text-right min-w-[120px] whitespace-nowrap">
                      <button
                        type="button"
                        (click)="openInspection(p)"
                        class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-3.5 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer shadow-sm"
                      >
                        <svg lucideEye class="h-3.5 w-3.5"></svg>
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- 🔎 Applicant KYC Inspection & Decision Modal -->
      @if (selectedPartner(); as sp) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn" (click)="selectedPartner.set(null)">
          <div class="relative w-full max-w-4xl max-h-[86vh] flex flex-col min-h-0 rounded-3xl border border-zinc-700/80 bg-zinc-900 text-zinc-100 shadow-2xl animate-scaleUp overflow-hidden" (click)="$event.stopPropagation()">
            <!-- Modal Header (Fixed) -->
            <div class="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/90 shrink-0">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <svg lucideTruck class="h-5 w-5"></svg>
                </div>
                <div class="min-w-0">
                  <h3 class="text-lg font-bold tracking-tight text-white truncate">{{ sp.full_name }}</h3>
                  <p class="text-xs text-zinc-400 truncate">
                    Delivery Partner Application • {{ sp.city }}, {{ sp.region_state }}, {{ sp.country }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="selectedPartner.set(null)"
                class="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer shrink-0"
              >
                <svg lucideX class="h-5 w-5"></svg>
              </button>
            </div>

            <!-- Modal Body (Scrollable) -->
            <div class="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5">
              <!-- Profile Parameters Summary -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <span class="text-zinc-500 block mb-0.5">Phone Number</span>
                  <span class="font-bold text-zinc-200">{{ sp.phone }}</span>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <span class="text-zinc-500 block mb-0.5">Vehicle Type</span>
                  <span class="font-bold text-zinc-200">{{ sp.vehicle_type }}</span>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <span class="text-zinc-500 block mb-0.5">Plate Number</span>
                  <span class="font-bold text-indigo-400 font-mono uppercase">{{ sp.vehicle_plate_number }}</span>
                </div>
                <div class="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <span class="text-zinc-500 block mb-0.5">Current Status</span>
                  <span class="font-bold uppercase" [class]="sp.verification_status === 'APPROVED' ? 'text-emerald-400' : sp.verification_status === 'REJECTED' ? 'text-rose-400' : sp.verification_status === 'PENDING_APPROVAL' ? 'text-amber-400' : 'text-zinc-400'">
                    {{ sp.verification_status }}
                  </span>
                </div>
              </div>

              <!-- Document Review Section -->
              <div class="space-y-3">
                @let modalCounts = getDocCounts(sp.documents);
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Submitted KYC Credentials ({{ modalCounts.total }}/4)
                  </h4>
                  <span class="text-[11px] text-zinc-400">
                    @if (modalCounts.verified === 4) {
                      <span class="text-emerald-400 font-semibold">All 4 credentials verified</span>
                    } @else if (modalCounts.rejected === 4) {
                      <span class="text-rose-400 font-semibold">All 4 credentials rejected</span>
                    } @else if (modalCounts.rejected > 0 || modalCounts.verified > 0) {
                      <span>
                        @if (modalCounts.verified > 0) {
                          <span class="text-emerald-400 font-semibold">{{ modalCounts.verified }} verified</span>
                        }
                        @if (modalCounts.verified > 0 && modalCounts.rejected > 0) {
                          <span class="text-zinc-600">, </span>
                        }
                        @if (modalCounts.rejected > 0) {
                          <span class="text-rose-400 font-semibold">{{ modalCounts.rejected }} rejected</span>
                        }
                        @if (modalCounts.pending > 0) {
                          <span class="text-zinc-600">, </span>
                          <span class="text-amber-300">{{ modalCounts.pending }} pending</span>
                        }
                      </span>
                    } @else {
                      <span>Review each credential below</span>
                    }
                  </span>
                </div>

                @if ((sp.documents || []).length === 0) {
                  <div class="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 text-center text-xs space-y-1.5">
                    <div class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-1">
                      <svg lucideAlertTriangle class="h-4 w-4"></svg>
                    </div>
                    <p class="font-bold text-amber-300">Applicant Has Not Submitted Any Documents Yet</p>
                    <p class="text-zinc-400 text-[11px] max-w-md mx-auto">
                      This courier registered an account but has not uploaded required credentials (Driver's License, RC, Identity Proof). Approval is disabled until credentials are uploaded.
                    </p>
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    @for (doc of sp.documents; track doc.id) {
                      <div class="rounded-2xl border bg-zinc-950/80 p-4 space-y-3 transition flex flex-col justify-between"
                        [class]="doc.status === 'VERIFIED'
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : doc.status === 'REJECTED'
                          ? 'border-rose-500/40 bg-rose-950/15'
                          : 'border-zinc-800'">
                        
                        <div class="space-y-3">
                          <!-- Document Header & Status Badge -->
                          <div class="flex items-start justify-between gap-2">
                            <div>
                              <span class="font-bold text-xs text-white block">{{ getDocName(doc.type) }}</span>
                              <span class="text-[10px] text-zinc-500 font-mono uppercase">{{ doc.type }}</span>
                            </div>
                            
                            @if (doc.status === 'VERIFIED') {
                              <span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase whitespace-nowrap shrink-0">
                                <svg lucideCheck class="h-3 w-3 text-emerald-400"></svg>
                                <span>Verified</span>
                              </span>
                            } @else if (doc.status === 'REJECTED') {
                              <span class="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase whitespace-nowrap shrink-0">
                                <svg lucideAlertTriangle class="h-3 w-3 text-rose-400"></svg>
                                <span>Rejected</span>
                              </span>
                            } @else {
                              <span class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase whitespace-nowrap shrink-0">
                                <svg lucideClock class="h-3 w-3 text-amber-400"></svg>
                                <span>Pending Review</span>
                              </span>
                            }
                          </div>

                          <!-- Document File Details & Preview Link -->
                          <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5 text-xs flex items-center justify-between gap-3">
                            <div class="min-w-0">
                              <p class="font-medium text-zinc-200 truncate text-[11px]">{{ doc.name }}</p>
                              <span class="text-[10px] text-zinc-500">{{ doc.fileSize || '1.5 MB' }}</span>
                            </div>
                            <a
                              [href]="doc.url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="shrink-0 inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer whitespace-nowrap"
                            >
                              <svg lucideExternalLink class="h-3 w-3"></svg>
                              <span>Preview</span>
                            </a>
                          </div>

                          <!-- Rejection Reason Warning (if rejected) -->
                          @if (doc.status === 'REJECTED' && doc.rejectionReason) {
                            <div class="rounded-xl border border-rose-500/30 bg-rose-950/25 p-2.5 text-[11px] text-rose-300 flex items-start gap-2">
                              <svg lucideAlertTriangle class="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5"></svg>
                              <div>
                                <span class="font-bold text-rose-200 block">Rejection Feedback:</span>
                                <span>{{ doc.rejectionReason }}</span>
                              </div>
                            </div>
                          }
                        </div>

                        <!-- Document Rejection Input Drawer -->
                        @if (rejectingDocId() === doc.id) {
                          <div class="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 space-y-2.5 animate-fadeIn mt-2">
                            <div class="flex items-center justify-between">
                              <span class="text-[11px] font-bold text-rose-300">Select reason for rejecting this document:</span>
                              <button
                                type="button"
                                (click)="cancelRejectDoc()"
                                class="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>

                            <!-- Presets for this specific doc type -->
                            <div class="flex flex-wrap gap-1">
                              @for (preset of getDocPresets(doc.type); track preset) {
                                <button
                                  type="button"
                                  (click)="docRejectionReason.set(preset)"
                                  class="rounded-md border border-rose-500/30 bg-rose-900/30 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-800/60 hover:border-rose-400 transition cursor-pointer text-left"
                                >
                                  {{ preset }}
                                </button>
                              }
                            </div>

                            <textarea
                              rows="2"
                              [ngModel]="docRejectionReason()"
                              (ngModelChange)="docRejectionReason.set($event)"
                              placeholder="Specific instructions for partner to correct this document..."
                              class="w-full rounded-lg border border-rose-500/40 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            ></textarea>

                            <div class="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                (click)="cancelRejectDoc()"
                                class="rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer whitespace-nowrap"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                (click)="confirmRejectDoc(sp, doc)"
                                [disabled]="actionLoading()"
                                class="rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-500 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                              >
                                Reject This Document
                              </button>
                            </div>
                          </div>
                        } @else {
                          <!-- Document Action Buttons (Only shown for PENDING documents) -->
                          @if (doc.status === 'PENDING') {
                            <div class="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800/60 mt-1">
                              <button
                                type="button"
                                (click)="approveDoc(sp, doc)"
                                [disabled]="actionLoading()"
                                class="inline-flex items-center gap-1 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white shadow transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                title="Approve this document"
                              >
                                <svg lucideCheck class="h-3.5 w-3.5"></svg>
                                <span>Approve Doc</span>
                              </button>

                              <button
                                type="button"
                                (click)="startRejectDoc(doc)"
                                [disabled]="actionLoading()"
                                class="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                title="Reject this document with feedback"
                              >
                                <svg lucideUserX class="h-3.5 w-3.5"></svg>
                                <span>Reject Doc</span>
                              </button>
                            </div>
                          }
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Modal Footer (Status Bar) -->
            <div class="border-t border-zinc-800 px-6 py-4 bg-zinc-950/90 flex items-center justify-between gap-4 shrink-0">
              <div class="flex items-center gap-2 min-w-0">
                @if (sp.verification_status === 'APPROVED') {
                  <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 truncate">
                    <svg lucideShieldCheck class="h-4 w-4 shrink-0"></svg>
                    <span class="truncate">Partner is Verified & Approved for Regional Dispatch</span>
                  </span>
                } @else if (sp.verification_status === 'REJECTED') {
                  <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 truncate">
                    <svg lucideAlertTriangle class="h-4 w-4 shrink-0"></svg>
                    <span class="truncate">Application Rejected (Awaiting Driver Re-upload)</span>
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 truncate">
                    <svg lucideClock class="h-4 w-4 shrink-0"></svg>
                    <span class="truncate">Review each uploaded credential above to approve or reject</span>
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDeliveryPartnersComponent implements OnInit {
  private readonly partnerService = inject(DeliveryPartnerService);
  private readonly toast = inject(ToastService);
  private readonly orderSocket = inject(OrderSocketService);

  readonly loading = signal(false);
  readonly actionLoading = signal(false);
  readonly partners = signal<DeliveryPartnerProfile[]>([]);
  readonly stats = signal<{ total: number; pending: number; approved: number; rejected: number }>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  readonly filterStatus = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly cityFilter = signal<string>('');

  readonly statusTabs = [
    { value: 'ALL', label: 'Total Fleet' },
    { value: 'PENDING_APPROVAL', label: 'Ready for Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  readonly selectedPartner = signal<DeliveryPartnerProfile | null>(null);
  readonly showRejectInput = signal(false);
  readonly rejectionReasonInput = signal('');

  // Per-document rejection state
  readonly rejectingDocId = signal<string | null>(null);
  readonly docRejectionReason = signal<string>('');

  constructor() {
    this.orderSocket.initSocket();

    // Live partner document or status update
    effect(() => {
      const updated = this.orderSocket.latestDeliveryPartnerUpdated();
      if (updated) {
        this.handleRealtimeUpdate(updated);
      }
    });

    // Live new partner registration
    effect(() => {
      const registered = this.orderSocket.latestDeliveryPartnerRegistered();
      if (registered) {
        this.handleRealtimeRegistered(registered);
      }
    });
  }

  private handleRealtimeUpdate(updated: any) {
    if (!updated || !updated.id) return;

    // Update in local listing in-place
    this.partners.update((list) => {
      const idx = list.findIndex((p) => p.id === updated.id);
      if (idx !== -1) {
        const next = [...list];
        next[idx] = { ...next[idx], ...updated };
        return next;
      }
      return [updated, ...list];
    });

    // If modal is currently inspecting this partner, update modal state in real time
    if (this.selectedPartner()?.id === updated.id) {
      this.selectedPartner.set(updated);
    }
  }

  private handleRealtimeRegistered(registered: any) {
    if (!registered || !registered.id) return;
    this.toast.info(`New courier applicant registered: ${registered.full_name}`);
    this.loadPartners();
  }

  ngOnInit() {
    this.loadPartners();
  }

  onFilterChange() {
    this.loadPartners();
  }

  loadPartners() {
    this.loading.set(true);
    this.partnerService
      .getAdminList({
        status: this.filterStatus(),
        search: this.searchQuery().trim() || undefined,
        city: this.cityFilter().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.partners.set(res.partners || []);
          this.stats.set(res.stats || { total: 0, pending: 0, approved: 0, rejected: 0, awaiting_upload: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err.error?.message || 'Failed to load delivery partners');
        },
      });
  }

  readonly rejectionPresets = [
    "Commercial driving license scan is expired or blurry. Please upload a clear photo of front and back.",
    "Vehicle RC does not match registered vehicle license plate number.",
    "National ID / Passport photo is unreadable or clipped.",
    "Goods transit insurance policy is missing, expired, or invalid for commercial delivery.",
    "Operating city or service territory requires additional proof of local residence.",
  ];

  getDocName(type: string): string {
    switch (type) {
      case 'DRIVING_LICENSE':
        return "Commercial Driver's License (CDL)";
      case 'VEHICLE_RC':
        return 'Vehicle Registration (RC)';
      case 'GOVT_ID':
        return 'National ID / Passport';
      case 'TRANSIT_INSURANCE':
        return 'Goods Transit Insurance';
      default:
        return type?.replace(/_/g, ' ') || 'Document';
    }
  }

  getDocPresets(type: string): string[] {
    switch (type) {
      case 'DRIVING_LICENSE':
        return [
          "Commercial driver's license scan is blurry or unreadable.",
          "License is expired or validity date is unclear.",
          "Name on driver's license does not match applicant profile name.",
        ];
      case 'VEHICLE_RC':
        return [
          "Vehicle plate number does not match registered profile.",
          "RC document is expired or illegible.",
          "Vehicle type on RC does not match selected vehicle.",
        ];
      case 'GOVT_ID':
        return [
          "National ID / Passport photo is unreadable or clipped.",
          "Name or photo is obscured or expired.",
          "Government ID type is unsupported.",
        ];
      case 'TRANSIT_INSURANCE':
        return [
          "Goods transit insurance policy is expired or missing.",
          "Insurance does not cover commercial courier / cargo transit.",
          "Policy number / insured name cannot be verified.",
        ];
      default:
        return ["Document does not meet compliance standards. Please re-upload a clear copy."];
    }
  }

  getDocCounts(docs?: DeliveryPartnerDocument[]) {
    const list = docs || [];
    const verified = list.filter((d) => d && d.status === 'VERIFIED').length;
    const rejected = list.filter((d) => d && d.status === 'REJECTED').length;
    const pending = list.filter((d) => d && (!d.status || d.status === 'PENDING')).length;
    return {
      total: list.length,
      verified,
      rejected,
      pending,
    };
  }

  openInspection(partner: DeliveryPartnerProfile) {
    this.selectedPartner.set(partner);
    this.showRejectInput.set(false);
    this.rejectionReasonInput.set('');
    this.rejectingDocId.set(null);
    this.docRejectionReason.set('');
  }

  openReject(partner: DeliveryPartnerProfile) {
    this.selectedPartner.set(partner);
    this.showRejectInput.set(true);
    this.rejectionReasonInput.set('');
    this.rejectingDocId.set(null);
    this.docRejectionReason.set('');
  }

  approveDoc(partner: DeliveryPartnerProfile, doc: DeliveryPartnerDocument) {
    this.actionLoading.set(true);
    this.partnerService.verifyDocument(partner.id, doc.id || doc.type, 'VERIFIED').subscribe({
      next: (updatedPartner) => {
        this.actionLoading.set(false);
        this.toast.success(`${this.getDocName(doc.type)} approved successfully!`);
        this.selectedPartner.set(updatedPartner);
        this.loadPartners();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(err.error?.message || 'Failed to approve document');
      },
    });
  }

  startRejectDoc(doc: DeliveryPartnerDocument) {
    this.rejectingDocId.set(doc.id);
    const presets = this.getDocPresets(doc.type);
    this.docRejectionReason.set(presets[0] || '');
  }

  cancelRejectDoc() {
    this.rejectingDocId.set(null);
    this.docRejectionReason.set('');
  }

  confirmRejectDoc(partner: DeliveryPartnerProfile, doc: DeliveryPartnerDocument) {
    const reason = this.docRejectionReason().trim() || 'Document does not meet compliance standards.';
    this.actionLoading.set(true);
    this.partnerService.verifyDocument(partner.id, doc.id || doc.type, 'REJECTED', reason).subscribe({
      next: (updatedPartner) => {
        this.actionLoading.set(false);
        this.toast.info(`${this.getDocName(doc.type)} rejected: ${reason}`);
        this.rejectingDocId.set(null);
        this.docRejectionReason.set('');
        this.selectedPartner.set(updatedPartner);
        this.loadPartners();
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(err.error?.message || 'Failed to reject document');
      },
    });
  }

  quickApprove(partner: DeliveryPartnerProfile) {
    if (!partner.documents || partner.documents.length === 0 || partner.verification_status === 'PENDING_SUBMISSION') {
      this.toast.error('Cannot approve: Applicant has not submitted any documents yet.');
      return;
    }
    this.partnerService.verifyPartner(partner.id, DeliveryPartnerVerificationStatuses.APPROVED).subscribe({
      next: (updated) => {
        this.toast.success(`Partner ${partner.full_name} approved! Authorized for regional dispatch.`);
        this.loadPartners();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to approve partner');
      },
    });
  }

  confirmApprove() {
    const partner = this.selectedPartner();
    if (!partner) return;

    if (!partner.documents || partner.documents.length === 0 || partner.verification_status === 'PENDING_SUBMISSION') {
      this.toast.error('Cannot approve: Applicant has not submitted any documents yet.');
      return;
    }

    this.partnerService.verifyPartner(partner.id, DeliveryPartnerVerificationStatuses.APPROVED).subscribe({
      next: () => {
        this.toast.success(`Delivery partner ${partner.full_name} has been approved!`);
        this.selectedPartner.set(null);
        this.loadPartners();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to approve partner');
      },
    });
  }

  confirmReject() {
    const partner = this.selectedPartner();
    if (!partner) return;

    if (!partner.documents || partner.documents.length === 0 || partner.verification_status === 'PENDING_SUBMISSION') {
      this.toast.error('Cannot reject: Applicant has not submitted any documents yet.');
      return;
    }

    const reason = this.rejectionReasonInput().trim() || 'Documents do not meet verification criteria.';
    this.partnerService
      .verifyPartner(partner.id, DeliveryPartnerVerificationStatuses.REJECTED, reason)
      .subscribe({
        next: () => {
          this.toast.info(`Application rejected: ${reason}`);
          this.selectedPartner.set(null);
          this.loadPartners();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to reject partner');
        },
      });
  }
}

