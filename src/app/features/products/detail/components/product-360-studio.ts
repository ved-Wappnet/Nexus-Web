import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  LucideBadgeCheck,
  LucideBox,
  LucideCompass,
  LucideLayers,
  LucideMaximize2,
  LucideMinimize2,
  LucideRotateCw,
  LucideShieldCheck,
  LucideX,
  LucideZap,
} from '@lucide/angular';
import { ProductView } from '@core/models';

export interface HotspotSpec {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  anchor: [number, number, number]; // 3D coordinates
  details: string;
  metrics: { label: string; value: string }[];
  certification: string;
}

export interface ColorwayOption {
  name: string;
  hex: string;
  primary: number;
  secondary: number;
  accent: number;
}

@Component({
  selector: 'app-product-360-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LucideRotateCw,
    LucideLayers,
    LucideShieldCheck,
    LucideBadgeCheck,
    LucideBox,
    LucideX,
    LucideZap,
    LucideCompass,
    LucideMaximize2,
    LucideMinimize2,
  ],
  template: `
    <section
      class="mt-12 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative"
      [class.fixed]="isFullscreen()"
      [class.inset-0]="isFullscreen()"
      [class.z-[9999]]="isFullscreen()"
      [class.rounded-none]="isFullscreen()"
    >
      <!-- Atmospheric Ambient Glows -->
      <div class="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px]"></div>
      <div class="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px]"></div>

      <!-- Studio Header Bar -->
      <div class="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-cyan-500/20 border border-indigo-500/40 text-indigo-400 shadow-inner">
            <svg lucideBox class="h-5 w-5"></svg>
          </span>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Interactive 360° Studio & X-Ray Lab</span>
                <span class="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-widest">
                  WebGL 3D
                </span>
              </h2>
            </div>
            <p class="text-xs text-zinc-400 mt-0.5">
              Drag to inspect in 360°. Click floating <span class="text-indigo-400 font-semibold">Pulse Pins</span> for lab-grade wholesale engineering specs.
            </p>
          </div>
        </div>

        <!-- Studio Control Badges & Actions -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Auto-Spin Toggle -->
          <button
            type="button"
            (click)="toggleAutoRotate()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition cursor-pointer select-none"
            [class.border-cyan-500]="isAutoRotating()"
            [class.text-cyan-300]="isAutoRotating()"
          >
            <svg lucideRotateCw class="h-3.5 w-3.5" [class.animate-spin]="isAutoRotating()"></svg>
            <span>{{ isAutoRotating() ? 'Turntable Active' : 'Spin Paused' }}</span>
          </button>

          <!-- X-Ray Wireframe Mode Toggle -->
          <button
            type="button"
            (click)="toggleXRayMode()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 px-3 py-1.5 text-xs font-semibold transition cursor-pointer select-none"
            [class.border-indigo-500]="isXRayMode()"
            [class.bg-indigo-600/20]="isXRayMode()"
            [class.text-indigo-300]="isXRayMode()"
            [class.text-zinc-300]="!isXRayMode()"
          >
            <svg lucideLayers class="h-3.5 w-3.5"></svg>
            <span>{{ isXRayMode() ? 'X-Ray Wireframe ON' : 'X-Ray Mode' }}</span>
          </button>

          <!-- Reset Camera View -->
          <button
            type="button"
            (click)="resetCamera()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 p-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition cursor-pointer select-none"
            title="Reset View Orientation"
          >
            <svg lucideCompass class="h-3.5 w-3.5"></svg>
          </button>

          <!-- Fullscreen Toggle -->
          <button
            type="button"
            (click)="toggleFullscreen()"
            class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 p-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition cursor-pointer select-none"
            [title]="isFullscreen() ? 'Exit Fullscreen' : 'Expand Fullscreen'"
          >
            @if (isFullscreen()) {
              <svg lucideMinimize2 class="h-3.5 w-3.5 text-amber-400"></svg>
            } @else {
              <svg lucideMaximize2 class="h-3.5 w-3.5"></svg>
            }
          </button>
        </div>
      </div>

      <!-- Main 3D Canvas Viewport Container -->
      <div
        class="relative mt-4 w-full rounded-2xl bg-zinc-950/80 border border-zinc-800/60 overflow-hidden select-none"
        [style.height]="isFullscreen() ? 'calc(100vh - 180px)' : '540px'"
      >
        <!-- WebGL Canvas Anchor -->
        <canvas
          #canvasRef
          class="w-full h-full cursor-grab active:cursor-grabbing block"
          (mousedown)="onPointerDown($event)"
          (mousemove)="onPointerMove($event)"
          (mouseup)="onPointerUp()"
          (mouseleave)="onPointerUp()"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
        ></canvas>

        <!-- Studio Ambient Light Aura & Subtle Pedestal Vignette (Keeps Model Bright) -->
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.18)_0%,rgba(56,189,248,0.08)_45%,transparent_75%)]"></div>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950/80 to-transparent"></div>

        <!-- 3D Hotspot Pulse Markers (Projected 2D coordinates) -->
        @for (spot of hotspots(); track spot.id) {
          @if (projectedHotspots()[spot.id]; as pos) {
            @if (pos.visible) {
              <div
                class="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 cursor-pointer group z-30"
                [style.left.px]="pos.x"
                [style.top.px]="pos.y"
                (click)="selectHotspot(spot)"
              >
                <!-- Radar Pulse Ring -->
                <div class="relative flex items-center justify-center">
                  <span class="absolute inline-flex h-7 w-7 animate-ping rounded-full bg-cyan-400 opacity-60"></span>
                  <span class="absolute inline-flex h-5 w-5 rounded-full bg-cyan-500/40"></span>
                  <button
                    type="button"
                    class="relative flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 shadow-lg shadow-cyan-500/50 border border-white/80 text-white transform group-hover:scale-125 transition-transform duration-200"
                    [title]="spot.title"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
                  </button>
                </div>

                <!-- Hover Floating Tooltip Preview -->
                <div class="absolute left-8 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-[11px] font-bold text-white shadow-xl backdrop-blur-md pointer-events-none animate-in fade-in-50 zoom-in-95">
                  <span class="text-indigo-400">✦</span>
                  <span>{{ spot.title }}</span>
                </div>
              </div>
            }
          }
        }

        <!-- Active Hotspot Detail Glassmorphism Popout Card -->
        @if (selectedHotspot(); as activeSpot) {
          <div
            class="absolute top-4 right-4 sm:top-6 sm:right-6 w-80 sm:w-96 rounded-2xl border border-cyan-500/40 bg-zinc-950/90 p-5 shadow-2xl backdrop-blur-xl z-40 text-zinc-100 animate-in fade-in slide-in-from-right-4 duration-200"
          >
            <!-- Card Header -->
            <div class="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <span class="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                  <svg lucideZap class="h-3 w-3"></svg>
                  {{ activeSpot.category }}
                </span>
                <h3 class="text-base font-extrabold text-white mt-0.5">{{ activeSpot.title }}</h3>
                <p class="text-xs text-zinc-400">{{ activeSpot.subtitle }}</p>
              </div>
              <button
                type="button"
                (click)="closeHotspotModal()"
                class="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
              >
                <svg lucideX class="h-4 w-4"></svg>
              </button>
            </div>

            <!-- Details Description -->
            <p class="mt-3 text-xs leading-relaxed text-zinc-300">
              {{ activeSpot.details }}
            </p>

            <!-- Metrics Grid -->
            <div class="mt-4 grid grid-cols-2 gap-2">
              @for (m of activeSpot.metrics; track m.label) {
                <div class="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-2.5">
                  <span class="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">{{ m.label }}</span>
                  <span class="text-xs font-bold text-zinc-100 font-mono mt-0.5 block">{{ m.value }}</span>
                </div>
              }
            </div>

            <!-- Certification & Quality Guarantee Seal -->
            <div class="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-300">
              <div class="flex items-center gap-1.5 font-semibold">
                <svg lucideShieldCheck class="h-4 w-4 text-emerald-400 shrink-0"></svg>
                <span>{{ activeSpot.certification }}</span>
              </div>
              <span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                Verified
              </span>
            </div>
          </div>
        }

        <!-- Interactive Drag Hint Overlay (Disappears on first interaction) -->
        @if (showDragHint()) {
          <div class="pointer-events-none absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/80 px-3.5 py-1.5 text-[11px] font-medium text-zinc-300 backdrop-blur-md animate-pulse">
            <span class="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Click & drag to rotate 360°</span>
          </div>
        }

        <!-- Dynamic Colorway Selector Dock -->
        <div class="absolute bottom-5 left-5 z-20 flex flex-col gap-2 rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-2.5 backdrop-blur-xl shadow-xl">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 px-1">
            Colorway Finishes
          </span>
          <div class="flex items-center gap-2">
            @for (c of colorways(); track c.name) {
              <button
                type="button"
                (click)="applyColorway(c)"
                class="group relative flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                [class]="activeColorway().name === c.name ? 'border-cyan-400 ring-2 ring-cyan-500/40 scale-110' : 'border-zinc-700'"
                [style.backgroundColor]="c.hex"
                [title]="c.name"
              >
                <!-- Mini Tooltip -->
                <span class="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block rounded bg-zinc-950 px-1.5 py-0.5 text-[9px] font-medium text-white shadow whitespace-nowrap">
                  {{ c.name }}
                </span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Studio Technical Specs Footer Ribbon -->
      <div class="relative z-20 mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/60 pt-4">
        <div class="flex items-center gap-4 text-xs text-zinc-400">
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>PBR Shaders & 360° Studio Lighting</span>
          </div>
          <div class="flex items-center gap-1.5">
            <svg lucideBadgeCheck class="h-3.5 w-3.5 text-indigo-400"></svg>
            <span>Model Category: {{ activeModelType() }}</span>
          </div>
        </div>
        <div class="text-[11px] text-zinc-500">
          3D Spec Engine v2.4 · Powered by Three.js WebGL
        </div>
      </div>
    </section>
  `,
})
export class Product360Studio {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = input<ProductView | null>(null);
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasRef');

