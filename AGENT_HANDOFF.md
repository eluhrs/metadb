# MetaDB: Agent Handoff & Architecture Knowledge Base

This document serves as a comprehensive synchronization point for any new AI agents onboarding onto the **MetaDB** project. It outlines the core architectural frameworks, Google API structures, UI/UX decisions, and specific idiosyncrasies inherent to the codebase.

---

## 1. Project Overview & Tech Stack
MetaDB is a Next.js 14 cataloging application natively designed for archivists and librarians to map, edit, and organize metadata around high-resolution historical documents and images stored directly on Google Drive.

* **Core Framework**: Next.js 14 (App Router)
* **Database Pipeline**: PostgreSQL managed by Prisma (utilizing the native `@prisma/adapter-pg` pool logic).
* **Styling Engine**: Tailwind CSS.
* **Primary Interactive Libraries**: `OpenSeadragon` (Deep Zoom Image Viewing), `@dnd-kit` (Drag & Drop sorting).

---

## 2. Google Integrations (The Authentication Flow)

The single most critical pipeline holding MetaDB together is its deeply intertwined relationship with the Google ecosystem.

### Current Implementation Strategy
1. **NextAuth Google Provider**: The app authenticates users natively through Google via NextAuth.
2. **Scopes Requested**: The application requests broad offline access (`access_type: 'offline'`) to:
   * `https://www.googleapis.com/auth/drive.readonly` (To read/stream deeply nested image structures).
   * `https://www.googleapis.com/auth/spreadsheets.readonly` (To parse remote catalog data metadata).
3. **The Proxy Engine**: Because Google Drive natively blocks hot-linking external image binary streams via CORS, MetaDB utilizes an internal Next.js stream proxy (`/api/images/proxy/route.ts`).
   * When an image is requested, the client hits the Next.js API.
   * The API extracts the active user's Google `access_token` from their NextAuth session cookie.
   * The server fetches the raw binary from Google Drive, calculates the synchronous `Content-Length`, and pipes the buffer directly back to the client.

### ⚠️ Future Goal: Permission Escalation Reduction & Speed
**Your primary objective as a future agent is optimizing and downgrading this permissions hierarchy.**
* **The Problem**: Currently, the proxy forces users to grant app-wide `drive.readonly` permissions, which raises security alarms during organizational audits, and relies strictly on 1-hour OAuth access tokens that silently break when Google refuses to hand over a `refresh_token` after database wipes. Furthermore, pulling 15MB images live from Google's API during active cataloging is a massive UX bottleneck.
* **The Strategy**: Investigate moving the system toward a **Service Account** architecture natively masking the user from the Drive API, reducing the scopes structurally, OR upgrading the local NVMe cache layer to aggressively pre-fetch all project images globally in the background, circumventing real-time Google API network latency entirely during active catalog workflow.

---

## 3. UI/UX Architecture & Decisions

### OpenSeadragon Viewer (`src/components/ImageViewer.tsx`)
The image viewer is a highly customized, ultra-performant React wrapper constructed around the `OpenSeadragon` WebGL engine.
* **Component Stability**: OpenSeadragon's engine crashes silently (rendering a black screen) if the incoming buffer flow lacks a defined `Content-Length`. The Next.js proxy strictly enforces synchronous block calculations to prevent this.
* **Tactile Buttons**: Safari/WebKit natively suppresses CSS `:active` styling on buttons using `e.stopPropagation()` (which is required to prevent clicks from bleeding through the UI into the OSD map underneath). Because of this Chromium bug, the UI tactile buttons (Zoom, Rotate, Flip) bypass Tailwind entirely and utilize explicit Javascript `onMouseDown` inline style matrices (`transform: scale(0.90)`) to guarantee a physically responsive click.
* **Failed Load Catching**: The hook actively monitors the OSD `open-failed` web worker event, aggressively catching 500/401 token expiration errors and triggering a native React overlay blocking the screen to securely alert the user of session timeouts.

### The Catalog Dashboard
* **Structure**: Thumbnail-driven project grid emphasizing premium visual aesthetics (dark mode, glassmorphism, responsive masonry).
* **Caching Mechanics**: A local caching strategy leverages Next.js App Router handlers to minimize redundant DB calls. 

### Field Editing & Metadata Interfaces
* **DndKit (`@dnd-kit`)**: Sorting metadata properties uses a hardened implementation of `@dnd-kit/core`. 
* **Speed Decisions**: We intentionally stripped complex visual CSS transition animations (`framer-motion` opacities) from real-time field toggle logic, strictly prioritizing mathematically instantaneous 0ms DOM visibility re-renders. 
* **Cache-Busting Logic**: `ImageViewer` assigns unique session hashes to image streams explicitly so Chromium drops broken network cache states on failed Google Drive fetches, but cleanly retains static memory cache states when hot-swapping between the "Front" and "Back" image toggles of a single catalog record natively.

### Admin Settings
* **Role Verification**: Admin privileges (`user.role === "LIBRARIAN"`) strictly guard the deeper configuration trees, primarily utilizing server-side validation. Be extremely careful not to accidentally leak Prisma schemas to the client bundle when modifying these trees.

---

## 4. Immediate Development Checkpoints
If you are modifying the database or pushing production builds:
1. Ensure the PostgreSQL container is functionally tracking volume mounts. A folder rename can orphan the volume, triggering silent `P2021 TableDoesNotExist` panics on Prod.
2. If working with Prisma, use `new PrismaPg(pool)` securely via `pg`'s connection string architecture, verifying `process.env.DATABASE_URL` is parsed cleanly during the standalone Webpack `npm run build` phase.
