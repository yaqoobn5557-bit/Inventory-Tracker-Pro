# InvenTrack Pro

## Overview

InvenTrack Pro is a mobile-first inventory management application built with Expo (React Native) and an Express backend. It's designed for store/warehouse operations, providing tools for creating purchase orders (POMAKER), managing invoices, tracking expiry/damage reports, and verifying shoppers. The app follows a simple auth flow: login → store selection → dashboard → feature modules.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: expo-router with file-based routing. All screens are top-level files in `app/` directory (no nested tab/stack groups)
- **Navigation Flow**: Splash (`index.tsx`) → Login → Store Select → Dashboard → Feature screens (pomaker, invoice, expiry-damage, shopper-verify)
- **State Management**: React Query (`@tanstack/react-query`) for server state, React Context (`lib/auth-context.tsx`) for auth state
- **Auth**: Simple email-based login stored in AsyncStorage. No password authentication on the client side — just email + store selection persisted locally
- **Styling**: Raw StyleSheet (no UI library), with a custom color constants file (`constants/colors.ts`). Uses Poppins font family via `@expo-google-fonts/poppins`
- **Animations**: `react-native-reanimated` for transitions and animated splash screen
- **Platform handling**: Web platform gets manual inset values (`webTopInset`/`webBottomInset`), native uses `react-native-safe-area-context`
- **Haptics**: `expo-haptics` used throughout for tactile feedback on button presses
- **Camera**: `expo-camera` used in POMAKER for barcode scanning

### Backend (Express)

- **Runtime**: Express 5 running as a Node.js server, written in TypeScript
- **Entry point**: `server/index.ts` — sets up CORS (handles Replit domains and localhost), serves static files in production
- **Routes**: `server/routes.ts` — currently minimal, designed for `/api` prefixed routes
- **Storage**: `server/storage.ts` — currently uses in-memory storage (`MemStorage` class) with a `Map`. Implements `IStorage` interface for easy swap to database-backed storage
- **Build**: `esbuild` bundles the server for production (`server:build` script)
- **Dev**: `tsx` runs TypeScript directly in development (`server:dev` script)

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` — currently has a `users` table with id (UUID), username, and password
- **Validation**: `drizzle-zod` generates Zod schemas from Drizzle table definitions
- **Migrations**: Drizzle Kit configured to output to `./migrations` directory. Use `npm run db:push` to push schema changes
- **Connection**: Requires `DATABASE_URL` environment variable pointing to a PostgreSQL instance
- **Note**: The storage layer (`server/storage.ts`) currently uses in-memory storage, not the database. The Drizzle schema is set up but not yet wired into the storage implementation

### Shared Code

- `shared/schema.ts` contains database schema and types shared between frontend and backend
- Path aliases: `@/*` maps to root, `@shared/*` maps to `./shared/*`

### Build & Deployment

- **Development**: Two processes run simultaneously — Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production**: Static web build via custom `scripts/build.js`, server bundled with esbuild
- **Replit-specific**: Uses Replit environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`, `REPLIT_INTERNAL_APP_DOMAIN`) for CORS and URL configuration
- **API URL**: Frontend gets the API URL from `EXPO_PUBLIC_DOMAIN` environment variable via `lib/query-client.ts`

## External Dependencies

### Core Services
- **PostgreSQL**: Database (requires `DATABASE_URL` env var). Used with Drizzle ORM for schema management
- **Replit**: Hosting platform — CORS and domain config rely on Replit environment variables

### Key Libraries
- **expo** (~54.0.27): Core mobile framework
- **expo-router** (~6.0.17): File-based routing with typed routes
- **express** (^5.0.1): Backend HTTP server
- **drizzle-orm** (^0.39.3): Type-safe ORM for PostgreSQL
- **@tanstack/react-query** (^5.83.0): Server state management
- **react-native-reanimated** (~4.1.1): Animations
- **expo-camera** (^17.0.10): Barcode scanning in POMAKER
- **@react-native-async-storage/async-storage** (2.2.0): Local persistence for auth state
- **pg** (^8.16.3): PostgreSQL client driver
- **zod** (via drizzle-zod): Schema validation
- **patch-package**: Applied via `postinstall` script for patching node_modules