  // Interactive UI state
  readonly isAutoRotating = signal(true);
  readonly isXRayMode = signal(false);
  readonly isFullscreen = signal(false);
  readonly showDragHint = signal(true);
  readonly selectedHotspot = signal<HotspotSpec | null>(null);

  // Projected 2D coordinates for 3D anchors: map of id -> { x, y, visible }
  readonly projectedHotspots = signal<Record<string, { x: number; y: number; visible: boolean }>>({});

  // Three.js internal instances
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private productGroup!: THREE.Group;
  private modelMeshes: THREE.Mesh[] = [];
  private wireframeMeshes: THREE.LineSegments[] = [];
  private directionalLight!: THREE.DirectionalLight;
  private backDirectionalLight!: THREE.DirectionalLight;
  private animationFrameId: number | null = null;

  // Interaction tracking variables
  private isPointerDown = false;
  private previousPointerX = 0;
  private previousPointerY = 0;
  private rotationVelocityX = 0;
  private rotationVelocityY = 0;

  // Detected model category
  readonly activeModelType = computed<'SmartWatch' | 'Footwear' | 'Computer' | 'SmartDevice' | 'DesignStudio'>(() => {
    const p = this.product();
    if (!p) {
      return 'SmartWatch';
    }
    const title = (p.title || '').toLowerCase();
    const cat = (p.categoryName || '').toLowerCase();

    if (
      cat.includes('watch') ||
      title.includes('watch') ||
      title.includes('amazfit') ||
      title.includes('garmin') ||
      title.includes('fitbit')
    ) {
      return 'SmartWatch';
    }

    if (
      cat.includes('computer') ||
      cat.includes('laptop') ||
      title.includes('macbook') ||
      title.includes('dell') ||
      title.includes('thinkpad') ||
      title.includes('asus')
    ) {
      return 'Computer';
    }

    if (
      cat.includes('fashion') ||
      cat.includes('men') ||
      cat.includes('women') ||
      cat.includes('sport') ||
      cat.includes('fitness') ||
      title.includes('shoe') ||
      title.includes('sneaker') ||
      title.includes('hoodie') ||
      title.includes('shirt')
    ) {
      return 'Footwear';
    }

    if (
      cat.includes('phone') ||
      cat.includes('audio') ||
      title.includes('phone') ||
      title.includes('galaxy') ||
      title.includes('headphone')
    ) {
      return 'SmartDevice';
    }

    return 'SmartWatch';
  });

