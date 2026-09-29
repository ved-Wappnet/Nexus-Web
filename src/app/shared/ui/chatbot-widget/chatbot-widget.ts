import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  LucideArrowLeft,
  LucideBookOpen,
  LucideBot,
  LucideCheck,
  LucideCheckCheck,
  LucideChevronDown,
  LucideChevronUp,
  LucideCopy,
  LucideDownload,
  LucideFileText,
  LucideHistory,
  LucideLifeBuoy,
  LucideLoader2,
  LucideMaximize2,
  LucideMessageSquare,
  LucideMic,
  LucideMicOff,
  LucideMinimize2,
  LucideMoreVertical,
  LucidePaperclip,
  LucidePlay,
  LucideRotateCcw,
  LucideSearch,
  LucideSend,
  LucideShoppingCart,
  LucideSmile,
  LucideSparkles,
  LucideThumbsDown,
  LucideThumbsUp,
  LucideTrash2,
  LucideUser,
  LucideVolume2,
  LucideVolumeX,
  LucideX,
} from '@lucide/angular';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { CartService } from '../../../core/services/cart.service';
import { ChatAttachment, ChatSession, ChatbotService, FaqCategory } from '../../../core/services/chatbot.service';

import { OrderService } from '../../../core/services/catalog.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { OrderView } from '../../../core/models';
import { Select, SelectOption } from '../select/select';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    LucideArrowLeft,
    LucideBot,
    LucideX,
    LucideSend,
    LucideSparkles,
    LucideRotateCcw,
    LucideLoader2,
    LucideMaximize2,
    LucideMinimize2,
    LucideUser,
    LucideCopy,
    LucideCheck,
    LucideCheckCheck,
    LucideVolume2,
    LucideVolumeX,
    LucideMic,
    LucideMicOff,
    LucideSmile,
    LucidePaperclip,
    LucideFileText,
    LucideDownload,
    LucidePlay,
    LucideHistory,
    LucideMessageSquare,
    LucideTrash2,
    LucideChevronDown,
    LucideChevronUp,
    LucideSearch,
    LucideMoreVertical,
    LucideLifeBuoy,
    LucideShoppingCart,
    LucideThumbsUp,
    LucideThumbsDown,
    LucideBookOpen,
    Select,
  ],
  template: `
    <!-- Floating Trigger Button (Positioned at bottom-right) -->
    <div class="fixed bottom-6 right-6 z-[99999] flex flex-col items-end pointer-events-auto select-none">
      <button
        type="button"
        (click)="handleToggleChat()"
        style="background: linear-gradient(135deg, #4338ca 0%, #4f46e5 50%, #6366f1 100%);"
        class="bot-glow-btn group relative flex items-center justify-center w-14 h-14 rounded-2xl text-white hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border border-indigo-300/40 shadow-2xl"
        aria-label="Toggle AI Support Assistant"
        title="Nexus AI Support Assistant (Ctrl + / or ⌘K)"
      >
        <!-- Inner Glow Overlay -->
        <span class="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>

        <!-- AI Bot / Close Icon -->
        @if (!chatbotService.isOpen()) {
          <svg lucideBot class="w-7 h-7 text-white transform group-hover:rotate-12 transition-transform duration-300"></svg>
        } @else {
          <svg lucideX class="w-6 h-6 text-white transform group-hover:rotate-90 transition-transform duration-300"></svg>
        }

        <!-- Online Pulse Badge -->
        <span class="absolute -top-1 -right-1 flex h-4 w-4">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-zinc-950 shadow-sm"></span>
        </span>
      </button>
    </div>

    <!-- Glassmorphic Chat Window Drawer -->
    @if (chatbotService.isOpen()) {
      <div
        [style.width]="isMobile() ? '100vw' : (isExpanded ? '760px' : '465px')"
        [style.height]="isMobile() ? '100dvh' : (isExpanded ? '620px' : '580px')"
        [style.max-height]="isMobile() ? '100dvh' : '80vh'"
        style="background: rgba(12, 12, 16, 0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);"
        class="fixed z-[99999] flex flex-col transition-all duration-300 ease-in-out max-sm:inset-0 max-sm:w-full max-sm:h-[100dvh] max-sm:rounded-none max-sm:border-0 sm:bottom-24 sm:right-6 sm:max-w-[calc(100vw-2rem)] sm:rounded-3xl sm:border sm:border-indigo-500/30 sm:shadow-2xl sm:shadow-black/90 overflow-hidden"
      >
        <!-- Mobile Handle Drag Indicator -->
        @if (isMobile()) {
          <div class="pt-2 pb-1 bg-zinc-950/95 flex justify-center items-center select-none border-b border-zinc-900">
            <div class="w-12 h-1 rounded-full bg-zinc-700"></div>
          </div>
        }
        <!-- Header -->
        <div class="px-4 py-3 bg-gradient-to-r from-zinc-900/95 via-indigo-950/40 to-zinc-900/95 border-b border-indigo-500/20 flex items-center justify-between gap-3 select-none relative">
          <!-- Left: Bot Avatar & Title -->
          <div class="flex items-center gap-2.5 min-w-0">
            <div
              style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.35) 0%, rgba(99, 102, 241, 0.15) 100%);"
              class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-400/40 text-indigo-300 shadow-md shadow-indigo-950/80 flex-shrink-0"
            >
              <svg lucideBot class="w-5 h-5 text-indigo-300"></svg>
              <!-- Integrated Status Indicator -->
              <span class="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-zinc-950"></span>
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Nexus AI Assistant</h3>
                <span class="inline-flex items-center gap-1 rounded-md border border-indigo-400/30 bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300 shadow-xs flex-shrink-0">
                  <svg lucideSparkles class="w-2.5 h-2.5 text-indigo-400"></svg>
                  Live
                </span>
              </div>
              <p class="text-[11px] text-zinc-400 font-normal truncate mt-0.5 whitespace-nowrap">
                Support & Marketplace Companion
              </p>
            </div>
          </div>

          <!-- Right: Consolidated Header Action Buttons -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- Search in Chat Button -->
            <button
              type="button"
              (click)="toggleSearchBar()"
              [title]="showSearchBar ? 'Close Search' : 'Search in Conversation'"
              [class.bg-indigo-600\/30]="showSearchBar"
              [class.text-indigo-300]="showSearchBar"
              [class.border-indigo-500\/40]="showSearchBar"
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-300 hover:bg-indigo-950/30 transition cursor-pointer"
            >
              <svg lucideSearch class="w-3.5 h-3.5"></svg>
            </button>

            <!-- Expand / Restore Toggle Button -->
            <button
              type="button"
              (click)="toggleExpand()"
              [title]="isExpanded ? 'Restore Normal Size' : 'Expand Chat Window'"
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-300 hover:bg-indigo-950/30 transition cursor-pointer"
            >
              @if (!isExpanded) {
                <svg lucideMaximize2 class="w-3.5 h-3.5"></svg>
              } @else {
                <svg lucideMinimize2 class="w-3.5 h-3.5"></svg>
              }
            </button>

            <!-- More Options Dropdown -->
            <div class="relative">
              <button
                type="button"
                (click)="toggleOptionsMenu()"
                title="More Options"
                [class.bg-indigo-600\/30]="showOptionsMenu"
                [class.text-indigo-300]="showOptionsMenu"
                [class.border-indigo-500\/40]="showOptionsMenu"
                class="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-indigo-500/40 hover:text-indigo-300 hover:bg-indigo-950/30 transition cursor-pointer"
              >
                <svg lucideMoreVertical class="w-3.5 h-3.5"></svg>
              </button>

              @if (showOptionsMenu) {
                <!-- Backdrop for outside click -->
                <div class="fixed inset-0 z-40" (click)="showOptionsMenu = false"></div>

                <div
                  class="absolute right-0 mt-2 w-52 rounded-xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl shadow-black/90 py-1.5 z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                >
                  <!-- Past Conversations -->
                  <button
                    type="button"
                    (click)="openPastConversations()"
                    class="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-indigo-600/20 flex items-center justify-between transition cursor-pointer"
                  >
                    <span class="flex items-center gap-2">
                      <svg lucideHistory class="w-3.5 h-3.5 text-indigo-400"></svg>
                      {{ showHistoryPanel ? 'Active Chat' : 'Past Conversations' }}
                    </span>
                    @if (chatbotService.pastSessions().length > 0) {
                      <span class="px-1.5 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-500/30 text-[10px] text-indigo-300 font-semibold">
                        {{ chatbotService.pastSessions().length }}
                      </span>
                    }
                  </button>

                  <!-- Export Transcript -->
                  <button
                    type="button"
                    (click)="triggerExport()"
                    class="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    <svg lucideDownload class="w-3.5 h-3.5 text-indigo-400"></svg>
                    <span>Export Transcript (.txt)</span>
                  </button>

                  <!-- FAQs & Store Policy -->
                  <button
                    type="button"
                    (click)="openFaqPanel()"
                    class="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    <svg lucideBookOpen class="w-3.5 h-3.5 text-indigo-400"></svg>
                    <span>Store Policies & FAQs</span>
                  </button>

                  <div class="my-1 border-t border-zinc-800"></div>


                  <!-- Audio Chimes Toggle -->
                  <button
                    type="button"
                    (click)="toggleSoundPreference()"
                    class="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-indigo-600/20 flex items-center justify-between transition cursor-pointer"
                  >
                    <span class="flex items-center gap-2">
                      @if (soundEnabled) {
                        <svg lucideVolume2 class="w-3.5 h-3.5 text-indigo-400"></svg>
                      } @else {
                        <svg lucideVolumeX class="w-3.5 h-3.5 text-zinc-500"></svg>
                      }
                      <span>Sound Chimes</span>
                    </span>
                    <span
                      [class.bg-emerald-500\/20]="soundEnabled"
                      [class.text-emerald-400]="soundEnabled"
                      [class.border-emerald-500\/30]="soundEnabled"
                      [class.bg-zinc-800]="!soundEnabled"
                      [class.text-zinc-500]="!soundEnabled"
                      class="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                    >
                      {{ soundEnabled ? 'ON' : 'OFF' }}
                    </span>
                  </button>

                  <!-- Typewriter Streaming Toggle -->
                  <button
                    type="button"
                    (click)="chatbotService.toggleTypewriterPreference()"
                    class="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-indigo-600/20 flex items-center justify-between transition cursor-pointer"
                  >
                    <span class="flex items-center gap-2">
                      <svg lucideSparkles class="w-3.5 h-3.5 text-indigo-400"></svg>
                      <span>Typewriter Stream</span>
                    </span>
                    <span
                      [class.bg-emerald-500\/20]="chatbotService.isTypewriterEnabled()"
                      [class.text-emerald-400]="chatbotService.isTypewriterEnabled()"
                      [class.border-emerald-500\/30]="chatbotService.isTypewriterEnabled()"
                      [class.bg-zinc-800]="!chatbotService.isTypewriterEnabled()"
                      [class.text-zinc-500]="!chatbotService.isTypewriterEnabled()"
                      class="px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                    >
                      {{ chatbotService.isTypewriterEnabled() ? 'ON' : 'OFF' }}
                    </span>
                  </button>

                  <!-- Human Support Escalation -->
                  <button
                    type="button"
                    (click)="openQuickTicketModal(); showOptionsMenu = false"
                    class="w-full px-3 py-2 text-left text-xs text-indigo-300 hover:text-white hover:bg-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    <svg lucideLifeBuoy class="w-3.5 h-3.5 text-indigo-400"></svg>
                    <span>Create Support Ticket</span>
                  </button>

                  <div class="my-1 border-t border-zinc-800"></div>

                  <!-- New Chat / Reset -->
                  <button
                    type="button"
                    (click)="triggerNewChat()"
                    class="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:text-white hover:bg-red-500/15 hover:text-red-300 flex items-center gap-2 transition cursor-pointer"
                  >
                    <svg lucideRotateCcw class="w-3.5 h-3.5 text-zinc-400"></svg>
                    <span>New Chat / Reset</span>
                  </button>
                </div>
              }
            </div>

            <!-- Close Button -->
            <button
              type="button"
              (click)="handleToggleChat()"
              title="Close Assistant"
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-950/30 transition cursor-pointer"
            >
              <svg lucideX class="w-3.5 h-3.5"></svg>
            </button>
          </div>
        </div>

        <!-- In-Chat Search Bar -->
        @if (showSearchBar && !showHistoryPanel) {
          <div class="px-3 py-2 bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
            <div class="relative flex-1 flex items-center min-w-0">
              <svg lucideSearch class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none"></svg>
              <input
                #searchInput
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
                (keydown.enter)="onSearchEnter($event)"
                placeholder="Find in chat..."
                class="w-full pl-8 pr-7 py-1 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition"
              />
              @if (searchQuery) {
                <button
                  type="button"
                  (click)="clearSearch()"
                  class="absolute right-2 text-zinc-400 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <svg lucideX class="w-3 h-3"></svg>
                </button>
              }
            </div>

            @if (searchQuery.trim()) {
              <!-- Current / Total Match Count Badge -->
              <span class="text-[10px] text-zinc-300 whitespace-nowrap bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-800 flex items-center gap-1 flex-shrink-0">
                @if (getTotalMatchCount() > 0) {
                  <span class="text-amber-400 font-bold">{{ currentMatchIndex + 1 }}</span>
                  <span class="text-zinc-500">/</span>
                  <span class="text-zinc-300 font-medium">{{ getTotalMatchCount() }}</span>
                } @else {
                  <span class="text-zinc-500 font-medium">0/0</span>
                }
              </span>

              <!-- Previous Match Button (Up) -->
              <button
                type="button"
                (click)="prevMatch()"
                [disabled]="getTotalMatchCount() === 0"
                title="Previous match (Shift+Enter)"
                class="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex-shrink-0"
              >
                <svg lucideChevronUp class="w-3.5 h-3.5"></svg>
              </button>

              <!-- Next Match Button (Down) -->
              <button
                type="button"
                (click)="nextMatch()"
                [disabled]="getTotalMatchCount() === 0"
                title="Next match (Enter)"
                class="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex-shrink-0"
              >
                <svg lucideChevronDown class="w-3.5 h-3.5"></svg>
              </button>
            }

            <button
              type="button"
              (click)="toggleSearchBar()"
              class="text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer px-1 font-medium flex-shrink-0"
            >
              Close
            </button>
          </div>
        }

        @if (showHistoryPanel) {
          <!-- Past Conversations View -->
          <div class="flex-1 flex flex-col bg-zinc-950/95 overflow-hidden animate-in fade-in duration-150 select-none">
            <!-- History Sub-Header Bar -->
            <div class="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                (click)="showHistoryPanel = false; forceScrollToBottom(false)"
                class="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer font-medium"
              >
                <svg lucideArrowLeft class="w-3.5 h-3.5"></svg>
                <span>Back to Active Chat</span>
              </button>

              @if (chatbotService.pastSessions().length > 0) {
                <button
                  type="button"
                  (click)="chatbotService.clearAllPastSessions()"
                  class="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="Clear all archived sessions"
                >
                  <svg lucideTrash2 class="w-3 h-3"></svg>
                  <span>Clear All</span>
                </button>
              }
            </div>

            <!-- History Search Filter -->
            @if (chatbotService.pastSessions().length > 1) {
              <div class="px-3.5 py-2 bg-zinc-900/60 border-b border-zinc-800/80">
                <div class="relative flex items-center">
                  <svg lucideSearch class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none"></svg>
                  <input
                    type="text"
                    [(ngModel)]="sessionSearchQuery"
                    placeholder="Search past sessions..."
                    class="w-full pl-8 pr-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            }

            <!-- Sessions List -->
            <div class="flex-1 p-3.5 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-zinc-800">
              @if (chatbotService.pastSessions().length === 0) {
                <div class="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                    <svg lucideHistory class="w-6 h-6"></svg>
                  </div>
                  <p class="text-xs font-semibold text-zinc-300">No Archived Conversations</p>
                  <p class="text-[11px] text-zinc-500 mt-1 max-w-[240px]">
                    When you click Reset (🔄) or start a new chat, your previous conversation will automatically be saved here with full timings and history.
                  </p>
                </div>
              } @else {
                @for (sess of filteredPastSessions(); track sess.id) {
                  <div
                    (click)="selectSession(sess.id)"
                    class="group relative flex flex-col p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-850/80 transition-all cursor-pointer shadow-xs"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-6 h-6 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                          <svg lucideMessageSquare class="w-3 h-3"></svg>
                        </div>
                        <h4 class="text-xs font-semibold text-zinc-200 group-hover:text-indigo-200 truncate" [innerHTML]="highlightSessionText(sess.title)">
                        </h4>
                      </div>
                      <button
                        type="button"
                        (click)="chatbotService.deleteSession(sess.id, $event)"
                        class="opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-500 transition p-1 cursor-pointer flex-shrink-0"
                        title="Delete this session"
                      >
                        <svg lucideTrash2 class="w-3.5 h-3.5"></svg>
                      </button>
                    </div>

                    @if (sess.lastMessage) {
                      <p class="text-[11px] text-zinc-400 mt-1.5 line-clamp-1" [innerHTML]="highlightSessionText(sess.lastMessage)">
                      </p>
                    }

                    <div class="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800/60">
                      <span>{{ sess.timestamp | date:'MMM d, y • h:mm a' }}</span>
                      <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px] font-medium">
                        {{ sess.messages.length }} msgs
                      </span>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        } @else if (showFaqPanel) {
          <!-- FAQs & Store Policy Live Browser -->
          <div class="flex-1 flex flex-col bg-zinc-950/95 overflow-hidden animate-in fade-in duration-150 select-none">
            <!-- FAQ Header Bar -->
            <div class="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                (click)="showFaqPanel = false; forceScrollToBottom(false)"
                class="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer font-medium"
              >
                <svg lucideArrowLeft class="w-3.5 h-3.5"></svg>
                <span>Back to Chat</span>
              </button>
              <span class="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <svg lucideBookOpen class="w-3.5 h-3.5 text-indigo-400"></svg>
                <span>Store Policies & FAQs</span>
              </span>
            </div>

            <!-- FAQ Category Accordion List -->
            <div class="flex-1 p-3.5 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
              @for (cat of chatbotService.faqs(); track cat.id) {
                <div class="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-3.5 shadow-sm space-y-2.5">
                  <div class="flex items-center gap-2">
                    <h4 class="text-xs font-bold text-white tracking-tight">{{ cat.title }}</h4>
                  </div>
                  <p class="text-[11px] text-zinc-400 leading-relaxed">{{ cat.summary }}</p>

                  <div class="space-y-2 pt-1 border-t border-zinc-800/60">
                    @for (faq of cat.faqs; track faq.question) {
                      <div class="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 space-y-1.5">
                        <div class="flex items-start justify-between gap-2">
                          <p class="text-xs font-semibold text-indigo-300">{{ faq.question }}</p>
                          <button
                            type="button"
                            (click)="askFaqQuestion(faq.question)"
                            class="text-[10px] text-indigo-400 hover:text-white bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-indigo-600/40 transition cursor-pointer shrink-0"
                            title="Ask AI about this"
                          >
                            <span>Ask AI</span>
                            <svg lucideSend class="w-2.5 h-2.5"></svg>
                          </button>
                        </div>
                        <p class="text-[11px] text-zinc-300 leading-relaxed">{{ faq.answer }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Messages Body Container Wrapper (relative) -->
          <div class="relative flex-1 flex flex-col min-h-0 overflow-hidden">

            <div
              #scrollContainer
              (scroll)="onMessagesScroll($event)"
              (click)="onChatClick($event)"
              class="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 selection:bg-indigo-500/40 select-text"
            >
              @for (msg of chatbotService.messages(); track msg.id; let idx = $index) {
                <!-- WhatsApp-Style Date Divider Pill -->
                @if (shouldShowDateDivider(idx)) {
                  <div class="flex items-center justify-center my-2 select-none">
                    <span class="px-3 py-0.5 rounded-full text-[10px] font-medium bg-zinc-900/90 border border-zinc-800/80 text-zinc-400 shadow-xs">
                      {{ getDateDividerLabel(msg.timestamp) }}
                    </span>
                  </div>
                }

                <div
                  [class.flex-row-reverse]="msg.role === 'user'"
                  [class.opacity-30]="searchQuery.trim() && !isMessageMatch(msg.content)"
                  [class.scale-[1.01]]="searchQuery.trim() && isMessageMatch(msg.content)"
                  class="group relative flex items-start gap-3 transition-all duration-200"
                >
              <!-- Avatar Icon -->
              <div
                [style.background]="msg.role === 'user' ? '#4338ca' : 'rgba(30, 27, 75, 0.9)'"
                [style.border-color]="msg.role === 'user' ? 'rgba(129, 140, 248, 0.4)' : 'rgba(99, 102, 241, 0.3)'"
                class="w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-md select-none mt-1"
              >
                @if (msg.role === 'user') {
                  <svg lucideUser class="w-4 h-4 text-white"></svg>
                } @else {
                  <svg lucideBot class="w-4 h-4 text-indigo-300"></svg>
                }
              </div>

              <!-- Message Bubble Container -->
              <div class="relative flex flex-col min-w-0" [class.items-end]="msg.role === 'user'" [style.max-width]="isExpanded ? '95%' : (msg.content.includes('|') ? '96%' : '85%')">
                <!-- WhatsApp / Instagram Hover Reaction Bar -->
                <div
                  [class.right-0]="msg.role === 'user'"
                  [class.left-0]="msg.role === 'assistant'"
                  class="absolute -top-7.5 z-20 hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900/95 border border-zinc-700/80 shadow-lg shadow-black/60 select-none animate-in fade-in zoom-in-95 duration-150"
                >
                  @for (reaction of reactionEmojis; track reaction) {
                    <button
                      type="button"
                      (click)="toggleReaction(msg.id, reaction)"
                      class="text-xs hover:scale-130 active:scale-90 transition-transform cursor-pointer px-0.5 py-0.5 leading-none"
                    >
                      {{ reaction }}
                    </button>
                  }
                </div>

                <!-- Message Bubble -->
                <div
                  [style.background]="msg.role === 'user' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'rgba(24, 24, 27, 0.95)'"
                  [class.text-white]="msg.role === 'user'"
                  [class.text-zinc-100]="msg.role === 'assistant'"
                  [class.border]="msg.role === 'assistant'"
                  [class.border-indigo-500\/20]="msg.role === 'assistant'"
                  [class.rounded-tr-xs]="msg.role === 'user'"
                  [class.rounded-tl-xs]="msg.role === 'assistant'"
                  [class.ring-2]="searchQuery.trim() && isMessageMatch(msg.content)"
                  [class.ring-amber-400\/70]="searchQuery.trim() && isMessageMatch(msg.content)"
                  class="w-full min-w-0 px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-lg font-sans border border-indigo-500/10 select-text transition-all duration-200 overflow-hidden"
                >
                  <!-- In-Bubble Media & Documents Preview -->
                  @if (msg.attachments && msg.attachments.length > 0) {
                    <div class="mb-2.5 space-y-2">
                      @for (att of msg.attachments; track att.id) {
                        @if (att.type === 'image') {
                          <a [href]="att.url" target="_blank" rel="noopener noreferrer" class="block group/media relative overflow-hidden rounded-xl border border-white/10 max-w-[260px] shadow-sm">
                            <img [src]="att.url" [alt]="att.name" class="w-full max-h-48 object-cover group-hover/media:scale-105 transition-transform duration-200" />
                          </a>
                        } @else if (att.type === 'video') {
                          <div class="rounded-xl overflow-hidden border border-white/10 max-w-[280px] shadow-sm bg-black">
                            <video [src]="att.url" controls class="w-full max-h-44 bg-black"></video>
                          </div>
                        } @else {
                          <a
                            [href]="att.url"
                            [download]="att.name"
                            class="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/90 border border-zinc-700/60 hover:border-indigo-400/50 transition group/doc max-w-[260px] text-zinc-200"
                          >
                            <div class="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-400">
                              <svg lucideFileText class="w-4 h-4"></svg>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-[11px] font-medium truncate text-zinc-100 group-hover/doc:text-indigo-300">{{ att.name }}</p>
                              <p class="text-[9px] text-zinc-400">{{ att.size }}</p>
                            </div>
                            <svg lucideDownload class="w-3.5 h-3.5 text-zinc-400 group-hover/doc:text-indigo-300 flex-shrink-0"></svg>
                          </a>
                        }
                      }
                    </div>
                  }

                  <!-- Markdown text content -->
                  <div class="chat-markdown select-text" [innerHTML]="renderMarkdown(msg.content)"></div>

                  <!-- Quick Action Chips for Human Support or Cart -->
                  @if (msg.role === 'assistant') {
                    @if (msg.content.includes('/tickets')) {
                      <div class="mt-2.5 pt-2 border-t border-indigo-500/20 flex flex-wrap gap-2">
                        <button
                          type="button"
                          (click)="openQuickTicketModal()"
                          style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[11px] font-medium border border-indigo-400/30 hover:opacity-90 shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <svg lucideLifeBuoy class="w-3.5 h-3.5 text-white"></svg>
                          <span>Create Support Ticket</span>
                        </button>
                        <button
                          type="button"
                          (click)="navigateToSupport()"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-indigo-400 text-[11px] font-medium transition active:scale-95 cursor-pointer"
                        >
                          <span>View Support Tickets</span>
                        </button>
                      </div>
                    }

                    @if (msg.content.toLowerCase().includes('cart')) {
                      <div class="mt-2.5 pt-2 border-t border-emerald-500/20 flex flex-wrap gap-2">
                        <button
                          type="button"
                          (click)="cartService.open()"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium hover:bg-emerald-600/40 hover:text-white shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          <svg lucideShoppingCart class="w-3.5 h-3.5"></svg>
                          <span>Open Shopping Cart ({{ cartService.itemCount() }})</span>
                        </button>
                      </div>
                    }
                  }

                  <!-- Footer Meta (Audio, Copy, Feedback Rating, Timestamp, Double-Check Mark) -->
                  <div class="mt-1.5 text-[10px] font-medium opacity-70 text-right flex items-center justify-between gap-2 select-none">
                    <div class="flex items-center gap-2">
                      @if (msg.role === 'assistant') {
                        <!-- Listen / Text-to-Speech -->
                        <button
                          type="button"
                          (click)="toggleSpeech(msg.id, msg.content)"
                          [title]="speakingMessageId === msg.id ? 'Stop listening' : 'Listen to message'"
                          class="inline-flex items-center gap-1 hover:text-indigo-300 transition text-[10px] cursor-pointer"
                        >
                          @if (speakingMessageId === msg.id) {
                            <svg lucideVolumeX class="w-3.5 h-3.5 text-amber-400 animate-pulse"></svg>
                            <span class="text-amber-400">Stop</span>
                          } @else {
                            <svg lucideVolume2 class="w-3.5 h-3.5"></svg>
                            <span>Listen</span>
                          }
                        </button>

                        <!-- Copy Message -->
                        <button
                          type="button"
                          (click)="copyMessage(msg.id, msg.content)"
                          [title]="copiedId === msg.id ? 'Copied!' : 'Copy response'"
                          class="inline-flex items-center gap-1 hover:text-indigo-300 transition text-[10px] cursor-pointer ml-1"
                        >
                          @if (copiedId === msg.id) {
                            <svg lucideCheck class="w-3 h-3 text-emerald-400"></svg>
                            <span class="text-emerald-400 font-medium">Copied</span>
                          } @else {
                            <svg lucideCopy class="w-3 h-3"></svg>
                            <span>Copy</span>
                          }
                        </button>

                        <!-- Feedback Rating (Thumbs Up / Down) -->
                        <div class="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-zinc-700/60">
                          <button
                            type="button"
                            (click)="rateMessage(msg.id, 'up')"
                            [title]="getMessageFeedback(msg.id) === 'up' ? 'Helpful' : 'Mark as helpful'"
                            [class.text-emerald-400]="getMessageFeedback(msg.id) === 'up'"
                            [class.text-zinc-400]="getMessageFeedback(msg.id) !== 'up'"
                            class="hover:text-emerald-400 hover:scale-110 active:scale-95 transition cursor-pointer p-0.5"
                          >
                            <svg lucideThumbsUp class="w-3 h-3"></svg>
                          </button>
                          <button
                            type="button"
                            (click)="rateMessage(msg.id, 'down')"
                            [title]="getMessageFeedback(msg.id) === 'down' ? 'Unhelpful' : 'Mark as unhelpful'"
                            [class.text-rose-400]="getMessageFeedback(msg.id) === 'down'"
                            [class.text-zinc-400]="getMessageFeedback(msg.id) !== 'down'"
                            class="hover:text-rose-400 hover:scale-110 active:scale-95 transition cursor-pointer p-0.5"
                          >
                            <svg lucideThumbsDown class="w-3 h-3"></svg>
                          </button>
                          @if (feedbackToastId() === msg.id) {
                            <span class="text-[9px] text-emerald-400 animate-in fade-in duration-200">Thanks!</span>
                          }
                        </div>
                      }
                    </div>

                    <!-- Timestamp + WhatsApp Double Check -->
                    <div class="flex items-center gap-1.5 cursor-default" [title]="msg.timestamp | date:'medium'">
                      <span class="text-[10px] font-medium" [class.text-indigo-100]="msg.role === 'user'" [class.text-zinc-400]="msg.role === 'assistant'">
                        {{ msg.timestamp | date:'shortTime' }}
                      </span>
                      @if (msg.role === 'user') {
                        <svg lucideCheckCheck class="w-3.5 h-3.5 text-sky-300 inline-block"></svg>
                      }
                    </div>
                  </div>
                </div>

                <!-- Active Emoji Reactions Display -->
                @if (getReactions(msg.id).length > 0) {
                  <div
                    [class.justify-end]="msg.role === 'user'"
                    [class.justify-start]="msg.role === 'assistant'"
                    class="flex items-center gap-1 -mt-2 z-10 select-none px-2"
                  >
                    @for (r of getReactions(msg.id); track r.emoji) {
                      <button
                        type="button"
                        (click)="toggleReaction(msg.id, r.emoji)"
                        class="reaction-badge inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700/80 text-[11px] shadow-sm hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      >
                        <span>{{ r.emoji }}</span>
                        @if (r.count > 1) {
                          <span class="text-[9px] text-zinc-300 font-bold">{{ r.count }}</span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Thinking / AI Processing Shimmer -->
          @if (chatbotService.isThinking()) {
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-xl border border-indigo-500/50 bg-indigo-950/80 text-indigo-300 flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-md">
                <svg lucideLoader2 class="w-4 h-4 animate-spin text-indigo-400"></svg>
              </div>
              <div class="px-4 py-3 bg-zinc-900/90 border border-indigo-500/30 rounded-2xl rounded-tl-xs text-xs text-indigo-200 flex items-center gap-2.5 shadow-md">
                <span class="font-medium">Nexus AI is thinking</span>
                <span class="flex gap-1.5">
                  <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                  <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                  <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                </span>
              </div>
            </div>
          }
        </div>

        <!-- WhatsApp / Telegram Floating Scroll-to-Bottom Button -->
        @if (showScrollBottomBtn) {
          <button
            type="button"
            (click)="scrollToBottom(true)"
            title="Scroll to bottom"
            class="absolute bottom-3 right-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white shadow-xl shadow-black/90 border border-indigo-400/50 hover:scale-110 active:scale-95 transition-all cursor-pointer animate-in fade-in zoom-in-75 duration-200"
          >
            <svg lucideChevronDown class="w-4 h-4"></svg>
          </button>
        }
      </div>

        <!-- Quick Action Preset Pills Bar -->
        <div class="px-3.5 py-2 bg-zinc-950/95 border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
          @for (p of activeQuickPrompts(); track p.label) {
            <button
              type="button"
              (click)="sendQuickPrompt(p.prompt)"
              class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-3 py-1.5 text-indigo-200 hover:border-indigo-400 hover:bg-indigo-900/60 hover:text-white hover:scale-105 transition active:scale-95 cursor-pointer flex-shrink-0 shadow-xs"
            >
              {{ p.label }}
            </button>
          }
        </div>

        <!-- Emoji Quick Picker Popover -->
        @if (showEmojiPicker) {
          <div class="px-3.5 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto text-base select-none animate-in fade-in slide-in-from-bottom-2 duration-150 scrollbar-none">
            @for (em of quickEmojis; track em) {
              <button
                type="button"
                (click)="insertEmoji(em)"
                class="hover:scale-125 active:scale-90 transition-transform cursor-pointer px-1 py-0.5 leading-none"
              >
                {{ em }}
              </button>
            }
          </div>
        }

        <!-- Pre-Send Attachments Preview Tray -->
        @if (pendingAttachments.length > 0) {
          <div class="px-3.5 py-2 bg-zinc-900/95 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto select-none scrollbar-thin scrollbar-thumb-zinc-800">
            @for (att of pendingAttachments; track att.id; let idx = $index) {
              <div class="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-800/90 border border-zinc-700/60 max-w-[200px] flex-shrink-0 shadow-sm">
                @if (att.type === 'image') {
                  <img [src]="att.url" [alt]="att.name" class="w-7 h-7 rounded-lg object-cover border border-zinc-700" />
                } @else if (att.type === 'video') {
                  <div class="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <svg lucidePlay class="w-3.5 h-3.5"></svg>
                  </div>
                } @else {
                  <div class="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-700 flex items-center justify-center text-indigo-400">
                    <svg lucideFileText class="w-3.5 h-3.5"></svg>
                  </div>
                }
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="text-[11px] font-medium text-zinc-200 truncate">{{ att.name }}</span>
                  <span class="text-[9px] text-zinc-400">{{ att.size }}</span>
                </div>
                <button
                  type="button"
                  (click)="removeAttachment(idx)"
                  class="w-4 h-4 rounded-full bg-zinc-700 hover:bg-red-500 text-zinc-200 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Remove attachment"
                >
                  <svg lucideX class="w-2.5 h-2.5"></svg>
                </button>
              </div>
            }
          </div>
        }

        <!-- Footer Input Form -->
        <form (ngSubmit)="onSend()" autocomplete="off" class="p-3.5 bg-zinc-950 border-t border-zinc-800 flex items-end gap-2">
          <!-- Hidden File Input -->
          <input
            #fileInput
            type="file"
            multiple
            (change)="onFileSelected($event)"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
            class="hidden"
          />

          <!-- Paperclip Attachment Button -->
          <button
            type="button"
            (click)="triggerFileInput()"
            title="Attach image, video, or doc"
            class="h-9 w-9 rounded-2xl flex items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-indigo-300 hover:border-indigo-500/40 transition cursor-pointer flex-shrink-0 mb-0.5"
          >
            <svg lucidePaperclip class="w-4 h-4"></svg>
          </button>

          <!-- Emoji Picker Toggle -->
          <button
            type="button"
            (click)="toggleEmojiPicker()"
            [title]="showEmojiPicker ? 'Close Emojis' : 'Insert Emoji'"
            [class.text-indigo-400]="showEmojiPicker"
            [class.text-zinc-400]="!showEmojiPicker"
            class="h-9 w-9 rounded-2xl flex items-center justify-center border border-zinc-800 bg-zinc-900 hover:text-indigo-300 hover:border-indigo-500/40 transition cursor-pointer flex-shrink-0 mb-0.5"
          >
            <svg lucideSmile class="w-4 h-4"></svg>
          </button>

          <!-- Voice Mic Dictation Button -->
          <button
            type="button"
            (click)="toggleSpeechRecognition()"
            [title]="isRecording ? 'Listening... click to stop' : 'Voice typing'"
            [class.mic-recording]="isRecording"
            [class.border-red-500]="isRecording"
            [class.bg-red-950\/50]="isRecording"
            [class.text-red-400]="isRecording"
            [class.border-zinc-800]="!isRecording"
            [class.bg-zinc-900]="!isRecording"
            [class.text-zinc-400]="!isRecording"
            class="h-9 w-9 rounded-2xl flex items-center justify-center border hover:text-indigo-300 hover:border-indigo-500/40 transition cursor-pointer flex-shrink-0 mb-0.5"
          >
            @if (isRecording) {
              <svg lucideMicOff class="w-4 h-4 text-red-400 animate-pulse"></svg>
            } @else {
              <svg lucideMic class="w-4 h-4"></svg>
            }
          </button>

          <!-- Auto-expanding multiline input -->
          <textarea
            #chatTextarea
            [(ngModel)]="userInput"
            name="nexusChatInput"
            id="nexusChatInput"
            rows="1"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            placeholder="Ask anything..."
            [disabled]="chatbotService.isThinking()"
            (input)="adjustTextareaHeight()"
            (keydown)="onKeydown($event)"
            class="flex-1 bg-zinc-900/90 border border-zinc-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-2xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none transition resize-none disabled:opacity-50 scrollbar-thin scrollbar-thumb-zinc-800 max-h-36 min-h-[38px] leading-relaxed"
          ></textarea>

          <!-- Send Button -->
          <button
            type="submit"
            [disabled]="(!userInput.trim() && pendingAttachments.length === 0) || chatbotService.isThinking()"
            style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);"
            class="h-9 w-9 rounded-2xl text-white flex items-center justify-center hover:scale-105 active:scale-95 transition border border-indigo-400/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex-shrink-0 shadow-md shadow-indigo-950/80 mb-0.5"
          >
            <svg lucideSend class="w-4 h-4 text-white"></svg>
          </button>
        </form>

        <!-- Quick Ticket Creation Modal Overlay (inside Chat Window) -->
        @if (showQuickTicketModal) {
            <div class="absolute inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-150 overflow-y-auto">
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                <div class="flex items-center gap-2">
                  <div class="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                    <svg lucideLifeBuoy class="w-5 h-5"></svg>
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-white">Create Support Ticket</h4>
                    <p class="text-[11px] text-zinc-400">Escalate directly to Nexus Support</p>
                  </div>
                </div>
                <button
                  type="button"
                  (click)="showQuickTicketModal = false"
                  class="h-7 w-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <svg lucideX class="w-4 h-4"></svg>
                </button>
              </div>

              @if (!authService.isAuthenticated()) {
                <div class="my-auto p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs text-center space-y-3">
                  <p class="font-medium">You must be logged in to create a support ticket.</p>
                  <button
                    type="button"
                    (click)="showQuickTicketModal = false; router.navigateByUrl('/auth'); chatbotService.isOpen.set(false)"
                    class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    Go to Sign In / Register
                  </button>
                </div>
              } @else {
                <!-- Ticket Form -->
                <form (ngSubmit)="submitQuickTicket()" class="flex-1 flex flex-col gap-3">
                  @if (ticketErrorMsg) {
                    <div class="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs">
                      {{ ticketErrorMsg }}
                    </div>
                  }

                  <div>
                    <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Subject *</label>
                    <input
                      type="text"
                      [(ngModel)]="ticketSubject"
                      name="ticketSubject"
                      placeholder="Brief summary of your issue..."
                      class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                      required
                    />
                  </div>

                  <div>
                    <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Related Order (Optional)</label>
                    <app-select
                      [(ngModel)]="ticketOrderId"
                      name="ticketOrderId"
                      [options]="orderOptions()"
                      placement="absolute"
                      placeholder="Select an order…"
                    ></app-select>
                    @if (userOrders().length === 0 && !isLoadingOrders() && authService.isAuthenticated()) {
                      <p class="text-[10px] text-zinc-500 mt-1">No orders found on your account.</p>
                    }
                  </div>

                  <div class="flex-1 flex flex-col min-h-[100px]">
                    <label class="block text-[11px] font-semibold text-zinc-300 mb-1">Description / Details *</label>
                    <textarea
                      [(ngModel)]="ticketBody"
                      name="ticketBody"
                      rows="4"
                      placeholder="Please describe your problem or question in detail..."
                      class="w-full flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-none"
                      required
                    ></textarea>
                  </div>

                  <!-- Actions -->
                  <div class="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2 mt-auto">
                    <button
                      type="button"
                      (click)="showQuickTicketModal = false; navigateToSupport()"
                      class="text-[11px] text-zinc-400 hover:text-indigo-300 underline cursor-pointer"
                    >
                      View Existing Tickets
                    </button>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="showQuickTicketModal = false"
                        class="px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        [disabled]="isSubmittingTicket"
                        style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);"
                        class="px-4 py-1.5 rounded-xl text-white font-semibold text-xs border border-indigo-400/30 hover:opacity-95 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        @if (isSubmittingTicket) {
                          <svg lucideLoader2 class="w-3.5 h-3.5 animate-spin"></svg>
                          <span>Creating...</span>
                        } @else {
                          <svg lucideLifeBuoy class="w-3.5 h-3.5"></svg>
                          <span>Submit Ticket</span>
                        }
                      </button>
                    </div>
                  </div>
                </form>
              }
            </div>
          }
        }
      </div>
    }
  `,
})
export class ChatbotWidget {
  readonly chatbotService = inject(ChatbotService);
  readonly router = inject(Router);
  readonly cartService = inject(CartService);
  readonly orderService = inject(OrderService);
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  userInput = '';
  isExpanded = false;
  showHistoryPanel = false;
  showFaqPanel = false;
  showOptionsMenu = false;
  showSearchBar = false;
  showQuickTicketModal = false;
  ticketSubject = '';
  ticketBody = '';
  ticketOrderId = '';

