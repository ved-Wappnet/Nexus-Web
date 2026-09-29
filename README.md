# 🌐 Nexus Web — Next-Gen B2B/B2C Marketplace Frontend

A modern, high-performance e-commerce and wholesale marketplace frontend built with **Angular 22 (Standalone Components & Signals)**, **Tailwind CSS**, and **Three.js**.

---

## 🚀 Key Highlights & Features

- **⚡ Modern Architecture**: Angular 22 standalone components, reactive signals, OnPush change detection, and SSR support.
- **🪐 Interactive 360° 3D Product Studio**: Three.js WebGL studio featuring HDR environment reflections, smooth orbit/touch controls, interactive X-Ray spec hotspots, and procedural fallback models.
- **📊 AI Campaign Analytics & Intelligence**: Live marketing recovery engine telemetry (Wishlist & Cart Abandonment, conversion tracking, email pixel telemetry simulation).
- **🛡️ Escrow Inspection & Dispute System**: 72-hour escrow inspection countdown timers, one-click escrow release, and dispute escalation flows.
- **💬 Real-Time Features**:
  - Live RFQ negotiation and quote revision drawer.
  - Interactive WebSocket order tracking and telemetry transit maps (Leaflet + live marker updates).
  - Support ticket chat with attachment uploads and audio notification telemetry.
  - Intelligent AI shopping assistant chatbot widget.
- **🛒 Complete Commerce Suite**: Multi-currency conversion, price alert tracking, wishlist, comparative dock/matrix modal, invoice & packing slip generation, and delivery partner portal with QR code scanner.

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | Angular 22 (Standalone, Signals, Router, SSR) |
| **Styling** | Tailwind CSS 4, PostCSS, Custom Design Tokens |
| **Icons & Visuals** | Lucide Angular, Three.js 3D Engine |
| **Maps & Charts** | Leaflet, Chart.js |
| **Realtime** | Socket.IO Client |
| **Utility & Security** | DOMPurify, Marked, jsQR, QRCode |

---

## 📦 Project Structure

```text
nexus_frontend/
├── public/                 # Static assets, logos, and 3D GLB models
│   ├── brand/              # Nexus brand marks and icons
│   ├── models/             # 3D GLB assets (watch.glb, shoe.glb)
│   └── products/           # Fallback product assets
├── src/
│   ├── app/
│   │   ├── core/           # Guards, interceptors, services, constants & models
│   │   ├── features/       # Feature modules:
│   │   │   ├── admin/      # Admin delivery partner verification
│   │   │   ├── audits/     # Real-time audit trail logs
│   │   │   ├── auth/       # Authentication, registration & OTP password reset
│   │   │   ├── categories/ # Category browsing
│   │   │   ├── checkout/   # Multi-step checkout & payment flows
│   │   │   ├── dashboard/  # Analytics, SLA cards, escrow pipeline & orders
│   │   │   ├── delivery-partner/ # Driver delivery portal & POD submission
│   │   │   ├── orders/     # Order tracking & management
│   │   │   ├── products/   # Catalog, product detail, 360° Studio, management
│   │   │   ├── rfq/        # Request For Quote (RFQ) negotiation
│   │   │   ├── tickets/    # Support ticket system
│   │   │   └── watchlist/  # Price alerts & target notifications
│   │   ├── layouts/        # Shell layout, navigation bar, footer
│   │   └── shared/         # Reusable UI components, pipes & modals
│   └── environments/       # Environment configs (development & production)
└── angular.json            # Angular CLI configuration
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### Installation

```bash
# Navigate to the frontend directory
cd nexus_frontend

# Install dependencies
npm install
```

### Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Ensure the backend API configuration points to your running backend:
- `src/environments/environment.ts`
  - `apiUrl`: `http://localhost:3000` (or your configured backend URL)
  - `socketUrl`: `http://localhost:3000`

### Development Server

Run the local development server:

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload when source files change.

### Production Build

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory ready for deployment.

---

## 🤝 Contribution & Branching Strategy

- **`main`**: Production-ready, stable releases.
- **`develop`**: Active development branch. All feature branches must branch off and merge into `develop` via pull requests.

```bash
# Switch to develop
git checkout develop

# Create your feature branch
git checkout -b feature/your-feature-name
```