  // Colorway Palette options (High-contrast, radiant metallic finishes that never go dark)
  readonly colorways = computed<ColorwayOption[]>(() => {
    const type = this.activeModelType();
    if (type === 'SmartWatch' || type === 'Computer' || type === 'SmartDevice') {
      return [
        { name: 'Titanium Slate', hex: '#64748b', primary: 0x64748b, secondary: 0x334155, accent: 0x38bdf8 },
        { name: 'Phantom Silver', hex: '#e2e8f0', primary: 0xe2e8f0, secondary: 0x94a3b8, accent: 0x6366f1 },
        { name: 'Starlight Gold', hex: '#fbbf24', primary: 0xd97706, secondary: 0x92400e, accent: 0xfde047 },
        { name: 'Cosmic Indigo', hex: '#818cf8', primary: 0x4338ca, secondary: 0x312e81, accent: 0x22d3ee },
      ];
    }
    return [
      { name: 'Cyber Mint', hex: '#10b981', primary: 0x059669, secondary: 0x047857, accent: 0x34d399 },
      { name: 'Hyper Crimson', hex: '#f43f5e', primary: 0xe11d48, secondary: 0xbe123c, accent: 0xfb7185 },
      { name: 'Solar Cobalt', hex: '#3b82f6', primary: 0x2563eb, secondary: 0x1d4ed8, accent: 0x60a5fa },
      { name: 'Platinum Shadow', hex: '#94a3b8', primary: 0x475569, secondary: 0x334155, accent: 0x38bdf8 },
    ];
  });

  readonly userSelectedColorway = signal<ColorwayOption | null>(null);
  readonly activeColorway = computed<ColorwayOption>(() => {
    return this.userSelectedColorway() ?? this.colorways()[0];
  });

