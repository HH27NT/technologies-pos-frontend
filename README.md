# tECHnologies POS — Frontend

Web client (SPA) for **tECHnologies POS**, a multi-tenant point-of-sale system for bars and
restaurants. This repository contains only the user interface; it needs the API from
**technologies-pos-backend** running to log in and load data.

**Stack:** React 19 · TypeScript · Vite 8 · TanStack Query & Table · React Router 7 ·
React Hook Form + Zod · Zustand · Tailwind CSS + Radix UI · Recharts · Axios ·
Vitest + Testing Library · pnpm

## Features

- **POS screen** (`/pos`): tables, orders and items, kitchen tickets, discounts,
  cancellations, payments and receipts.
- **Shared-terminal mode:** waiters identify themselves with a PIN on a shared tablet, with
  automatic lock.
- **Back office** (`/app`): establishments, settings, users, roles, categories, products
  (including bulk load), recipes, suppliers, units, supplies and stock movements, tables,
  cash register, printers, authorizations inbox, personal authorization PIN, audit log and
  reports with charts.
- Role-aware navigation and route guards; lazy-loaded pages.
- Axios client with token handling and normalized API errors; server state with
  TanStack Query.

## Getting started

Requirements: Node.js 20+ and pnpm (`corepack enable` installs the version pinned in
`package.json`).

```bash
pnpm install
cp .env.example .env     # set VITE_API_URL to the backend base URL (without /api/v1)
pnpm dev                 # http://localhost:5173
```

`VITE_API_URL` is the backend origin; the client appends `/api/v1` itself. With the backend's
Docker setup it is `http://localhost:8080` (or `http://localhost:8000` with
`php artisan serve`). Restart `pnpm dev` after changing `.env`.

### Docker (optional)

```bash
docker compose up dev            # dev server on http://localhost:5173
docker compose up --build web    # production build served by Nginx on http://localhost:8085
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Type-check and production build to `dist/` |
| `pnpm preview` | Serve the production build locally |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc -b`) |
| `pnpm test` | Run the test suite once (Vitest) |
| `pnpm test:coverage` | Tests with coverage report |

## Tests

Latest local run: **35 test files, 247 tests passing**; coverage 62.3% statements,
57.0% branches, 55.6% functions, 63.1% lines. Type-check and production build pass; ESLint
reports 0 errors and 2 warnings.

## Project structure

```
src/
  app/          router, layout, providers, lazy-loaded pages
  features/     one folder per module (api, components, pages, schemas, types):
                auditoria, auth, autorizaciones, caja, categorias, configuracion,
                establecimientos, impresoras, insumos, mesas, ordenes, pagos, productos,
                proveedores, recetas, reportes, roles, terminal, tickets, unidades, usuarios
  components/   shared components and UI primitives
  lib/          API client, auth store and guards, formatting, theme
  test/         test utilities
docker/         Nginx configuration for the production image
docs/           design notes and role matrix
```

## Authors

- **Eduardo Palacios Quiroz** — [@LaloP1](https://github.com/LaloP1)
- **Hector Hugo Naranjo**

## License

[MIT](LICENSE) © 2026 Hector Hugo Naranjo and Eduardo Palacios Quiroz

---

## Resumen en español

Interfaz web (React 19 + TypeScript + Vite) del punto de venta multi-tenant **tECHnologies
POS** para bares y restaurantes: pantalla de venta con mesas, órdenes, comandas y cobros; modo
terminal compartida con PIN de mesero; y panel de administración con catálogo, inventario,
caja, usuarios, autorizaciones, auditoría y reportes. Necesita el backend
(technologies-pos-backend). Arranque: `pnpm install`, copiar `.env.example` a `.env` con
`VITE_API_URL` apuntando al backend, y `pnpm dev`. Pruebas: `pnpm test` (247 pruebas).
Proyecto de Eduardo Palacios Quiroz (@LaloP1) y Hector Hugo Naranjo, con licencia MIT.
