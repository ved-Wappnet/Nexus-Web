import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
  DeliveryPartnerTask,
  OrderStatus,
  OrderStatuses,
} from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { DeliveryPartnerService } from '@core/services/delivery-partner.service';
import { OrderSocketService } from '@core/services/order-socket.service';
import { ToastService } from '@core/services/toast.service';
import {
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideCamera,
  LucideCheck,
  LucideCheckCircle2,
  LucideClock,
  LucideCompass,
  LucideExternalLink,
  LucideFileCheck,
  LucideFileText,
  LucideImage,
  LucideMapPin,
  LucideNavigation,
  LucidePenTool,
  LucidePhone,
  LucidePlay,
  LucideRadio,
  LucideMessageSquare,
  LucideRefreshCw,
  LucideSend,
  LucideCheckCheck,
  LucideShield,
  LucideShieldCheck,
  LucideSparkles,
  LucideTrash2,
  LucideTruck,
  LucideUpload,
  LucideUser,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { Badge } from '@shared/ui/badge/badge';

type PortalTab = 'available' | 'tasks' | 'kyc';

const REQUIRED_DOC_TYPES = [
  {
    type: 'DRIVING_LICENSE' as const,
    title: "Commercial Driver's License (CDL)",
    description: 'Government issued valid driving license permitting commercial cargo/transit vehicles.',
    sampleUrl:
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    sampleName: 'CDL_Commercial_Driver_License.pdf',
  },
  {
    type: 'VEHICLE_RC' as const,
    title: 'Vehicle Registration Certificate (RC)',
    description: 'Official motor vehicle department registration proving vehicle ownership and roadworthiness.',
    sampleUrl:
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    sampleName: 'Vehicle_Registration_Book_RC.pdf',
  },
  {
    type: 'GOVT_ID' as const,
    title: 'National Identity Proof / Passport / Aadhaar / SSN',
    description: 'Government issued national identity card or biometric identity verification document.',
    sampleUrl:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
    sampleName: 'National_Government_Identity.pdf',
  },
  {
    type: 'TRANSIT_INSURANCE' as const,
    title: 'Commercial Goods Transit & Liability Insurance',
    description: 'Active vehicle & third-party cargo protection policy valid for freight handling.',
    sampleUrl:
      'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    sampleName: 'Cargo_Transit_Insurance_Policy.pdf',
  },
];

@Component({
  selector: 'app-delivery-partner-portal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideTruck,
    LucideShield,
    LucideShieldCheck,
    LucideCheckCircle2,
    LucideClock,
    LucideAlertTriangle,
    LucideFileText,
    LucideFileCheck,
    LucideUpload,
    LucideSparkles,
    LucideMapPin,
    LucidePlay,
    LucideRefreshCw,
    LucideExternalLink,
    LucideNavigation,
    LucidePhone,
    LucideRadio,
    LucideCamera,
    LucidePenTool,
    LucideCheck,
    LucideX,
    LucideImage,
    LucideZap,
    LucideTrash2,
    LucideMessageSquare,
    LucideSend,
    LucideCheckCheck,
  ],
  template: `
    <div class="space-y-6 pb-12">
      <!-- 🛡️ Administrator Preview Header (if viewing as Admin) -->
      @if (isAdmin()) {
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/40 px-5 py-3.5 text-xs text-indigo-200 shadow-md backdrop-blur-md">
          <div class="flex items-center gap-2.5">
            <span class="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span class="font-bold text-indigo-300">Admin Mode:</span>
            <span>You are previewing the Delivery Partner Driver Workspace interface.</span>
          </div>
          <a
            routerLink="/admin/delivery-partners"
            class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-500 transition"
          >
            <span>Back to Fleet Verification</span>
            <svg lucideExternalLink class="h-3.5 w-3.5"></svg>
          </a>
        </div>
      }

      <!-- 🚚 Header Banner -->
      <div class="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-indigo-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <svg lucideTruck class="h-3.5 w-3.5"></svg>
              <span>Delivery Fleet Partner Workspace</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {{ profile()?.full_name || 'Delivery Partner' }}
            </h1>
            <div class="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span class="inline-flex items-center gap-1">
                <svg lucideMapPin class="h-3.5 w-3.5 text-zinc-500"></svg>
                {{ profile()?.city || 'San Francisco' }}, {{ profile()?.region_state || 'California' }}, {{ profile()?.country || 'United States' }}
              </span>
              <span>•</span>
              <span class="inline-flex items-center gap-1 font-mono uppercase bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">
                {{ profile()?.vehicle_type || 'Cargo Van' }} • {{ profile()?.vehicle_plate_number || 'PENDING PLATE' }}
              </span>
              <span>•</span>
              <span class="inline-flex items-center gap-1 text-amber-300 font-semibold">
                ⭐ {{ profile()?.rating || '4.95' }} ({{ profile()?.completed_trips || 0 }} deliveries completed)
              </span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="refreshAll()"
              [disabled]="loading()"
              class="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/90 px-4 py-2 text-xs font-semibold text-zinc-200 shadow hover:bg-zinc-700 hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <svg lucideRefreshCw class="h-3.5 w-3.5" [class.animate-spin]="loading()"></svg>
              <span>Refresh Portal</span>
            </button>
          </div>
        </div>

        <!-- Verification Status Indicator Card -->
        <div class="mt-6 pt-6 border-t border-zinc-800/80">
          @if (isApproved()) {
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-emerald-200">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <svg lucideShieldCheck class="h-6 w-6"></svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-emerald-100 flex items-center gap-2">
                    <span>Verified Active Delivery Partner</span>
                    <span class="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold">Active</span>
                  </h4>
                  <p class="text-xs text-emerald-300/80 mt-0.5">
                    Your KYC compliance credentials are fully verified. You can claim available deliveries in {{ profile()?.city }} or execute assigned orders.
                  </p>
                </div>
              </div>
              <div class="text-xs font-mono text-emerald-300 bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                Operating Zone: {{ profile()?.city }}, {{ profile()?.country }}
              </div>
            </div>
          } @else if (isRejected()) {
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4 text-rose-200">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <svg lucideAlertTriangle class="h-6 w-6"></svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-rose-100">Verification Rejected by Nexus Admin</h4>
                  <p class="text-xs text-rose-300/80 mt-0.5">
                    {{ profile()?.rejection_reason || 'One or more KYC documents were rejected. Please review and re-upload compliant copies.' }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="activeTab.set('kyc')"
                class="shrink-0 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-rose-500 transition cursor-pointer"
              >
                Re-upload Documents
              </button>
            </div>
          } @else {
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-amber-200">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <svg lucideClock class="h-6 w-6"></svg>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-amber-100">Under Admin Verification Review</h4>
                  <p class="text-xs text-amber-300/80 mt-0.5">
                    @if (isPendingSubmission()) {
                      Please upload all 4 required KYC compliance documents to request activation.
                    } @else {
                      All 4 documents are uploaded and awaiting compliance review from the Nexus Admin Fleet team.
                    }
                  </p>
                </div>
              </div>
              <button
                type="button"
                (click)="activeTab.set('kyc')"
                class="shrink-0 rounded-xl bg-amber-600/30 border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-600/50 transition cursor-pointer"
              >
                Inspect Documents
              </button>
            </div>
          }
        </div>
      </div>

      <!-- 🗂️ Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          (click)="activeTab.set('available')"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer relative"
          [class]="activeTab() === 'available'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          <svg lucideNavigation class="h-4 w-4"></svg>
          <span>Available Deliveries in Area</span>
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-extrabold"
            [class]="activeTab() === 'available' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'"
          >
            {{ availableOrders().length }}
          </span>
          @if (!isApproved()) {
            <span class="text-[10px] text-amber-400 font-mono">🔒 Locked</span>
          }
        </button>

        <button
          type="button"
          (click)="activeTab.set('tasks')"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer relative"
          [class]="activeTab() === 'tasks'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          <svg lucideTruck class="h-4 w-4"></svg>
          <span>My Assigned Tasks</span>
          <span class="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{{ tasks().length }}</span>
        </button>

        <button
          type="button"
          (click)="activeTab.set('kyc')"
          class="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          [class]="activeTab() === 'kyc'
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
        >
          <svg lucideFileCheck class="h-4 w-4"></svg>
          <span>KYC & Fleet Credentials</span>
          <span class="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">{{ uploadedCount() }}/4</span>
        </button>
      </div>

      <!-- 📍 TAB 1: Available Deliveries in Area -->
      @if (activeTab() === 'available') {
        <div class="space-y-6 animate-fadeIn">
          @if (!isApproved()) {
            <div class="rounded-3xl border border-amber-500/40 bg-zinc-900/90 p-8 text-center max-w-lg mx-auto shadow-2xl">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4">
                <svg lucideShield class="h-7 w-7"></svg>
              </div>
              <h3 class="text-lg font-bold text-white">Verification Required to Claim Orders</h3>
              <p class="text-xs text-zinc-400 mt-2 leading-relaxed">
                As a security measure, available local deliveries can only be accepted once an Admin approves your driver and vehicle KYC documents.
              </p>
              <button
                type="button"
                (click)="activeTab.set('kyc')"
                class="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition cursor-pointer"
              >
                <span>Check Uploaded Credentials</span>
              </button>
            </div>
          } @else if (availableOrders().length === 0) {
            <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center max-w-md mx-auto">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                <svg lucideNavigation class="h-7 w-7"></svg>
              </div>
              <h3 class="text-base font-bold text-white">No Pending Orders in {{ profile()?.city || 'Your Area' }}</h3>
              <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
                All dispatches in {{ profile()?.city }}, {{ profile()?.country }} have already been claimed. New incoming customer orders will appear here in real-time.
              </p>
              <button
                type="button"
                (click)="refreshAll()"
                class="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
              >
                <svg lucideRefreshCw class="h-3.5 w-3.5"></svg>
                <span>Check For New Orders</span>
              </button>
            </div>
          } @else {
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  <span>Available Orders in {{ profile()?.city || 'Your Zone' }}</span>
                  <span class="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-extrabold">
                    {{ availableOrders().length }} Ready to Accept
                  </span>
                </h3>
                <p class="text-xs text-zinc-400">
                  Review destination details and accept the dispatch to claim delivery route.
                </p>
              </div>
              <button
                type="button"
                (click)="refreshAll()"
                class="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold cursor-pointer"
              >
                <svg lucideRefreshCw class="h-3 w-3"></svg>
                <span>Refresh Live List</span>
              </button>
            </div>

            <div class="grid grid-cols-1 gap-4">
              @for (order of availableOrders(); track order.id) {
                <div class="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-xl transition hover:border-emerald-500/50 hover:shadow-emerald-950/20">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div class="space-y-1">
                      <div class="flex items-center gap-3">
                        <span class="text-base font-extrabold text-white">
                          Order #NX-{{ order.id.slice(0, 8).toUpperCase() }}
                        </span>
                        
                        <!-- Proximity Badge -->
                        @if (order.match_type === 'EXACT_CITY') {
                          <span class="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Exact City Match ({{ order.destination_city }})
                          </span>
                        } @else if (order.match_type === 'REGION_MATCH') {
                          <span class="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            Regional Territory ({{ order.destination_region }})
                          </span>
                        } @else {
                          <span class="rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {{ order.destination_country }}
                          </span>
                        }
                      </div>
                      
                      <p class="text-xs text-zinc-400 flex flex-wrap items-center gap-2">
                        <span>Recipient: <strong class="text-zinc-200">{{ order.recipient_name || order.customer_name }}</strong></span>
                        @if (order.recipient_phone) {
                          <span>•</span>
                          <span class="inline-flex items-center gap-1 font-mono text-zinc-300">
                            <svg lucidePhone class="h-3 w-3 text-zinc-400"></svg>
                            <span>{{ order.recipient_phone }}</span>
                          </span>
                        }
                      </p>
                    </div>

                    <div class="text-right">
                      <span class="text-lg font-black text-white">\${{ order.total_amount | number:'1.2-2' }}</span>
                      <span class="block text-[11px] text-zinc-500">{{ order.created_at | date:'medium' }}</span>
                    </div>
                  </div>

                  <!-- Dropoff Location & Included Package Items -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 text-xs">
                    <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-1">
                      <span class="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] block flex items-center gap-1.5">
                        <svg lucideMapPin class="h-3.5 w-3.5 text-emerald-400"></svg>
                        Dropoff Destination Address
                      </span>
                      <p class="text-zinc-100 font-medium leading-relaxed">
                        {{ order.destination_address || '100 Nexus Distribution Way, Dock 4' }}
                      </p>
                      <p class="text-zinc-400">
                        {{ order.destination_city }}, {{ order.destination_region }}, {{ order.destination_country }}
                        @if (order.destination_postal_code) {
                          <span class="font-mono text-zinc-300 ml-1">({{ order.destination_postal_code }})</span>
                        }
                      </p>
                    </div>

                    <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-1">
                      <span class="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] block flex items-center gap-1.5">
                        <svg lucideTruck class="h-3.5 w-3.5 text-indigo-400"></svg>
                        Package Cargo Items
                      </span>
                      <div class="space-y-1 max-h-20 overflow-y-auto pr-1">
                        @for (item of order.items; track item.id) {
                          <div class="flex items-center justify-between text-zinc-300">
                            <span class="truncate">{{ item.quantity }}x {{ item.product_title }}</span>
                            <span class="font-mono text-zinc-400">\${{ item.unit_price }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Claim Dispatch Action -->
                  <div class="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                    <span class="text-[11px] text-zinc-400 font-medium">
                      Immediate pickup & delivery dispatch for {{ profile()?.vehicle_type || 'your fleet' }}
                    </span>

                    <button
                      type="button"
                      (click)="acceptDeliveryOrder(order.id)"
                      [disabled]="claimingOrderId() === order.id"
                      class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      @if (claimingOrderId() === order.id) {
                        <svg lucideRefreshCw class="h-3.5 w-3.5 animate-spin"></svg>
                        <span>Claiming Dispatch...</span>
                      } @else {
                        <svg lucideCheckCircle2 class="h-4 w-4"></svg>
                        <span>Accept Delivery Dispatch</span>
                      }
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- 📦 TAB 2: Active Dispatch Runs & Tasks -->
      @if (activeTab() === 'tasks') {
        <div class="space-y-6 animate-fadeIn">
          @if (!isApproved()) {
            <div class="rounded-3xl border border-amber-500/40 bg-zinc-900/90 p-8 text-center max-w-lg mx-auto shadow-2xl">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4">
                <svg lucideShield class="h-7 w-7"></svg>
              </div>
              <h3 class="text-lg font-bold text-white">Verification Gate Active</h3>
              <p class="text-xs text-zinc-400 mt-2 leading-relaxed">
                As a standard security protocol, order dispatches can only be accepted and assigned once an Admin verifies your KYC credentials.
              </p>
              <button
                type="button"
                (click)="activeTab.set('kyc')"
                class="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition cursor-pointer"
              >
                <span>Check Uploaded Credentials</span>
              </button>
            </div>
          } @else if (tasks().length === 0) {
            <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-12 text-center max-w-md mx-auto">
              <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 border border-zinc-700 mb-4">
                <svg lucideTruck class="h-7 w-7"></svg>
              </div>
              <h3 class="text-base font-bold text-white">No Active Dispatches</h3>
              <p class="text-xs text-zinc-400 mt-1 leading-relaxed">
                You currently have no active deliveries in progress. Check the <strong>Available Deliveries in Area</strong> tab to claim pending orders.
              </p>
              <button
                type="button"
                (click)="activeTab.set('available')"
                class="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition cursor-pointer"
              >
                <svg lucideNavigation class="h-3.5 w-3.5"></svg>
                <span>Browse Available Local Orders</span>
              </button>
            </div>
          } @else {
            <div class="grid grid-cols-1 gap-4">
              @for (task of tasks(); track task.id) {
                <div class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl transition hover:border-zinc-700">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div class="space-y-1">
                      <div class="flex items-center gap-3">
                        <span class="text-base font-extrabold text-white">
                          Order #NX-{{ task.id.slice(0, 8).toUpperCase() }}
                        </span>
                        <span
                          class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          [class]="task.status === OrderStatuses.OUT_FOR_DELIVERY
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 ring-1 ring-amber-400/40'
                            : task.status === OrderStatuses.DELIVERED
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'"
                        >
                          {{ task.status }}
                        </span>
                      </div>
                      <p class="text-xs text-zinc-400">
                        Customer: <span class="text-zinc-200 font-semibold">{{ task.customer_name }}</span> ({{ task.customer_email }})
                      </p>
                    </div>

                    <div class="text-right">
                      <span class="text-lg font-bold text-white">\${{ task.total_amount | number:'1.2-2' }}</span>
                      <span class="block text-[11px] text-zinc-500">{{ task.created_at | date:'short' }}</span>
                    </div>
                  </div>

                  <!-- Delivery Destination & Route Summary -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 text-xs">
                    <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-1">
                      <span class="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] block">
                        Dropoff Destination Address
                      </span>
                      <p class="text-zinc-100 font-medium leading-relaxed">
                        {{ task.destination_address || '100 Nexus Distribution Way, Dock 4' }}
                      </p>
                      <p class="text-zinc-400">
                        {{ task.destination_city || 'San Francisco' }}, {{ task.destination_region || 'California' }}, {{ task.destination_country || 'United States' }}
                      </p>
                    </div>

                    <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3.5 space-y-1">
                      <span class="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] block">
                        Package Items Included
                      </span>
                      <div class="space-y-1 max-h-20 overflow-y-auto pr-1">
                        @for (item of task.items; track item.id) {
                          <div class="flex items-center justify-between text-zinc-300">
                            <span class="truncate">{{ item.quantity }}x {{ item.product_title }}</span>
                            <span class="font-mono text-zinc-400">\${{ item.unit_price }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Task Action Bar -->
                  <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-zinc-500 font-mono">
                        Waybill: {{ task.tracking_number || 'PENDING' }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      @if (task.status !== OrderStatuses.DELIVERED) {
                        @if (task.status !== OrderStatuses.OUT_FOR_DELIVERY) {
                          <button
                            type="button"
                            (click)="startDeliveryRun(task.id)"
                            class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition cursor-pointer active:scale-95"
                          >
                            <svg lucidePlay class="h-3.5 w-3.5"></svg>
                            <span>Start Delivery Run</span>
                          </button>
                        } @else {
                          <div class="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                            <span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                            <span>Out For Delivery</span>
                          </div>

                          <button
                            type="button"
                            (click)="openCourierChat(task)"
                            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-bold text-white shadow hover:bg-zinc-700 transition cursor-pointer active:scale-95"
                          >
                            <svg lucideMessageSquare class="h-3.5 w-3.5"></svg>
                            <span>Chat</span>
                          </button>
                        }

                        <button
                          type="button"
                          (click)="openPodModal(task)"
                          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition cursor-pointer active:scale-95"
                          title="Capture recipient signature and dropoff photo to complete delivery"
                        >
                          <svg lucidePenTool class="h-3.5 w-3.5"></svg>
                          <span>Confirm Delivery (POD)</span>
                        </button>
                      } @else {
                        <div class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <svg lucideCheckCircle2 class="h-4 w-4"></svg>
                          <span>Delivery Successfully Completed</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- 🛰️ Real-Time GPS Beacon Control Bar (Visible when en route) -->
                  @if (task.status === OrderStatuses.OUT_FOR_DELIVERY) {
                    <div class="mt-4 pt-3 border-t border-zinc-800/80 bg-zinc-950/60 rounded-xl p-3.5 border border-indigo-500/30">
                      <div class="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                        <div class="flex items-center gap-2">
                          <span class="relative flex h-2.5 w-2.5">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <span class="text-xs font-extrabold text-white uppercase tracking-wide flex items-center gap-1.5">
                            <svg lucideRadio class="h-3.5 w-3.5 text-emerald-400"></svg>
                            <span>Live Courier Geolocation Beacon</span>
                          </span>
                        </div>

                        <div class="flex items-center gap-2 font-mono text-[11px] text-zinc-300">
                          <span class="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-emerald-300 font-bold">
                            GPS: {{ currentDriverLat() | number:'1.4-4' }}, {{ currentDriverLng() | number:'1.4-4' }}
                          </span>
                          <span class="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-indigo-300">
                            {{ currentDriverSpeed() }} km/h
                          </span>
                        </div>
                      </div>

                      <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span class="text-[11px] text-zinc-400">
                          @if (lastPingTimestamp()) {
                            Last ping sent at <span class="text-zinc-200 font-mono">{{ lastPingTimestamp() }}</span>
                          } @else {
                            Broadcasting live transit coordinates to customer tracking map
                          }
                        </span>

                        <div class="flex items-center gap-2">
                          <button
                            type="button"
                            (click)="sendLocationPing(task.id)"
                            class="inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/20 active:scale-95 transition cursor-pointer"
                            title="Send immediate GPS ping to tracking map"
                          >
                            <svg lucideMapPin class="h-3 w-3"></svg>
                            <span>Broadcast GPS Ping</span>
                          </button>

                          <button
                            type="button"
                            (click)="simulateNextBeaconStep(task)"
                            class="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition cursor-pointer"
                            title="Simulate vehicle moving along road route towards dropoff destination"
                          >
                            <svg lucideZap class="h-3 w-3 text-amber-400"></svg>
                            <span>Advance Route (Simulate)</span>
                          </button>

                          <button
                            type="button"
                            (click)="toggleAutoBeacon(task.id)"
                            class="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold active:scale-95 transition cursor-pointer"
                            [class]="isBeaconActive()
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                              : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'"
                          >
                            <svg lucideRefreshCw class="h-3 w-3" [class.animate-spin]="isBeaconActive()"></svg>
                            <span>{{ isBeaconActive() ? 'Stop Auto-Beacon' : 'Auto-Beacon (4s)' }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- 📑 TAB 3: KYC & Compliance Documents -->
      @if (activeTab() === 'kyc') {
        <div class="space-y-6 animate-fadeIn">
          <!-- Territory & Fleet Specs Card -->
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md">
            <h3 class="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg lucideMapPin class="h-4 w-4 text-indigo-400"></svg>
              <span>Geographical Service Territory & Fleet Parameters</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                <span class="text-zinc-500 block mb-1">Operating City</span>
                <span class="font-bold text-zinc-100 text-sm">{{ profile()?.city || 'San Francisco' }}</span>
              </div>
              <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                <span class="text-zinc-500 block mb-1">State / Province</span>
                <span class="font-bold text-zinc-100 text-sm">{{ profile()?.region_state || 'California' }}</span>
              </div>
              <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                <span class="text-zinc-500 block mb-1">Country</span>
                <span class="font-bold text-zinc-100 text-sm">{{ profile()?.country || 'United States' }}</span>
              </div>
              <div class="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3">
                <span class="text-zinc-500 block mb-1">Vehicle License Plate</span>
                <span class="font-bold text-indigo-400 font-mono text-sm uppercase">{{ profile()?.vehicle_plate_number || 'DL-04-NX-2026' }}</span>
              </div>
            </div>
            @if (profile()?.service_postal_codes) {
              <div class="mt-3 text-xs text-zinc-400">
                <span class="text-zinc-500 font-medium">Covered Postal / Zip Codes: </span>
                <span class="font-mono text-zinc-300">{{ profile()?.service_postal_codes }}</span>
              </div>
            }
          </div>

          <!-- Document Upload Cards Grid -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-base font-bold text-white">Required Compliance Documents</h3>
                <p class="text-xs text-zinc-400">
                  Upload official scans or photos. Nexus Admins verify all documents prior to activating delivery dispatch.
                </p>
              </div>
              <span class="text-xs font-semibold text-zinc-400">
                {{ uploadedCount() }} of 4 Submitted
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @for (docDef of docDefs; track docDef.type) {
                @let currentDoc = getDocForType(docDef.type);
                <div class="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-lg flex flex-col justify-between transition hover:border-zinc-700">
                  <div>
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700">
                          <svg lucideFileText class="h-5 w-5"></svg>
                        </div>
                        <div>
                          <h4 class="text-sm font-bold text-white">{{ docDef.title }}</h4>
                          <p class="text-xs text-zinc-400 mt-0.5 line-clamp-1">{{ docDef.description }}</p>
                        </div>
                      </div>
                      
                      @if (currentDoc) {
                        <span
                          class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          [class]="currentDoc.status === 'VERIFIED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : currentDoc.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 ring-1 ring-rose-400/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'"
                        >
                          {{ currentDoc.status === 'VERIFIED' ? 'Verified' : currentDoc.status === 'REJECTED' ? 'Rejected' : 'Submitted' }}
                        </span>
                      } @else {
                        <span class="rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                          Required
                        </span>
                      }
                    </div>

                    <!-- Uploaded Document Details Preview -->
                    @if (currentDoc) {
                      <div class="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs flex items-center justify-between gap-3">
                        <div class="min-w-0">
                          <p class="font-medium text-zinc-200 truncate">{{ currentDoc.name }}</p>
                          <p class="text-[11px] text-zinc-500 mt-0.5">
                            Uploaded {{ currentDoc.uploadedAt | date:'mediumDate' }} • {{ currentDoc.fileSize || '1.4 MB' }}
                          </p>
                        </div>
                        <a
                          [href]="currentDoc.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                        >
                          <svg lucideExternalLink class="h-3 w-3"></svg>
                          <span>Preview</span>
                        </a>
                      </div>

                      <!-- Document Rejection Feedback Alert -->
                      @if (currentDoc.status === 'REJECTED' && currentDoc.rejectionReason) {
                        <div class="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-2.5 text-xs text-rose-300 flex items-start gap-2 animate-fadeIn">
                          <svg lucideAlertTriangle class="h-4 w-4 text-rose-400 shrink-0 mt-0.5"></svg>
                          <div>
                            <span class="font-bold text-rose-200 block text-[11px]">Admin Feedback:</span>
                            <span class="text-[11px] text-rose-300/90">{{ currentDoc.rejectionReason }}</span>
                            <span class="block text-[10px] text-rose-400/80 mt-0.5 font-medium">Please upload a corrected replacement file below.</span>
                          </div>
                        </div>
                      }
                    }
                  </div>

                  <!-- Upload Actions (Only Delivery Partner can upload, Admin is strictly read-only inspection) -->
                  @if (!isAdmin()) {
                    <div class="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      <label class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition cursor-pointer">
                        <svg lucideUpload class="h-3.5 w-3.5"></svg>
                        <span>{{ currentDoc ? 'Replace File' : 'Upload File' }}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          class="hidden"
                          (change)="onFileSelected($event, docDef.type, docDef.title)"
                        />
                      </label>

                      <!-- Instant Test Mock Document Button -->
                      <button
                        type="button"
                        (click)="loadTestDoc(docDef.type, docDef.sampleName, docDef.sampleUrl)"
                        [disabled]="uploading()"
                        class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition cursor-pointer disabled:opacity-50"
                        title="Load sample verified document for testing"
                      >
                        <svg lucideSparkles class="h-3 w-3 text-indigo-400"></svg>
                        <span>Use Demo Preset</span>
                      </button>
                    </div>
                  } @else {
                    <div class="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                      <span class="inline-flex items-center gap-1.5 text-zinc-400">
                        <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                        Admin Inspection Mode (Read-Only)
                      </span>
                      @if (currentDoc) {
                        <span class="text-emerald-400 font-medium">Document Available for Review</span>
                      } @else {
                        <span class="text-zinc-500 italic">Not submitted by applicant</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- 📝 Electronic Proof of Delivery (e-POD) Modal -->
      @if (podModalTask(); as task) {
        <div class="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
          <div
            class="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-zinc-950 p-5 sm:p-6 text-zinc-100 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            (click)="$event.stopPropagation()"
          >
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-4 mb-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <svg lucidePenTool class="h-5 w-5"></svg>
                </div>
                <div>
                  <h3 class="text-base font-bold text-white tracking-tight">Electronic Proof of Delivery (e-POD)</h3>
                  <p class="text-xs text-zinc-400 font-mono">Order #NX-{{ task.id.slice(0, 8).toUpperCase() }} • Recipient Signoff</p>
                </div>
              </div>
              <button
                type="button"
                (click)="closePodModal()"
                [disabled]="isSubmittingPod()"
                class="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              >
                <svg lucideX class="h-4 w-4"></svg>
              </button>
            </div>

            <!-- Form Content -->
            <div class="space-y-4 text-xs">
              <!-- Destination Summary -->
              <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 space-y-1">
                <span class="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider block">Delivering To</span>
                <p class="text-zinc-200 font-medium">{{ task.destination_address || '100 Nexus Distribution Way, Dock 4' }}</p>
                <p class="text-zinc-400 text-[11px]">{{ task.destination_city }}, {{ task.destination_region }} (Customer: {{ task.customer_name }})</p>
              </div>

              <!-- Recipient Name Input -->
              <div>
                <label class="block text-zinc-300 font-semibold mb-1">
                  Recipient Full Name <span class="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="podRecipientName"
                  placeholder="e.g. John Doe (Dock Supervisor)"
                  class="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <!-- 🖋️ Digital Signature Pad Canvas -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <svg lucidePenTool class="h-3.5 w-3.5 text-emerald-400"></svg>
                    <span>Recipient Digital Signature</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="adoptPresetSignature()"
                      class="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                      title="Generate clean digital signature stamp"
                    >
                      Use Digital Stamp
                    </button>
                    <button
                      type="button"
                      (click)="clearCanvas()"
                      class="text-[11px] font-medium text-zinc-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div class="relative rounded-xl border border-zinc-700/80 bg-zinc-900/90 overflow-hidden">
                  <canvas
                    #sigCanvas
                    width="440"
                    height="130"
                    (mousedown)="startDrawing($event)"
                    (mousemove)="draw($event)"
                    (mouseup)="stopDrawing()"
                    (mouseleave)="stopDrawing()"
                    (touchstart)="startDrawing($event)"
                    (touchmove)="draw($event)"
                    (touchend)="stopDrawing()"
                    class="w-full h-32 cursor-crosshair touch-none bg-zinc-950/80 block"
                  ></canvas>
                  <span class="absolute bottom-2 right-3 text-[10px] font-mono text-zinc-500 pointer-events-none select-none">
                    Sign on touchscreen or with mouse
                  </span>
                </div>
              </div>

              <!-- 📷 Dropoff Photo Verification -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <svg lucideCamera class="h-3.5 w-3.5 text-indigo-400"></svg>
                    <span>Package Dropoff Photo (Optional)</span>
                  </label>
                  <button
                    type="button"
                    (click)="useSamplePodPhoto()"
                    class="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Use Sample Photo
                  </button>
                </div>

                @if (!podPhotoUrl) {
                  <label class="flex flex-col items-center justify-center w-full h-24 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 transition cursor-pointer p-3 text-center">
                    <svg lucideImage class="h-6 w-6 text-zinc-500 mb-1"></svg>
                    <span class="text-[11px] font-medium text-zinc-300">Take Photo / Upload Dropoff Proof</span>
                    <span class="text-[10px] text-zinc-500">JPG, PNG up to 10MB</span>
                    <input type="file" (change)="onPodPhotoSelected($event)" accept="image/*" class="hidden" />
                  </label>
                } @else {
                  <div class="relative rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden max-h-36">
                    <img [src]="podPhotoUrl" alt="POD Photo" class="w-full h-36 object-cover" />
                    <button
                      type="button"
                      (click)="podPhotoUrl = ''"
                      class="absolute top-2 right-2 rounded-lg bg-zinc-950/80 border border-zinc-700 p-1.5 text-rose-400 hover:text-white transition cursor-pointer"
                    >
                      <svg lucideTrash2 class="h-3.5 w-3.5"></svg>
                    </button>
                  </div>
                }
              </div>

              <!-- Handover Notes -->
              <div>
                <label class="block text-zinc-300 font-semibold mb-1">Handover Notes / Instructions</label>
                <textarea
                  [(ngModel)]="podNotes"
                  rows="2"
                  placeholder="e.g. Package inspected, dock signoff confirmed."
                  class="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <!-- Checkbox verification -->
              <div class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 text-[11px] text-zinc-300">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" [(ngModel)]="podLocationVerified" class="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0" />
                  <span>GPS timestamp & physical location verified at customer address.</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" [(ngModel)]="podConditionVerified" class="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0" />
                  <span>Initiates the buyer's official 72-Hour Quality Inspection SLA.</span>
                </label>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                (click)="closePodModal()"
                [disabled]="isSubmittingPod()"
                class="rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                (click)="submitProofOfDelivery()"
                [disabled]="isSubmittingPod() || !podRecipientName.trim()"
                class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                @if (isSubmittingPod()) {
                  <svg lucideRefreshCw class="h-3.5 w-3.5 animate-spin"></svg>
                  <span>Submitting e-POD...</span>
                } @else {
                  <svg lucideCheck class="h-4 w-4"></svg>
                  <span>Submit POD & Complete Delivery</span>
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 💬 Delivery Partner to Customer Chat Drawer / Slide-Over Modal -->
      @if (isCourierChatOpen()) {
        <!-- Global Backdrop -->
        <div
          class="fixed inset-0 z-[99998] bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          (click)="closeCourierChat()"
        ></div>

        <!-- Slide-over Drawer -->
        <aside
          class="fixed inset-y-0 right-0 z-[99999] flex w-full max-w-md sm:max-w-lg flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right"
        >
          <!-- Drawer Header -->
          <div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-5 py-4 backdrop-blur-md">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/60 to-zinc-900 text-xl shadow-lg shrink-0">
                🧑‍💼
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white truncate">{{ chatTask()?.customer_name }}</h3>
                </div>
                <div class="text-xs text-zinc-400 font-mono mt-0.5">
                  <span class="truncate text-emerald-400">Verified Customer</span>
                </div>
              </div>
            </div>

            <!-- Top Actions: Close -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                (click)="closeCourierChat()"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                title="Close Chat"
              >
                <svg lucideX class="h-4.5 w-4.5"></svg>
              </button>
            </div>
          </div>

          <!-- Chat Conversation Scroll Area -->
          <div #chatContainer class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            <!-- System Security Chip & Auto-Reply Toggle -->
            <div class="flex flex-col items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] text-zinc-400">
                <svg lucideShieldCheck class="h-3.5 w-3.5 text-emerald-400"></svg>
                Direct encrypted dispatch channel with Customer
              </span>
              <button 
                (click)="toggleDriverAutoReply()"
                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition cursor-pointer active:scale-95"
                [class]="driverAutoReplyMode() === 'AI_BOT' ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'"
                title="Toggle AI Copilot for Customer Responses"
              >
                @if (driverAutoReplyMode() === 'AI_BOT') {
                  🤖 Copilot Auto-Reply: ENABLED
                } @else {
                  👨‍✈️ Manual Response Mode
                }
              </button>
            </div>

            <!-- Messages Stream -->
            @for (msg of courierChatMessages(); track msg.id) {
              @if (msg.sender === 'customer') {
                <!-- Customer Message Bubble (Left) -->
                <div class="flex items-start gap-2.5 max-w-[85%]">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 text-sm shadow">
                    🧑‍💼
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-bold text-emerald-400">{{ chatTask()?.customer_name }}</span>
                      <span class="text-[10px] text-zinc-500">{{ msg.time }}</span>
                    </div>
                    <div class="rounded-2xl rounded-tl-sm border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-300 shadow-sm">
                      {{ msg.text }}
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Courier Message Bubble (Right) -->
                <div class="flex items-start justify-end gap-2.5 ml-auto max-w-[85%]">
                  <div class="space-y-1 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <span class="text-[10px] text-zinc-500">{{ msg.time }}</span>
                      <span class="text-[11px] font-bold text-indigo-300">You</span>
                    </div>
                    <div class="rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-xs font-medium text-white shadow-md shadow-indigo-600/20 text-left">
                      {{ msg.text }}
                    </div>
                    <div class="flex items-center justify-end gap-1 text-[10px] text-emerald-400 font-mono">
                      <svg lucideCheckCheck class="h-3 w-3"></svg>
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Message Input Area -->
          <div class="border-t border-zinc-800/80 bg-zinc-900/60 p-4 sm:p-5">
            <form (ngSubmit)="sendChatMessage()" class="relative flex items-center">
              <input
                type="text"
                name="chatInput"
                [(ngModel)]="chatInputText"
                placeholder="Message customer..."
                autocomplete="off"
                class="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 py-2.5 sm:py-3 pl-4 pr-12 text-xs sm:text-sm text-white placeholder-zinc-500 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                [disabled]="!chatInputText().trim()"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                <svg lucideSend class="h-4 w-4"></svg>
              </button>
            </form>
          </div>
        </aside>
      }
    </div>
  `,
})
export class DeliveryPartnerPortalComponent implements OnInit, OnDestroy {
  private readonly partnerService = inject(DeliveryPartnerService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly socket = inject(OrderSocketService);
  private readonly http = inject(HttpClient);

  @ViewChild('sigCanvas') sigCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('chatContainer') chatContainerRef?: ElementRef<HTMLDivElement>;
  private isDrawing = false;
  private ctx: CanvasRenderingContext2D | null = null;
  private beaconInterval: any = null;
  private processedMessageIds = new Set<string>();

  constructor() {
    effect(() => {
      const created = this.socket.latestOrderCreated();
      if (created && this.isApproved()) {
        this.loadAvailableOrders();
      }
    });

    effect(() => {
      const updated = this.socket.latestStatusUpdated();
      if (updated && this.isApproved()) {
        this.loadTasks();
        this.loadAvailableOrders();
      }
    });

    effect(() => {
      const msg = this.socket.latestChatMessage();
      if (!msg || msg.sender !== 'customer') return;
      if (this.processedMessageIds.has(msg.id)) return;
      this.processedMessageIds.add(msg.id);

      const activeTask = this.tasks().find(t => t.id === msg.orderId);
      if (!activeTask) return;

      const currentTask = this.chatTask();
      const isDrawerOpenForTask = currentTask && currentTask.id === msg.orderId;

      this.chatHistories.update(hist => {
        const existing = hist[activeTask.id] || [];
        return { ...hist, [activeTask.id]: [...existing, msg as any] };
      });
      if (isDrawerOpenForTask) {
        this.scrollToChatBottom();
      }

      if (this.driverAutoReplyMode() === 'AI_BOT') {
        const currentHistForTask = this.chatHistories()[activeTask.id] || [];
        const recentHistory = currentHistForTask
          .slice(-5)
          .map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`)
          .join('\n');

        const prompt = `I am a delivery driver on my way to deliver order #${activeTask.id}. 
Here is the recent chat history with the customer:
${recentHistory}

The customer just messaged me. Analyze the chat history, especially my previous messages as COURIER. Reply on my behalf simulating a busy driver reacting to the ongoing conversation. Adapt to and mimic my exact communication style, tone, and vocabulary based on the history. Reply concisely with just the message content. Do NOT use markdown formatting, links, bullet points, quotes, or prefixes (like "COURIER:"). Reply in plain text only.`;
        
        this.http.post<{reply: string}>(`${environment.apiUrl}/chatbot/chat`, {
          message: prompt,
          activeOrderId: activeTask.id
        }).subscribe({
          next: (res) => {
            const replyText = res.reply || `🤖 Copilot: I am driving to your location. (Auto-reply to: "${msg.text}")`;
            this.socket.sendChatMessage({
              orderId: activeTask.id,
              text: replyText,
              sender: 'courier'
            });
            
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.chatHistories.update(hist => {
              const existing = hist[activeTask.id] || [];
              return { ...hist, [activeTask.id]: [
                ...existing,
                { id: `courier-${Date.now()}`, text: replyText, sender: 'courier', time: timeStr }
              ]};
            });
            if (isDrawerOpenForTask) {
              this.scrollToChatBottom();
            }
          },
          error: () => {
            const replyText = `🤖 Copilot: I am driving to your location.`;
            this.socket.sendChatMessage({
              orderId: activeTask.id,
              text: replyText,
              sender: 'courier'
            });
            
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.chatHistories.update(hist => {
              const existing = hist[activeTask.id] || [];
              return { ...hist, [activeTask.id]: [
                ...existing,
                { id: `courier-${Date.now()}`, text: replyText, sender: 'courier', time: timeStr }
              ]};
            });
            if (isDrawerOpenForTask) {
              this.scrollToChatBottom();
            }
          }
        });
      }
    });
  }

  readonly OrderStatuses = OrderStatuses;
  readonly docDefs = REQUIRED_DOC_TYPES;

  readonly activeTab = signal<PortalTab>('available');
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly claimingOrderId = signal<string | null>(null);

  readonly profile = signal<DeliveryPartnerProfile | null>(null);
  readonly tasks = signal<DeliveryPartnerTask[]>([]);
  readonly availableOrders = signal<any[]>([]);

  // Proof of Delivery State
  readonly podModalTask = signal<DeliveryPartnerTask | null>(null);
  readonly isSubmittingPod = signal(false);
  podRecipientName = '';
  podNotes = 'Physical consignment inspected and handed over in good condition.';
  podPhotoUrl = '';
  podLocationVerified = true;
  podConditionVerified = true;

  // Live Location Beacon State
  readonly isBeaconActive = signal(false);
  readonly activeBeaconOrderId = signal<string | null>(null);
  readonly currentDriverLat = signal<number>(37.7749);
  readonly currentDriverLng = signal<number>(-122.4194);
  readonly currentDriverSpeed = signal<number>(42);
  readonly currentDriverHeading = signal<number>(75);
  readonly lastPingTimestamp = signal<string | null>(null);

  readonly isApproved = computed(
    () => this.profile()?.verification_status === 'APPROVED',
  );
  readonly isRejected = computed(
    () => this.profile()?.verification_status === 'REJECTED',
  );
  readonly isPendingSubmission = computed(
    () =>
      this.profile()?.verification_status === 'PENDING_SUBMISSION' ||
      (this.profile()?.documents || []).length < 4,
  );
  readonly isAdmin = computed(() => {
    const role = this.auth.role();
    return role === 'ADMIN' || role === 'SUBADMIN';
  });

  readonly uploadedCount = computed(() => {
    const docs = this.profile()?.documents || [];
    return docs.length;
  });

  ngOnInit() {
    this.refreshAll();
  }

  ngOnDestroy() {
    if (this.beaconInterval) {
      clearInterval(this.beaconInterval);
      this.beaconInterval = null;
    }
  }

  refreshAll() {
    this.loading.set(true);
    this.partnerService.getProfile().subscribe({
      next: (prof) => {
        this.profile.set(prof);
        if (prof.verification_status === 'APPROVED') {
          this.loadTasks();
          this.loadAvailableOrders();
        } else {
          this.activeTab.set('kyc');
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadTasks() {
    this.partnerService.getMyTasks().subscribe({
      next: (res) => {
        const tList = res.tasks || [];
        this.tasks.set(tList);
        this.loading.set(false);

        for (const t of tList) {
          if (t.status !== OrderStatuses.DELIVERED && t.status !== OrderStatuses.CANCELLED) {
            this.socket.joinOrder(t.id);
          }
        }

        // If any task is out for delivery, sync beacon coordinates
        const outTask = tList.find((t) => t.status === OrderStatuses.OUT_FOR_DELIVERY);
        if (outTask) {
          if (!this.activeBeaconOrderId()) {
            this.activeBeaconOrderId.set(outTask.id);
          }
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadAvailableOrders() {
    this.partnerService.getAvailableOrders().subscribe({
      next: (res) => {
        this.availableOrders.set(res.availableOrders || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  acceptDeliveryOrder(orderId: string) {
    this.claimingOrderId.set(orderId);
    this.partnerService.acceptOrder(orderId).subscribe({
      next: () => {
        this.claimingOrderId.set(null);
        this.toast.success('🎉 Delivery dispatch accepted! Added to your active runs.');
        this.loadTasks();
        this.loadAvailableOrders();
        this.activeTab.set('tasks');
      },
      error: (err) => {
        this.claimingOrderId.set(null);
        this.toast.error(err.error?.message || 'Failed to accept delivery dispatch');
      },
    });
  }

  getDocForType(type: string): DeliveryPartnerDocument | undefined {
    return (this.profile()?.documents || []).find((d) => d.type === type);
  }

  loadTestDoc(type: 'DRIVING_LICENSE' | 'VEHICLE_RC' | 'GOVT_ID' | 'TRANSIT_INSURANCE', name: string, url: string) {
    this.uploading.set(true);
    this.partnerService
      .uploadDocument({
        type,
        name,
        url,
        fileSize: '1.8 MB',
      })
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.uploading.set(false);
          this.toast.success(`Demo document loaded: ${name}`);
        },
        error: (err) => {
          this.uploading.set(false);
          this.toast.error(err.error?.message || 'Failed to upload document');
        },
      });
  }

  onFileSelected(event: Event, type: any, title: string) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      this.partnerService
        .uploadDocument({
          type,
          name: file.name,
          url: dataUrl,
          fileSize,
        })
        .subscribe({
          next: (updated) => {
            this.profile.set(updated);
            this.uploading.set(false);
            this.toast.success(`${title} uploaded successfully!`);
          },
          error: (err) => {
            this.uploading.set(false);
            this.toast.error(err.error?.message || 'Failed to upload document');
          },
        });
    };
    reader.readAsDataURL(file);
  }

  startDeliveryRun(orderId: string) {
    this.partnerService
      .updateTaskStatus(orderId, OrderStatuses.OUT_FOR_DELIVERY, {
        checkpointNote: `Delivery partner ${this.profile()?.full_name} is en route to recipient address`,
      })
      .subscribe({
        next: () => {
          this.toast.success('Run started! Order marked as Out For Delivery.');
          this.activeBeaconOrderId.set(orderId);
          this.sendLocationPing(orderId);
          this.loadTasks();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to start run');
        },
      });
  }

  // --- 🛰️ Real-Time GPS Location Beacon Methods ---

  sendLocationPing(orderId: string) {
    let lat = this.currentDriverLat();
    let lng = this.currentDriverLng();

    // Check if real browser geolocation is supported and permitted
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          this.currentDriverLat.set(lat);
          this.currentDriverLng.set(lng);
          this.currentDriverSpeed.set(Math.round(pos.coords.speed ? pos.coords.speed * 3.6 : 38));
          this.currentDriverHeading.set(Math.round(pos.coords.heading || 75));
          this.dispatchPing(orderId, lat, lng);
        },
        () => {
          // Fallback to simulated beacon coordinates
          this.dispatchPing(orderId, lat, lng);
        },
        { timeout: 4000, enableHighAccuracy: true },
      );
    } else {
      this.dispatchPing(orderId, lat, lng);
    }
  }

  private dispatchPing(orderId: string, lat: number, lng: number) {
    const heading = this.currentDriverHeading();
    const speed = this.currentDriverSpeed();

    this.socket.emitDriverLocation({
      orderId,
      latitude: lat,
      longitude: lng,
      heading,
      speed,
    });

    this.partnerService
      .updateLocationPing({
        orderId,
        latitude: lat,
        longitude: lng,
        heading,
        speed,
      })
      .subscribe({
        next: () => {
          const now = new Date().toLocaleTimeString();
          this.lastPingTimestamp.set(now);
          this.toast.info(`📍 GPS Beacon sent (${lat.toFixed(4)}, ${lng.toFixed(4)}) at ${now}`);
        },
        error: () => {},
      });
  }

  simulateNextBeaconStep(task: DeliveryPartnerTask) {
    // Progress coordinates smoothly along route
    const currentLat = this.currentDriverLat();
    const currentLng = this.currentDriverLng();

    // Small random delta moving towards destination
    const deltaLat = (Math.random() * 0.003 - 0.001);
    const deltaLng = (Math.random() * 0.003 - 0.001);

    const nextLat = currentLat + deltaLat;
    const nextLng = currentLng + deltaLng;

    this.currentDriverLat.set(nextLat);
    this.currentDriverLng.set(nextLng);
    this.currentDriverSpeed.set(Math.floor(30 + Math.random() * 25));
    this.currentDriverHeading.set(Math.floor(Math.random() * 360));

    this.dispatchPing(task.id, nextLat, nextLng);
  }

  toggleAutoBeacon(orderId: string) {
    if (this.isBeaconActive()) {
      if (this.beaconInterval) {
        clearInterval(this.beaconInterval);
        this.beaconInterval = null;
      }
      this.isBeaconActive.set(false);
      this.toast.info('Auto-beacon stopped.');
    } else {
      this.isBeaconActive.set(true);
      this.sendLocationPing(orderId);
      this.beaconInterval = setInterval(() => {
        const t = this.tasks().find((item) => item.id === orderId);
        if (t && t.status === OrderStatuses.OUT_FOR_DELIVERY) {
          this.simulateNextBeaconStep(t);
        } else {
          this.toggleAutoBeacon(orderId);
        }
      }, 4000);
      this.toast.success('🟢 Live GPS Auto-Beacon active (pinging every 4s)');
    }
  }

  // --- 📝 Proof of Delivery (POD) Modal & Canvas Methods ---

  openPodModal(task: DeliveryPartnerTask) {
    this.podModalTask.set(task);
    this.podRecipientName = task.recipient_name || task.customer_name || 'Designated Receiving Officer';
    this.podNotes = 'Physical consignment inspected and handed over in good condition.';
    this.podPhotoUrl = '';
    this.podLocationVerified = true;
    this.podConditionVerified = true;

    setTimeout(() => {
      this.initCanvas();
    }, 150);
  }

  closePodModal() {
    if (this.isSubmittingPod()) return;
    this.podModalTask.set(null);
  }

  initCanvas() {
    const canvas = this.sigCanvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.ctx.strokeStyle = '#34d399'; // Emerald glowing stroke
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.clearCanvas();
  }

  clearCanvas() {
    const canvas = this.sigCanvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.fillStyle = '#09090b';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  startDrawing(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    this.isDrawing = true;
    const pos = this.getCanvasPos(e);
    if (!pos || !this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing || !this.ctx) return;
    e.preventDefault();
    const pos = this.getCanvasPos(e);
    if (!pos) return;
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  private getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
    const canvas = this.sigCanvasRef?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    return null;
  }

  adoptPresetSignature() {
    const canvas = this.sigCanvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.clearCanvas();

    this.ctx.font = 'italic 26px "Brush Script MT", "Caveat", "Segoe Script", cursive';
    this.ctx.fillStyle = '#34d399';
    this.ctx.fillText(this.podRecipientName || 'Authorized Signoff', 30, 70);

    this.ctx.font = '10px monospace';
    this.ctx.fillStyle = '#71717a';
    this.ctx.fillText(`VERIFIED POD • ${new Date().toISOString()}`, 30, 105);
  }

  onPodPhotoSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.podPhotoUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  useSamplePodPhoto() {
    this.podPhotoUrl =
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
    this.toast.success('Sample package handover photo loaded.');
  }

  submitProofOfDelivery() {
    const task = this.podModalTask();
    if (!task) return;

    this.isSubmittingPod.set(true);

    const signatureDataUrl = this.sigCanvasRef?.nativeElement?.toDataURL('image/png') || '';

    this.partnerService
      .submitProofOfDelivery(task.id, {
        recipientName: this.podRecipientName.trim() || task.customer_name,
        notes: this.podNotes.trim(),
        signatureDataUrl,
        photoUrl: this.podPhotoUrl,
        latitude: this.currentDriverLat(),
        longitude: this.currentDriverLng(),
      })
      .subscribe({
        next: () => {
          this.isSubmittingPod.set(false);
          this.closePodModal();
          this.toast.success('🎉 Proof of Delivery submitted! Order marked DELIVERED.');
          if (this.isBeaconActive()) {
            this.toggleAutoBeacon(task.id);
          }
          this.loadTasks();
        },
        error: (err) => {
          this.isSubmittingPod.set(false);
          this.toast.error(err.error?.message || 'Failed to submit Proof of Delivery');
        },
      });
  }

  // Chat State
  readonly isCourierChatOpen = signal(false);
  readonly chatTask = signal<any>(null);
  readonly chatInputText = signal('');
  readonly chatHistories = signal<Record<string, {id: string | number, text: string, sender: 'courier'|'customer', time: string}[]>>({});
  readonly courierChatMessages = computed(() => {
    const task = this.chatTask();
    if (!task) return [];
    return this.chatHistories()[task.id] || [];
  });
  readonly driverAutoReplyMode = signal<'AI_BOT' | 'MANUAL'>('AI_BOT');

  toggleDriverAutoReply(): void {
    this.driverAutoReplyMode.set(this.driverAutoReplyMode() === 'AI_BOT' ? 'MANUAL' : 'AI_BOT');
    this.toast.info(
      this.driverAutoReplyMode() === 'AI_BOT' 
        ? '🤖 Copilot Auto-Reply Enabled: AI will draft and send standard responses while driving.'
        : '👨‍✈️ Manual Mode: You must manually type responses.'
    );
  }

  openCourierChat(task: any) {
    this.chatTask.set(task);
    this.isCourierChatOpen.set(true);
    
    const existingHist = this.chatHistories()[task.id];
    if (!existingHist || existingHist.length === 0) {
      this.chatHistories.update(hist => ({
        ...hist,
        [task.id]: [
          {
            id: Date.now(),
            text: `Hi ${task.customer_name}, I'm your Nexus delivery partner. I'm on my way with your package!`,
            sender: 'courier',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      }));
    }
    this.scrollToChatBottom();
  }

  closeCourierChat() {
    this.isCourierChatOpen.set(false);
  }

  sendChatMessage() {
    const text = this.chatInputText().trim();
    if (!text || !this.chatTask()) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const taskId = this.chatTask().id;
    this.chatHistories.update(hist => {
      const existing = hist[taskId] || [];
      return { ...hist, [taskId]: [
        ...existing,
        {
          id: `courier-${Date.now()}`,
          text,
          sender: 'courier',
          time: timeStr
        }
      ]};
    });
    this.chatInputText.set('');

    this.socket.sendChatMessage({
      orderId: taskId,
      text,
      sender: 'courier'
    });
    this.scrollToChatBottom();
  }

  scrollToChatBottom() {
    setTimeout(() => {
      if (this.chatContainerRef?.nativeElement) {
        this.chatContainerRef.nativeElement.scrollTop = this.chatContainerRef.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