  // Contextual Hotspots based on product category
  readonly hotspots = computed<HotspotSpec[]>(() => {
    const type = this.activeModelType();

    if (type === 'SmartWatch') {
      return [
        {
          id: 'amoled-display',
          title: 'Super AMOLED Sapphire Crystal',
          subtitle: 'Always-On Display with 2000 nits Peak',
          category: 'Optics & Visuals',
          anchor: [0, 0.35, 0],
          details: 'Constructed from lab-grown sapphire crystal with Mohs hardness 9. Features 450x450 resolution and anti-reflective oleophobic coating.',
          metrics: [
            { label: 'Peak Brightness', value: '2,000 Nits' },
            { label: 'Mohs Hardness', value: 'Grade 9 Sapphire' },
          ],
          certification: 'MIL-STD-810H Drop Tested',
        },
        {
          id: 'titanium-case',
          title: 'Aerospace Titanium Armor',
          subtitle: 'Grade 5 Custom Micro-Milled Chassis',
          category: 'Chassis & Metallurgy',
          anchor: [1.35, 0.1, 0.1],
          details: 'Cold-forged aerospace grade titanium offering superior strength-to-weight ratio with diamond-like carbon (DLC) surface passivation.',
          metrics: [
            { label: 'Tensile Strength', value: '950 MPa' },
            { label: 'Weight Reduction', value: '44% vs Steel' },
          ],
          certification: 'ISO 1413 Shock Resistance',
        },
        {
          id: 'bio-sensor',
          title: 'BioActive PPG 3-in-1 Sensor',
          subtitle: 'Heart Rate, ECG & BIA Body Analysis',
          category: 'Medical Telemetry',
          anchor: [0, -0.35, 0],
          details: 'Underside optical sensor cluster measuring continuous photoplethysmography heart rate, blood oxygen (SpO2), and skin surface temperature.',
          metrics: [
            { label: 'Sampling Rate', value: '256 Hz PPG' },
            { label: 'Accuracy Score', value: '98.8% Clinical' },
          ],
          certification: 'FDA 510(k) Cleared Algorithms',
        },
        {
          id: 'hydro-seal',
          title: '5 ATM / IP68 Hydro-Armor',
          subtitle: 'Double-Gasket Precision Sealed Cavity',
          category: 'Environmental Durability',
          anchor: [-1.25, 0.1, 0],
          details: 'Engineered with hydrophobic acoustic membranes and pressure-sealed gaskets allowing open-water swimming and extreme saltwater resilience.',
          metrics: [
            { label: 'Depth Rating', value: '50 Meters (5 ATM)' },
            { label: 'Dust Protection', value: 'IP6X Total Seal' },
          ],
          certification: 'ISO 22810:2010 Water Resistant',
        },
        {
          id: 'fluoro-strap',
          title: 'Ultra-Flex Fluoroelastomer Band',
          subtitle: 'Hypoallergenic Ergonomic Ribbed Strap',
          category: 'Ergonomics & Wearability',
          anchor: [0, -0.2, 1.8],
          details: 'High-density fluoropolymer elastomer resistant to UV discoloration, sweat, and oils. Equipped with quick-release titanium spring bars.',
          metrics: [
            { label: 'Tensile Elongation', value: '450% Elasticity' },
            { label: 'Skin Tolerance', value: 'Biocompatible ISO 10993' },
          ],
          certification: 'OEKO-TEX Standard 100 Class 1',
        },
      ];
    }

    if (type === 'Computer') {
      return [
        {
          id: 'display',
          title: 'Liquid Retina XDR Display',
          subtitle: 'Anti-Reflective 120Hz ProMotion Panel',
          category: 'Optics & Visuals',
          anchor: [0, 1.2, -0.6],
          details: 'Precision factory-calibrated 1600 nits peak brightness display with DCI-P3 wide color gamut and delta-E < 1 accuracy.',
          metrics: [
            { label: 'Brightness', value: '1600 nits' },
            { label: 'Refresh Rate', value: '120Hz ProMotion' },
          ],
          certification: 'VESA DisplayHDR 1000 Certified',
        },
        {
          id: 'chassis',
          title: 'CNC Aluminum Unibody',
          subtitle: 'Aerospace Grade 6000 Series Alloy',
          category: 'Structural Architecture',
          anchor: [0.9, -0.2, 0.4],
          details: 'Milled from a single solid block of custom-alloy aluminum. Thermally optimized for zero thermal throttling under load.',
          metrics: [
            { label: 'Torsional Rigidity', value: '3800 Nm/deg' },
            { label: 'Thermal Dissipation', value: 'Up to 95W Sustained' },
          ],
          certification: 'MIL-STD-810H Drop & Vibration Rated',
        },
        {
          id: 'keyboard',
          title: 'Haptic Scissor Key Architecture',
          subtitle: '1.0mm Travel with Precision Damping',
          category: 'Tactile Interface',
          anchor: [-0.6, -0.15, -0.1],
          details: 'Sub-millimeter laser-etched backlit keycaps with individual scissor stabilizers and acoustic acoustic foam dampers.',
          metrics: [
            { label: 'Actuation Life', value: '15 Million Keystrokes' },
            { label: 'Backlight Zones', value: 'Uniform Mini-LED' },
          ],
          certification: 'ISO 9241-410 Ergonomic Compliant',
        },
      ];
    }

    if (type === 'SmartDevice') {
      return [
        {
          id: 'screen',
          title: 'Corning Gorilla Armor Glass',
          subtitle: '75% Reflection Reduction Coating',
          category: 'Material Engineering',
          anchor: [0, 0.8, 0.2],
          details: 'Molecularly bonded antireflective optical layer with Vickers hardness exceeding 2200 HV.',
          metrics: [
            { label: 'Scratch Resistance', value: '4x vs Aluminosilicate' },
            { label: 'Surface Reflection', value: '< 1% Specular' },
          ],
          certification: 'TÜV Rheinland Eye Comfort Certified',
        },
        {
          id: 'frame',
          title: 'Grade 5 Titanium Frame',
          subtitle: 'Brushed Aerospace Sputtered PVD',
          category: 'Metallurgy',
          anchor: [0.8, 0, 0.1],
          details: 'Cold-forged titanium alloy cross-bracing with internal recycled aluminum sub-structure for maximum structural integrity.',
          metrics: [
            { label: 'Tensile Yield', value: '880 MPa' },
            { label: 'Weight Saving', value: '19g lighter' },
          ],
          certification: 'RoHS & REACH Eco-Certified',
        },
        {
          id: 'optics',
          title: 'Periscope Telephoto Lens Module',
          subtitle: 'Tetraprism 5x Optical Zoom Stabilizer',
          category: 'Sensor Suite',
          anchor: [-0.35, 1.25, -0.2],
          details: 'Precision glass optics with 3D sensor-shift optical image stabilization compensating for up to 10,000 micro-vibrations/sec.',
          metrics: [
            { label: 'OIS Compensation', value: '3-Axis Dynamic' },
            { label: 'Aperture', value: 'ƒ/2.8 Ultra-Clear' },
          ],
          certification: 'DxOMark Gold Standard Rated',
        },
      ];
    }

    // Default: Footwear / Luxury Athletic Runner
    return [
      {
        id: 'cushion',
        title: 'Nitrogen-Infused Dual-Density Foam',
        subtitle: 'Supercritical Gas Foaming Process',
        category: 'Bio-Mechanical Cushioning',
        anchor: [0, -0.5, 0.8],
        details: 'Supercritical nitrogen injection creates millions of closed micro-cells delivering 74.2% energy return on heel strike.',
        metrics: [
          { label: 'Energy Return', value: '74.2% Kinetic' },
          { label: 'Density', value: '0.14 g/cm³' },
        ],
        certification: 'ASTM F1976-13 Shock Attenuation Passed',
      },
      {
        id: 'upper',
        title: 'Aeroweave 3D Monofilament Upper',
        subtitle: 'Zero-Waste Circular Seamless Knit',
        category: 'Textile Innovation',
        anchor: [0.2, 0.3, 0],
        details: 'High-tensile monofilament yarn offering zoned breathability in the toe box and reinforced lateral support along the midfoot.',
        metrics: [
          { label: 'Air Permeability', value: '320 L/m²/s' },
          { label: 'Recycled Content', value: '88% Post-Consumer' },
        ],
        certification: 'OEKO-TEX Standard 100 Class 1',
      },
      {
        id: 'outsole',
        title: 'Volcanized Grip Matrix Outsole',
        subtitle: 'Wet-Surface Siped Rubber Formula',
        category: 'Traction Compound',
        anchor: [0, -0.7, -1.2],
        details: 'Multi-directional siping channels water away from contact patches, maintaining high friction coefficient on wet tile and asphalt.',
        metrics: [
          { label: 'Wet Friction Coeff', value: 'µ = 0.88' },
          { label: 'Abrasion Loss', value: '< 65 mm³ (DIN 53516)' },
        ],
        certification: 'SATRA TM144 Slip Resistance Approved',
      },
      {
        id: 'escrow-seal',
        title: 'Nexus Escrow Quality Audit',
        subtitle: 'Dockside Inspection Guarantee',
        category: 'B2B Wholesale Assurance',
        anchor: [0.2, 0.8, -0.2],
        details: 'Each wholesale batch undergoes automated barcode serialization and 72-hour escrow inspection protection before final payment disbursement.',
        metrics: [
          { label: 'Acceptance Rate', value: '99.4% Across Batches' },
          { label: 'Escrow Window', value: '72-Hour Inspection SLA' },
        ],
        certification: 'ISO-9001 B2B Verified Manufacturer',
      },
    ];
  });