  isSubmittingTicket = false;
  ticketErrorMsg: string | null = null;
  readonly userOrders = signal<OrderView[]>([]);
  readonly isLoadingOrders = signal<boolean>(false);

  readonly orderOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'None (General Inquiry / No Order)' },
    ...this.userOrders().map((ord) => {
      const shortId = ord.id.substring(0, 8);
      const dateStr = new Date(ord.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const formattedTotal = Number(ord.totalAmount).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
      return {
        value: ord.id,
        label: `Order #${shortId} · ${ord.status} · ${formattedTotal} (${dateStr})`,
      };
    }),
  ]);
  searchQuery = '';
  sessionSearchQuery = '';
  currentMatchIndex = 0;
  showScrollBottomBtn = false;
  copiedId: string | null = null;
  speakingMessageId: string | null = null;
  showEmojiPicker = false;
  isRecording = false;
  soundEnabled = this.loadSoundPreference();
  private audioCtx: AudioContext | null = null;

  // Responsive mobile state
  readonly isMobile = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  // Contextual page-aware prompts
  readonly currentUrl = signal<string>(typeof window !== 'undefined' ? window.location.pathname : '/');

  readonly activeQuickPrompts = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/orders')) {
      return [
        { label: '📦 Track Recent Orders', prompt: 'Where is my recent order status?' },
        { label: '🛡️ 72h Escrow Inspection', prompt: 'How does the 72-hour escrow inspection countdown and dispute work?' },
        { label: '🚚 Proximity & QR Handover', prompt: 'How does courier proximity radar and delivery QR handover work?' },
        { label: '🔄 Return & Refund', prompt: 'What is the 30-day return and refund policy?' },
        { label: '🎫 Human Support', prompt: 'I want to speak with human customer support' },
      ];
    }
    if (url.includes('/products')) {
      return [
        { label: '🔍 Search Products', prompt: 'Search popular products in catalog' },
        { label: '💼 Wholesale & RFQ', prompt: 'How does wholesale bulk volume pricing and RFQ work?' },
        { label: '🛡️ Escrow Protection', prompt: 'Explain milestone escrow protection for buyers' },
        { label: '🔄 30-Day Returns', prompt: 'What is the return and refund policy for items?' },
        { label: '🛒 View My Cart', prompt: 'What is currently in my cart?' },
      ];
    }
    if (url.includes('/tickets') || url.includes('/inspection-dispute')) {
      return [
        { label: '🛡️ Dispute Mediation', prompt: 'How does the dispute resolution process work?' },
        { label: '⏳ Inspection Window', prompt: 'How does the 72-hour physical inspection auto-release work?' },
        { label: '💰 Refund Processing', prompt: 'How are escrow refunds processed back to payment method?' },
        { label: '🎫 Open Support Ticket', prompt: 'I need help from human customer support' },
      ];
    }
    if (url.includes('/checkout')) {
      return [
        { label: '🔒 Escrow Protection', prompt: 'How does milestone escrow protect my payment during checkout?' },
        { label: '🔄 Return Policy', prompt: 'What is the return and refund policy if goods are defective?' },
        { label: '🚚 Delivery & Tracking', prompt: 'What are the shipping, GPS tracking, and delivery terms?' },
      ];
    }
    return [
      { label: '📦 Track Order', prompt: 'Where is my recent order?' },
      { label: '🔄 30-Day Returns', prompt: 'What is the 30-day return and refund policy?' },
      { label: '🛡️ 72h Escrow Guarantee', prompt: 'How does the 72-hour milestone escrow and inspection work?' },
      { label: '🚚 QR Handover & Radar', prompt: 'How does courier proximity radar and delivery QR handover work?' },
      { label: '💼 Wholesale & RFQ', prompt: 'How does wholesale bulk pricing and RFQ work?' },
      { label: '🎫 Human Agent', prompt: 'I want to speak with human customer support' },
    ];
  });

  // Message feedback thumbs up/down rating state
  private readonly FEEDBACK_KEY = 'nexus_chat_message_feedback';
  readonly messageFeedback = signal<Record<string, 'up' | 'down'>>(this.loadStoredFeedback());
  readonly feedbackToastId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const msgs = this.chatbotService.messages();
      if (msgs.length > 0 && !this.showScrollBottomBtn) {
        this.scrollToBottom();
      }
    });

    effect(() => {
      const open = this.chatbotService.isOpen();
      if (open) {
        this.forceScrollToBottom(false);
      }
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        if (open && window.innerWidth < 640) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }
    });

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 640);
    }
  }

  onChatClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        event.preventDefault();
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        if (href.startsWith('/') || href.startsWith('./') || (origin && href.startsWith(origin))) {
          const path = origin && href.startsWith(origin) ? href.replace(origin, '') : href;
          this.router.navigateByUrl(path || '/');
          this.chatbotService.isOpen.set(false);
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    }
  }

  navigateToSupport() {
    this.router.navigateByUrl('/tickets');
    this.chatbotService.isOpen.set(false);
  }

  openQuickTicketModal(initialSubject?: string, initialBody?: string, initialOrderId?: string) {
    const lastUserMsg = [...this.chatbotService.messages()].reverse().find((m) => m.role === 'user')?.content || '';
    this.ticketSubject = initialSubject || (lastUserMsg.length > 50 ? lastUserMsg.slice(0, 47) + '...' : lastUserMsg) || 'Support Request via AI Assistant';
    this.ticketBody = initialBody || (lastUserMsg ? `User Query: ${lastUserMsg}\n\nAdditional Details:\n` : '');
    this.ticketOrderId = initialOrderId || '';
    this.ticketErrorMsg = null;
    this.showQuickTicketModal = true;
    this.loadUserOrders();
  }

  loadUserOrders() {
    if (!this.authService.isAuthenticated()) return;
    this.isLoadingOrders.set(true);
    this.orderService.list().subscribe({
      next: (res) => {
        this.userOrders.set(res.data || []);
        this.isLoadingOrders.set(false);
      },
      error: () => {
        this.isLoadingOrders.set(false);
      },
    });
  }

  submitQuickTicket() {
    if (!this.ticketSubject.trim() || !this.ticketBody.trim()) {
      this.ticketErrorMsg = 'Please enter both subject and description.';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.ticketErrorMsg = 'Please log in to submit a support ticket.';
      return;
    }

    this.isSubmittingTicket = true;
    this.ticketErrorMsg = null;

    this.orderService
      .createTicket({
        subject: this.ticketSubject.trim(),
        body: this.ticketBody.trim(),
        orderId: this.ticketOrderId.trim() || undefined,
      })
      .subscribe({
        next: (ticket: any) => {
          this.isSubmittingTicket = false;
          this.showQuickTicketModal = false;

          const ticketIdShort = ticket.id ? ticket.id.slice(0, 8) : 'NEW';
          const confirmationMsg = `🎫 **Support Ticket Created Successfully!**\n\n- **Ticket ID:** \`#${ticketIdShort}\`\n- **Subject:** ${ticket.subject}\n- **Status:** \`${ticket.status || 'OPEN'}\`\n\nOur human support team has received your ticket and will follow up shortly. You can track all updates on your [Support Tickets Page](/tickets).`;

          this.chatbotService.messages.update((msgs) => [
            ...msgs,
            {
              id: `ticket-confirm-${Date.now()}`,
              role: 'assistant',
              content: confirmationMsg,
              timestamp: new Date(),
            },
          ]);
          this.forceScrollToBottom(true);
        },
        error: (err: any) => {
          this.isSubmittingTicket = false;
          const msg = err?.error?.message;
          this.ticketErrorMsg = typeof msg === 'string' ? msg : 'Unable to create support ticket. Please try again.';
        },
      });
  }

  private loadStoredFeedback(): Record<string, 'up' | 'down'> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(this.FEEDBACK_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return {};
  }

  rateMessage(messageId: string, rating: 'up' | 'down') {
    const current = { ...this.messageFeedback() };
    if (current[messageId] === rating) {
      delete current[messageId];
    } else {
      current[messageId] = rating;
      this.feedbackToastId.set(messageId);
      setTimeout(() => {
        if (this.feedbackToastId() === messageId) {
          this.feedbackToastId.set(null);
        }
      }, 2200);
    }
    this.messageFeedback.set(current);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.FEEDBACK_KEY, JSON.stringify(current));
      }
    } catch {}
  }

  getMessageFeedback(messageId: string): 'up' | 'down' | null {
    return this.messageFeedback()[messageId] || null;
  }

  handleToggleChat() {
    this.chatbotService.toggleChat();
    if (this.chatbotService.isOpen()) {
      this.forceScrollToBottom(false);
      setTimeout(() => this.chatTextarea?.nativeElement?.focus(), 120);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    const isK = event.key.toLowerCase() === 'k';
    const isSlash = event.key === '/';
    const hasModifier = event.ctrlKey || event.metaKey;

    if (hasModifier && (isK || isSlash)) {
      event.preventDefault();
      this.handleToggleChat();
    } else if (event.key === 'Escape' && this.chatbotService.isOpen()) {
      if (this.showSearchBar) {
        this.clearSearch();
        this.showSearchBar = false;
      } else if (this.showOptionsMenu) {
        this.showOptionsMenu = false;
      } else if (this.showHistoryPanel) {
        this.showHistoryPanel = false;
      } else {
        this.handleToggleChat();
      }
    }
  }

  private loadSoundPreference(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = localStorage.getItem('nexus_chat_sound_enabled');
        if (val !== null) return val === 'true';
      }
    } catch {}
    return true;
  }

  toggleSoundPreference() {
    this.soundEnabled = !this.soundEnabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('nexus_chat_sound_enabled', String(this.soundEnabled));
      }
    } catch {}
    if (this.soundEnabled) {
      this.playSendChime();
    }
  }

  playSendChime() {
    if (!this.soundEnabled) return;
    this.playToneSequence([
      { freq: 523.25, type: 'sine', duration: 0.08, gain: 0.07 },
      { freq: 659.25, type: 'sine', duration: 0.12, gain: 0.05 },
    ]);
  }

  playReceiveChime() {
    if (!this.soundEnabled) return;
    this.playToneSequence([
      { freq: 587.33, type: 'sine', duration: 0.07, gain: 0.05 },
      { freq: 880.00, type: 'sine', duration: 0.14, gain: 0.07 },
    ]);
  }

  private playToneSequence(tones: { freq: number; type: OscillatorType; duration: number; gain: number }[]) {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      let startTime = this.audioCtx.currentTime;
      for (const t of tones) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = t.type;
        osc.frequency.setValueAtTime(t.freq, startTime);

        gain.gain.setValueAtTime(t.gain, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + t.duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + t.duration);

        startTime += t.duration * 0.7;
      }
    } catch {}
  }

  toggleOptionsMenu() {
    this.showOptionsMenu = !this.showOptionsMenu;
  }

  openPastConversations() {
    this.showHistoryPanel = !this.showHistoryPanel;
    this.showFaqPanel = false;
    this.showOptionsMenu = false;
  }

  openFaqPanel() {
    this.showFaqPanel = true;
    this.showHistoryPanel = false;
    this.showOptionsMenu = false;
    if (this.chatbotService.faqs().length === 0) {
      this.chatbotService.loadFaqs().subscribe({
        error: (err) => console.error('Failed to load FAQs:', err),
      });
    }
  }

  askFaqQuestion(question: string) {
    this.showFaqPanel = false;
    this.sendQuickPrompt(question);
  }

  triggerExport() {
    this.chatbotService.exportChatHistory();
    this.showOptionsMenu = false;
  }

  triggerNewChat() {
    this.chatbotService.clearHistory();
    this.showHistoryPanel = false;
    this.showFaqPanel = false;
    this.showOptionsMenu = false;
  }


  toggleSearchBar() {
    this.showSearchBar = !this.showSearchBar;
    if (!this.showSearchBar) {
      this.clearSearch();
    } else {
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 80);
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentMatchIndex = 0;
  }

  onSearchChange() {
    this.currentMatchIndex = 0;
    this.updateActiveMatch();
  }

  onSearchEnter(event: Event) {
    const ke = event as KeyboardEvent;
    ke.preventDefault();
    if (ke.shiftKey) {
      this.prevMatch();
    } else {
      this.nextMatch();
    }
  }

  nextMatch() {
    const total = this.getTotalMatchCount();
    if (total === 0) return;
    this.currentMatchIndex = (this.currentMatchIndex + 1) % total;
    this.updateActiveMatch();
  }

  prevMatch() {
    const total = this.getTotalMatchCount();
    if (total === 0) return;
    this.currentMatchIndex = (this.currentMatchIndex - 1 + total) % total;
    this.updateActiveMatch();
  }

  getTotalMatchCount(): number {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return 0;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      let total = 0;
      for (const msg of this.chatbotService.messages()) {
        const matches = msg.content.match(regex);
        if (matches) total += matches.length;
      }
      return total;
    } catch {
      return 0;
    }
  }

  updateActiveMatch() {
    if (!this.searchQuery.trim()) return;
    setTimeout(() => {
      if (!this.scrollContainer?.nativeElement) return;
      const matchEls = this.scrollContainer.nativeElement.querySelectorAll<HTMLElement>('.search-match-highlight');
      const total = matchEls.length;
      if (total === 0) {
        this.currentMatchIndex = 0;
        return;
      }
      if (this.currentMatchIndex >= total) {
        this.currentMatchIndex = 0;
      } else if (this.currentMatchIndex < 0) {
        this.currentMatchIndex = total - 1;
      }

      matchEls.forEach((el, idx) => {
        if (idx === this.currentMatchIndex) {
          el.classList.add('search-match-active');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          el.classList.remove('search-match-active');
        }
      });
    }, 60);
  }

  highlightSessionText(text: string): SafeHtml {
    if (!text) return '';
    const q = this.sessionSearchQuery.trim();
    if (!q) return text;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const highlighted = text.replace(
        regex,
        `<mark class="search-match-highlight">$1</mark>`
      );
      return this.sanitizer.bypassSecurityTrustHtml(highlighted);
    } catch {
      return text;
    }
  }

  isMessageMatch(content: string): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return false;
    return content.toLowerCase().includes(q);
  }

  getMatchCount(): number {
    return this.getTotalMatchCount();
  }

  filteredPastSessions(): ChatSession[] {
    const q = this.sessionSearchQuery.trim().toLowerCase();
    const sessions = this.chatbotService.pastSessions();
    if (!q) return sessions;
    return sessions.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      (s.lastMessage && s.lastMessage.toLowerCase().includes(q)) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }

  onMessagesScroll(event: Event) {
    const el = event.target as HTMLDivElement;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.showScrollBottomBtn = distanceToBottom > 80;
  }

  toggleHistoryPanel() {
    this.showHistoryPanel = !this.showHistoryPanel;
  }

  selectSession(sessionId: string) {
    this.chatbotService.loadSession(sessionId);
    this.showHistoryPanel = false;
    this.forceScrollToBottom(false);
  }

  readonly reactionEmojis = ['👍', '❤️', '🔥', '💡', '👏'];
  readonly quickEmojis = ['😊', '👍', '❤️', '🔥', '💡', '📦', '🛡️', '🚚', '💰', '🔍', '⭐', '👏'];
  messageReactions: Record<string, Record<string, number>> = {};
  pendingAttachments: ChatAttachment[] = [];

  private recognition: any = null;

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('chatTextarea') private chatTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  triggerFileInput() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit per file

    Array.from(input.files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        this.toast.error(`File "${file.name}" exceeds the maximum 10MB size limit.`);
        return;
      }

      try {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const type: 'image' | 'video' | 'doc' = isImage ? 'image' : isVideo ? 'video' : 'doc';
        const url = URL.createObjectURL(file);
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

        this.pendingAttachments.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type,
          url,
          size: sizeStr,
        });
      } catch (err) {
        console.error('Error processing attachment file:', err);
      }
    });

    input.value = '';
    setTimeout(() => this.scrollToBottom(), 50);
  }

  removeAttachment(index: number) {
    this.pendingAttachments.splice(index, 1);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  adjustTextareaHeight() {
    const textarea = this.chatTextarea?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    }
  }

  toggleReaction(messageId: string, emoji: string) {
    if (!this.messageReactions[messageId]) {
      this.messageReactions[messageId] = {};
    }
    const current = this.messageReactions[messageId][emoji] || 0;
    if (current > 0) {
      delete this.messageReactions[messageId][emoji];
    } else {
      this.messageReactions[messageId][emoji] = 1;
    }
  }

  getReactions(messageId: string): { emoji: string; count: number }[] {
    const reactions = this.messageReactions[messageId];
    if (!reactions) return [];
    return Object.entries(reactions).map(([emoji, count]) => ({ emoji, count }));
  }

  shouldShowDateDivider(index: number): boolean {
    const msgs = this.chatbotService.messages();
    if (index === 0) return true;
    const prev = new Date(msgs[index - 1].timestamp);
    const curr = new Date(msgs[index].timestamp);
    return prev.toDateString() !== curr.toDateString();
  }

  getDateDividerLabel(rawDate: Date | string): string {
    const date = new Date(rawDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string) {
    this.userInput += emoji;
    this.adjustTextareaHeight();
    this.showEmojiPicker = false;
    setTimeout(() => {
      this.chatTextarea?.nativeElement?.focus();
    }, 50);
  }

  toggleSpeechRecognition() {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      this.toast.info('Speech recognition is not supported in this browser.');
      return;
    }

    if (!this.recognition) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        this.userInput = transcript;
        this.adjustTextareaHeight();
      };

      this.recognition.onerror = () => {
        this.isRecording = false;
      };

      this.recognition.onend = () => {
        this.isRecording = false;
      };
    }

    if (this.isRecording) {
      this.recognition.stop();
      this.isRecording = false;
    } else {
      try {
        this.recognition.start();
        this.isRecording = true;
      } catch {
        this.isRecording = false;
      }
    }
  }

  toggleSpeech(messageId: string, text: string) {
    if (!('speechSynthesis' in window)) return;

    if (this.speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      this.speakingMessageId = null;
      return;
    }

    window.speechSynthesis.cancel();
    const plainText = text.replace(/[*#_`~\[\]()>-]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      if (this.speakingMessageId === messageId) {
        this.speakingMessageId = null;
      }
    };
    utterance.onerror = () => {
      this.speakingMessageId = null;
    };
    this.speakingMessageId = messageId;
    window.speechSynthesis.speak(utterance);
  }

  copyMessage(id: string, text: string) {
    const applyCopiedState = () => {
      this.copiedId = id;
      setTimeout(() => {
        if (this.copiedId === id) this.copiedId = null;
      }, 2000);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => applyCopiedState())
        .catch(() => this.fallbackCopy(text, applyCopiedState));
    } else {
      this.fallbackCopy(text, applyCopiedState);
    }
  }

  private fallbackCopy(text: string, onSuccess: () => void) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) onSuccess();
    } catch (err) {
      console.error('Copy fallback failed:', err);
    }
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
    this.scrollToBottom();
  }

  renderMarkdown(content: string): SafeHtml {
    if (!content) return '';
    try {
      const rawHtml = marked.parse(content, { async: false }) as string;
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      const query = this.searchQuery.trim();
      const outputHtml = query ? this.highlightTextNodes(sanitizedHtml, query) : sanitizedHtml;
      return this.sanitizer.bypassSecurityTrustHtml(outputHtml);
    } catch {
      return content;
    }
  }

  private highlightTextNodes(html: string, query: string): string {
    const q = query.trim();
    if (!q || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return html;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');

      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
          const text = node.nodeValue;
          regex.lastIndex = 0;
          if (regex.test(text)) {
            regex.lastIndex = 0;
            const fragment = doc.createDocumentFragment();
            let lastIdx = 0;
            let match: RegExpExecArray | null;

            while ((match = regex.exec(text)) !== null) {
              if (match.index > lastIdx) {
                fragment.appendChild(doc.createTextNode(text.substring(lastIdx, match.index)));
              }
              const mark = doc.createElement('mark');
              mark.className = 'search-match-highlight';
              mark.textContent = match[0];
              fragment.appendChild(mark);
              lastIdx = regex.lastIndex;
            }

            if (lastIdx < text.length) {
              fragment.appendChild(doc.createTextNode(text.substring(lastIdx)));
            }

            node.parentNode?.replaceChild(fragment, node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el.tagName !== 'MARK') {
            Array.from(node.childNodes).forEach(processNode);
          }
        }
      };

      Array.from(doc.body.childNodes).forEach(processNode);
      return doc.body.innerHTML;
    } catch {
      return html;
    }
  }

  sendQuickPrompt(promptText: string) {
    this.playSendChime();
    this.forceScrollToBottom(true);
    this.chatbotService.sendMessage(promptText).subscribe({
      next: () => {
        this.playReceiveChime();
        this.forceScrollToBottom(true);
      },
      error: (err) => {
        console.error('Error sending quick prompt:', err);
        this.chatbotService.isThinking.set(false);
        this.forceScrollToBottom(true);
      },
    });
    this.forceScrollToBottom(true);
  }

  onSend() {
    const text = this.userInput.trim();
    if (!text && this.pendingAttachments.length === 0) return;

    const attachmentsToSend = this.pendingAttachments.length > 0 ? [...this.pendingAttachments] : undefined;
    this.pendingAttachments = [];
    this.userInput = '';
    if (this.chatTextarea?.nativeElement) {
      this.chatTextarea.nativeElement.style.height = 'auto';
    }
    this.showEmojiPicker = false;
    this.playSendChime();
    this.forceScrollToBottom(true);
    this.chatbotService.sendMessage(text, undefined, attachmentsToSend).subscribe({
      next: () => {
        this.playReceiveChime();
        this.forceScrollToBottom(true);
      },
      error: (err) => {
        console.error('Error sending chat message:', err);
        this.chatbotService.isThinking.set(false);
        this.forceScrollToBottom(true);
      },
    });
    this.forceScrollToBottom(true);
  }

  forceScrollToBottom(smooth = false) {
    this.showScrollBottomBtn = false;
    const runScroll = () => {
      if (this.scrollContainer?.nativeElement) {
        const el = this.scrollContainer.nativeElement;
        if (smooth) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } else {
          el.scrollTop = el.scrollHeight;
        }
      }
    };

    runScroll();
    requestAnimationFrame(() => runScroll());
    setTimeout(runScroll, 40);
    setTimeout(runScroll, 120);
    setTimeout(runScroll, 250);
    setTimeout(runScroll, 380);
  }

  scrollToBottom(smooth = false) {
    const runScroll = () => {
      if (this.scrollContainer?.nativeElement) {
        const el = this.scrollContainer.nativeElement;
        if (smooth) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } else {
          el.scrollTop = el.scrollHeight;
        }
        this.showScrollBottomBtn = false;
      }
    };

    runScroll();
    setTimeout(runScroll, 30);
  }
}