  constructor() {
    effect(() => {
      // Re-run if model type changes dynamically
      const _ = this.activeModelType();
      if (this.productGroup && this.renderer) {
        this.buildContextualProductModel();
      }
    });

    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.initThreeStudio();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.cleanupThree();
    });
  }

  private initThreeStudio() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 540;

    // 1. Scene setup
    this.scene = new THREE.Scene();

    // 2. Camera setup - Positioned for optimal showcase viewing
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0.8, 4.6);

    // 3. High-Performance WebGL Renderer with Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;

    // HDRI Studio Environment Map (vital for PBR realism so models reflect light and never go dark)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    // 4. Studio 360 Lighting Rig (Omnidirectional illumination preventing shadows)
    // Hemisphere light provides uniform skylight and ground bounce
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 2.0);
    this.scene.add(hemiLight);

    // Front Key Light (Soft studio white)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.8);
    this.directionalLight.position.set(3, 5, 4);
    this.scene.add(this.directionalLight);

    // Back Key Light (Illuminates the back when rotating 360°, preventing darkness!)
    this.backDirectionalLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.backDirectionalLight.position.set(-3, 4, -4);
    this.scene.add(this.backDirectionalLight);

    // Left Rim Light (Indigo highlight)
    const leftRim = new THREE.DirectionalLight(0x818cf8, 1.8);
    leftRim.position.set(-5, 1, 1);
    this.scene.add(leftRim);

    // Right Rim Light (Cyan highlight)
    const rightRim = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rightRim.position.set(5, 1, -1);
    this.scene.add(rightRim);

    // Top Overhead Softbox
    const topLight = new THREE.DirectionalLight(0xffffff, 1.6);
    topLight.position.set(0, 7, 0);
    this.scene.add(topLight);

    // 5. Studio Circular Floating Pedestal with Glowing Cyber Rim
    const pedestalGeo = new THREE.CylinderGeometry(2.2, 2.3, 0.12, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.5,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -1.6;
    this.scene.add(pedestal);

    const ringGeo = new THREE.TorusGeometry(2.25, 0.03, 16, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x6366f1,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = -1.54;
    this.scene.add(ringMesh);

    // 6. Build Contextual 3D Product Mesh
    this.productGroup = new THREE.Group();
    this.buildContextualProductModel();
    this.scene.add(this.productGroup);

    // 7. Handle Resize
    const resizeObserver = new ResizeObserver(() => {
      this.onCanvasResize();
    });
    resizeObserver.observe(canvas);

    // 8. Start Animation Loop
    this.animate();
  }

  private buildContextualProductModel() {
    this.modelMeshes = [];
    this.wireframeMeshes = [];
    this.productGroup.clear();

    const type = this.activeModelType();
    const color = this.activeColorway();

    if (type === 'SmartWatch') {
      this.buildSmartWatchModel(color);
    } else if (type === 'Computer') {
      this.buildLaptopModel(color);
    } else if (type === 'SmartDevice') {
      this.buildSmartDeviceModel(color);
    } else {
      this.buildFootwearRunnerModel(color);
    }
  }

  // --- MODEL 1: Luxury Interactive Smartwatch (e.g. Galaxy Watch / Apple Watch) ---
  private buildSmartWatchModel(color: ColorwayOption) {
    const caseMat = new THREE.MeshStandardMaterial({
      color: color.primary,
      metalness: 0.65,
      roughness: 0.25,
    });

    const bezelMat = new THREE.MeshStandardMaterial({
      color: color.secondary,
      metalness: 0.75,
      roughness: 0.2,
    });

    const strapMat = new THREE.MeshStandardMaterial({
      color: color.primary,
      metalness: 0.15,
      roughness: 0.5,
    });

    const displayGlassMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.8,
      roughness: 0.05,
    });

    const screenDialMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: color.accent,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: color.accent,
      emissive: color.accent,
      emissiveIntensity: 1.0,
      roughness: 0.15,
    });

    // 1. Central Watch Case Body (Curved Cylindrical Chassis)
    const caseGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.42, 48);
    const caseMesh = new THREE.Mesh(caseGeo, caseMat);
    this.productGroup.add(caseMesh);
    this.modelMeshes.push(caseMesh);

    // 2. Outer Rotating Bezel Ring
    const bezelGeo = new THREE.TorusGeometry(1.26, 0.08, 16, 48);
    bezelGeo.rotateX(Math.PI / 2);
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.y = 0.18;
    this.productGroup.add(bezelMesh);
    this.modelMeshes.push(bezelMesh);

    // 3. AMOLED Display Glass (Top crystal)
    const displayGeo = new THREE.CylinderGeometry(1.18, 1.18, 0.04, 48);
    const displayMesh = new THREE.Mesh(displayGeo, screenDialMat);
    displayMesh.position.y = 0.22;
    this.productGroup.add(displayMesh);
    this.modelMeshes.push(displayMesh);

    // 4. AMOLED Inner Dial Ring Graphic (High-tech watch metrics ring)
    const dialRingGeo = new THREE.RingGeometry(0.85, 0.94, 48);
    dialRingGeo.rotateX(-Math.PI / 2);
    const dialRingMesh = new THREE.Mesh(dialRingGeo, accentMat);
    dialRingMesh.position.y = 0.245;
    this.productGroup.add(dialRingMesh);
    this.modelMeshes.push(dialRingMesh);

    // 5. Watch Digital Center Hub & Hands / Time Gauge
    const centerHubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24);
    const centerHubMesh = new THREE.Mesh(centerHubGeo, accentMat);
    centerHubMesh.position.y = 0.25;
    this.productGroup.add(centerHubMesh);
    this.modelMeshes.push(centerHubMesh);

    // Watch Hands (Hours & Minutes indicators)
    const hand1Geo = new THREE.BoxGeometry(0.06, 0.02, 0.65);
    const hand1Mesh = new THREE.Mesh(hand1Geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }));
    hand1Mesh.position.set(0, 0.25, -0.28);
    this.productGroup.add(hand1Mesh);
    this.modelMeshes.push(hand1Mesh);

    const hand2Geo = new THREE.BoxGeometry(0.5, 0.02, 0.05);
    const hand2Mesh = new THREE.Mesh(hand2Geo, accentMat);
    hand2Mesh.position.set(0.22, 0.25, 0);
    this.productGroup.add(hand2Mesh);
    this.modelMeshes.push(hand2Mesh);

    // 6. Right Tactile Crown Button (Knurled Titanium Dial)
    const crownGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 24);
    crownGeo.rotateZ(Math.PI / 2);
    const crownMesh = new THREE.Mesh(crownGeo, bezelMat);
    crownMesh.position.set(1.36, 0.05, 0);
    this.productGroup.add(crownMesh);
    this.modelMeshes.push(crownMesh);

    // Secondary Action Button
    const btnGeo = new THREE.BoxGeometry(0.12, 0.14, 0.45);
    const btnMesh = new THREE.Mesh(btnGeo, caseMat);
    btnMesh.position.set(1.30, -0.05, 0.55);
    this.productGroup.add(btnMesh);
    this.modelMeshes.push(btnMesh);

    // 7. Underside Sensor Dome (BioActive PPG Heart-Rate / SpO2)
    const sensorDomeGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 36);
    const sensorDomeMesh = new THREE.Mesh(sensorDomeGeo, displayGlassMat);
    sensorDomeMesh.position.y = -0.23;
    this.productGroup.add(sensorDomeMesh);
    this.modelMeshes.push(sensorDomeMesh);

    // Glowing Optical Sensor LEDs (Green & Infrared)
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const ledGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.8,
      });
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(Math.cos(angle) * 0.45, -0.27, Math.sin(angle) * 0.45);
      this.productGroup.add(ledMesh);
      this.modelMeshes.push(ledMesh);
    }

    // 8. Luxury Silicone / Titanium Articulated Straps (Top and Bottom)
    // Top Strap
    const topStrapGeo = new THREE.BoxGeometry(1.3, 0.16, 2.2);
    const topStrapMesh = new THREE.Mesh(topStrapGeo, strapMat);
    topStrapMesh.position.set(0, -0.15, -1.9);
    topStrapMesh.rotation.x = 0.28; // Curved natural wrist draping
    this.productGroup.add(topStrapMesh);
    this.modelMeshes.push(topStrapMesh);

    // Bottom Strap
    const btmStrapGeo = new THREE.BoxGeometry(1.3, 0.16, 2.2);
    const btmStrapMesh = new THREE.Mesh(btmStrapGeo, strapMat);
    btmStrapMesh.position.set(0, -0.15, 1.9);
    btmStrapMesh.rotation.x = -0.28; // Curved natural wrist draping
    this.productGroup.add(btmStrapMesh);
    this.modelMeshes.push(btmStrapMesh);

    // Strap Buckle / Clasp
    const buckleGeo = new THREE.BoxGeometry(1.36, 0.22, 0.35);
    const buckleMesh = new THREE.Mesh(buckleGeo, bezelMat);
    buckleMesh.position.set(0, -0.42, 2.8);
    this.productGroup.add(buckleMesh);
    this.modelMeshes.push(buckleMesh);

    // Initial slight tilt for showcase angle
    this.productGroup.rotation.x = 0.35;
    this.productGroup.rotation.y = -0.25;

    this.generateWireframeOverlays();
  }

  // --- MODEL 2: High-Tech Laptop Computer (MacBook / Dell XPS) ---
  private buildLaptopModel(color: ColorwayOption) {
    const baseMat = new THREE.MeshStandardMaterial({
      color: color.primary,
      metalness: 0.6,
      roughness: 0.3,
    });

    // Laptop Base Chassis
    const baseGeo = new THREE.BoxGeometry(3.0, 0.12, 2.0);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -0.4, 0);
    this.productGroup.add(baseMesh);
    this.modelMeshes.push(baseMesh);

    // Keyboard recess
    const kbGeo = new THREE.BoxGeometry(2.6, 0.02, 1.1);
    const kbMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const kbMesh = new THREE.Mesh(kbGeo, kbMat);
    kbMesh.position.set(0, -0.33, -0.15);
    this.productGroup.add(kbMesh);
    this.modelMeshes.push(kbMesh);

    // Trackpad
    const padGeo = new THREE.BoxGeometry(0.9, 0.02, 0.55);
    const padMat = new THREE.MeshStandardMaterial({ color: color.secondary, metalness: 0.5, roughness: 0.3 });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(0, -0.33, 0.65);
    this.productGroup.add(padMesh);
    this.modelMeshes.push(padMesh);

    // Laptop Lid / Display Assembly (Open 110 degrees facing camera)
    const lidGroup = new THREE.Group();
    lidGroup.position.set(0, -0.34, -1.0);
    lidGroup.rotation.x = 0.22;

    const lidGeo = new THREE.BoxGeometry(3.0, 2.0, 0.08);
    const lidMesh = new THREE.Mesh(lidGeo, baseMat);
    lidMesh.position.set(0, 1.0, 0);
    lidGroup.add(lidMesh);
    this.modelMeshes.push(lidMesh);

    // Active Display Screen Panel
    const screenGeo = new THREE.PlaneGeometry(2.8, 1.8);
    const screenMat = new THREE.MeshStandardMaterial({
      color: color.accent,
      emissive: color.accent,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 1.0, 0.045);
    lidGroup.add(screenMesh);
    this.modelMeshes.push(screenMesh);

    this.productGroup.add(lidGroup);
    this.productGroup.rotation.x = 0.2;

    this.generateWireframeOverlays();
  }

  // --- MODEL 3: Smart Phone / Mobile Flagship ---
  private buildSmartDeviceModel(color: ColorwayOption) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: color.primary,
      metalness: 0.65,
      roughness: 0.25,
    });

    const displayMat = new THREE.MeshStandardMaterial({
      color: color.accent,
      emissive: color.accent,
      emissiveIntensity: 0.35,
      roughness: 0.15,
      side: THREE.DoubleSide,
    });

    // Main Phone Body
    const bodyGeo = new THREE.BoxGeometry(1.6, 3.2, 0.18);
    const bodyMesh = new THREE.Mesh(bodyGeo, frameMat);
    this.productGroup.add(bodyMesh);
    this.modelMeshes.push(bodyMesh);

    // Front AMOLED Screen
    const screenGeo = new THREE.PlaneGeometry(1.48, 3.0);
    const screenMesh = new THREE.Mesh(screenGeo, displayMat);
    screenMesh.position.set(0, 0, 0.095);
    this.productGroup.add(screenMesh);
    this.modelMeshes.push(screenMesh);

    // Back Camera Island
    const camIslandGeo = new THREE.BoxGeometry(0.7, 0.9, 0.08);
    const camIslandMesh = new THREE.Mesh(camIslandGeo, frameMat);
    camIslandMesh.position.set(-0.35, 1.0, -0.12);
    this.productGroup.add(camIslandMesh);
    this.modelMeshes.push(camIslandMesh);

    // Triple Camera Lenses
    for (let i = 0; i < 3; i++) {
      const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24);
      lensGeo.rotateX(Math.PI / 2);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.2 });
      const lensMesh = new THREE.Mesh(lensGeo, lensMat);
      lensMesh.position.set(-0.35, 1.25 - i * 0.28, -0.16);
      this.productGroup.add(lensMesh);
      this.modelMeshes.push(lensMesh);
    }

    this.productGroup.rotation.x = 0.15;
    this.generateWireframeOverlays();
  }

  // --- MODEL 4: Luxury Aerodynamic Sneaker / Footwear Runner ---
  private buildFootwearRunnerModel(color: ColorwayOption) {
    const upperMat = new THREE.MeshStandardMaterial({
      color: color.primary,
      roughness: 0.55,
      metalness: 0.2,
    });

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.1,
    });

    const midMat = new THREE.MeshStandardMaterial({
      color: color.secondary,
      roughness: 0.45,
      metalness: 0.25,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: color.accent,
      emissive: color.accent,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    // 1. Sculpted Outsole Bottom
    const soleGeo = new THREE.BoxGeometry(1.4, 0.22, 3.8);
    const soleMesh = new THREE.Mesh(soleGeo, soleMat);
    soleMesh.position.set(0, -0.7, 0);
    this.productGroup.add(soleMesh);
    this.modelMeshes.push(soleMesh);

    // 2. Nitrogen Cushioning Midsole
    const midGeo = new THREE.BoxGeometry(1.45, 0.35, 3.7);
    const midMesh = new THREE.Mesh(midGeo, midMat);
    midMesh.position.set(0, -0.42, 0);
    this.productGroup.add(midMesh);
    this.modelMeshes.push(midMesh);

    // 3. Aeroweave Upper Mesh
    const upperGeo = new THREE.ConeGeometry(1.2, 2.6, 24);
    upperGeo.rotateX(Math.PI / 2);
    upperGeo.scale(1.0, 0.7, 1.4);
    const upperMesh = new THREE.Mesh(upperGeo, upperMat);
    upperMesh.position.set(0, 0.05, 0.1);
    this.productGroup.add(upperMesh);
    this.modelMeshes.push(upperMesh);

    // 4. Heel Counter
    const heelGeo = new THREE.BoxGeometry(1.3, 0.8, 0.8);
    const heelMesh = new THREE.Mesh(heelGeo, midMat);
    heelMesh.position.set(0, 0.1, -1.3);
    this.productGroup.add(heelMesh);
    this.modelMeshes.push(heelMesh);

    // 5. Toe Guard
    const toeGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 16);
    toeGeo.rotateX(Math.PI / 2);
    const toeMesh = new THREE.Mesh(toeGeo, midMat);
    toeMesh.position.set(0, -0.2, 1.6);
    this.productGroup.add(toeMesh);
    this.modelMeshes.push(toeMesh);

    // 6. Side Aerodynamic Accent Stripe
    const stripeGeo = new THREE.BoxGeometry(1.5, 0.15, 1.8);
    const stripeMesh = new THREE.Mesh(stripeGeo, accentMat);
    stripeMesh.position.set(0, -0.1, 0.2);
    stripeMesh.rotation.y = 0.15;
    this.productGroup.add(stripeMesh);
    this.modelMeshes.push(stripeMesh);

    this.productGroup.rotation.x = 0.25;
    this.productGroup.rotation.y = -0.4;

    this.generateWireframeOverlays();
  }

  // Generate glowing cyan wireframe edges for X-Ray holographic inspection mode
  private generateWireframeOverlays() {
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.9,
    });

    for (const m of this.modelMeshes) {
      const edges = new THREE.EdgesGeometry(m.geometry);
      const line = new THREE.LineSegments(edges, wireMat);
      line.position.copy(m.position);
      line.rotation.copy(m.rotation);
      line.scale.copy(m.scale);
      line.visible = false;
      this.productGroup.add(line);
      this.wireframeMeshes.push(line);
    }
  }

  // --- Animation & Render Loop ---
  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Handle turntable auto-rotation
    if (this.isAutoRotating() && !this.isPointerDown) {
      this.productGroup.rotation.y += 0.007;
    }

    // Apply inertia velocity
    if (!this.isPointerDown) {
      this.productGroup.rotation.y += this.rotationVelocityY;
      this.productGroup.rotation.x += this.rotationVelocityX;
      this.rotationVelocityY *= 0.94;
      this.rotationVelocityX *= 0.94;

      // Clamp X tilt
      this.productGroup.rotation.x = Math.max(-0.6, Math.min(0.6, this.productGroup.rotation.x));
    }

    // Gentle floating breathing bob
    const time = Date.now() * 0.0015;
    this.productGroup.position.y = Math.sin(time) * 0.06;

    // Project 3D Hotspot world coordinates to 2D screen positions
    this.updateProjectedHotspots();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  // Convert 3D world anchors into 2D canvas pixel coordinates
  private updateProjectedHotspots() {
    if (!this.camera || !this.canvasRef()?.nativeElement) return;

    const canvas = this.canvasRef()!.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const map: Record<string, { x: number; y: number; visible: boolean }> = {};

    for (const spot of this.hotspots()) {
      const v = new THREE.Vector3(...spot.anchor);

      // Transform local anchor through product group world matrix
      v.applyMatrix4(this.productGroup.matrixWorld);

      // Project to Normalized Device Coordinates (-1 to 1)
      v.project(this.camera);

      // Check if behind camera
      const visible = v.z < 1.0;
      const x = ((v.x + 1) * width) / 2;
      const y = ((-v.y + 1) * height) / 2;

      map[spot.id] = { x, y, visible };
    }

    this.projectedHotspots.set(map);
  }

  // --- User Interactive Controls ---
  onPointerDown(e: MouseEvent) {
    this.isPointerDown = true;
    this.showDragHint.set(false);
    this.previousPointerX = e.clientX;
    this.previousPointerY = e.clientY;
  }

  onPointerMove(e: MouseEvent) {
    if (!this.isPointerDown) {
      // Dynamic mouse tilt specular light reflection
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (this.directionalLight) {
        this.directionalLight.position.x = 3 + nx * 3;
        this.directionalLight.position.y = 5 + ny * 2;
      }
      return;
    }

    const deltaX = e.clientX - this.previousPointerX;
    const deltaY = e.clientY - this.previousPointerY;
    this.previousPointerX = e.clientX;
    this.previousPointerY = e.clientY;

    this.rotationVelocityY = deltaX * 0.005;
    this.rotationVelocityX = deltaY * 0.005;

    this.productGroup.rotation.y += this.rotationVelocityY;
    this.productGroup.rotation.x += this.rotationVelocityX;
  }

  onPointerUp() {
    this.isPointerDown = false;
  }

  onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isPointerDown = true;
      this.showDragHint.set(false);
      this.previousPointerX = e.touches[0].clientX;
      this.previousPointerY = e.touches[0].clientY;
    }
  }

  onTouchMove(e: TouchEvent) {
    if (this.isPointerDown && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.previousPointerX;
      const deltaY = e.touches[0].clientY - this.previousPointerY;
      this.previousPointerX = e.touches[0].clientX;
      this.previousPointerY = e.touches[0].clientY;

      this.rotationVelocityY = deltaX * 0.005;
      this.rotationVelocityX = deltaY * 0.005;

      this.productGroup.rotation.y += this.rotationVelocityY;
      this.productGroup.rotation.x += this.rotationVelocityX;
    }
  }

  onTouchEnd() {
    this.isPointerDown = false;
  }

  toggleAutoRotate() {
    this.isAutoRotating.update((v) => !v);
  }

  toggleXRayMode() {
    this.isXRayMode.update((v) => !v);
    const active = this.isXRayMode();

    for (const mesh of this.modelMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (active) {
        mat.transparent = true;
        mat.opacity = 0.22;
        mat.wireframe = false;
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.wireframe = false;
      }
    }

    for (const wire of this.wireframeMeshes) {
      wire.visible = active;
    }
  }

  resetCamera() {
    this.productGroup.rotation.set(0.35, -0.25, 0);
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;
  }

  toggleFullscreen() {
    this.isFullscreen.update((v) => !v);
    setTimeout(() => this.onCanvasResize(), 50);
  }

  applyColorway(color: ColorwayOption) {
    this.userSelectedColorway.set(color);
    this.buildContextualProductModel();
  }

  selectHotspot(spot: HotspotSpec) {
    this.selectedHotspot.set(spot);
    this.isAutoRotating.set(false);
  }

  closeHotspotModal() {
    this.selectedHotspot.set(null);
  }

  private onCanvasResize() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas || !this.renderer || !this.camera) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private cleanupThree() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
