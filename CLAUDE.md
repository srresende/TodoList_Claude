# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Stage 2 is in progress. **Milestone 1 is done:** the desktop app works fully locally, with the whole paper flow from the prototype. It has no login and no cloud sync yet; both need a Supabase project. The Stage 1 prototype in `prototype/` is kept as the approved visual reference.

### Commands (repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Electron with hot reload |
| `npm run build` | Build to `out/` |
| `npm start` | Run the built app |
| `npm test` | Vitest: domain rules + service with in-memory SQLite |
| `npx vitest run src/domain/dominio.test.ts -t "RN-07"` | Run one test file, or one test by name |
| `npm run test:e2e` | Build, then run the Playwright test against the real Electron app (`e2e/`). Set `TODOLIST_CAPTURAS=<folder>` to save screenshots |
| `npm run typecheck` | Check types (`tsconfig.node.json` for main/preload/domain, `tsconfig.web.json` for the renderer) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run db:generate -- --name <nome>` | After changing `src/main/db/schema.ts`, generate a migration in `drizzle/` and commit it. Migrations run on app start |
| `npm run dist:dir` / `npm run dist:win` | Unpacked app / NSIS installer in `dist/` |

**Development-only environment variables** (ignored in the packaged app):
- `TODOLIST_HOJE=AAAA-MM-DD` simulates the date.
- `TODOLIST_DADOS=<folder>` uses an isolated data folder instead of `%APPDATA%/TodoList_C`.
- The packaged exe accepts `--user-data-dir=<folder>`.

**Install notes:**
- npm 11 blocks install scripts, so `npm install` does not download the Electron binary. Run `node node_modules/electron/install.js` once.
- `better-sqlite3` ships N-API prebuilds that work in both Node (tests) and Electron. Never rebuild it; `electron-builder.yml` sets `npmRebuild: false`, and there is no Visual Studio on this machine.

### Stage 2 architecture

The app runs as three Electron processes, with the business rules in a separate shared module:

- **`src/domain/`** is pure TypeScript with no Electron or Node APIs. It holds the PRD rules, is shared by the main process and the renderer, and will be reused by Capacitor in Stage 3. Its parts:
  - **`tipos.ts`** has the entities. `Ctx` injects the clock and the UUID generator, so tests are deterministic.
  - **`consultas.ts`** has the queries. `linhasPaper()` renders today from live activities and past days from the frozen `PaperItem` snapshot.
  - **`assistente.ts`** builds the day-paper wizard (`montarAssistente`) and creates the paper (RN-03, RN-08, RN-09).
  - **`comandos.ts`** is the **only** way to change data. `executar(estado, ctx, comando)` applies one `Comando` (a discriminated union), then `retratoDeHoje()` refreshes today's snapshot. A broken rule throws `ErroDominio`, whose message is shown to the user.
- **Main process: `src/main/servico.ts`** keeps the whole `Estado` in memory (one user's data is small). Each command runs on a clone. On error the clone is restored; on success `Repositorio.salvarDiferencas()` writes only the changed rows in one transaction. It also adds one `outbox` row per change, listing the changed fields; that outbox is the basis for the future per-field LWW sync.
- **Main process: `src/main/db/`** holds the Drizzle schema (snake_case columns) and the repository.
- **Main process: `src/main/index.ts`** sets up the window, the single-instance lock and IPC. The IPC surface is just `estado`, `executar` and `info`, typed in `src/shared/api.ts` and exposed by `src/preload/index.ts` as `window.api`, with `contextIsolation` and `sandbox`.
- **Renderer: `src/renderer/src/`** is React + Zustand (`store.ts`). `cmd()` sends a command and replaces `estado` with the response; it never mutates locally.
  - `tela.ts` decides the screen: wizard, today's paper, or a past paper.
  - Paper, print sheet and A4 styles are hand-written CSS classes in `styles.css`, ported from the prototype for layout fidelity. The rest uses Tailwind utilities.
  - Printing renders `<Folha>` into `#print-root` through a portal and calls `window.print()`. `@media print` hides `#root`.
- **Adding a feature:**
  1. Add a variant to `Comando` and handle it in `aplicar()`.
  2. Cover it in `dominio.test.ts`.
  3. Call it from the UI with `useLoja().cmd({...})`.
  If the feature changes the schema, also change `schema.ts` and run `db:generate`.

### Stage 1 prototype: `prototype/index.html`

- **What it is:** a single self-contained file (vanilla JS + CSS, no dependencies, works offline). To run it, open the file in a browser; there is nothing to build.
- **Data:**
  - State lives in memory and is mirrored to `localStorage` under the key `todolist_c.prototipo.v1`, so a reload does not lose the test.
  - If you change the state shape, bump the key, or `versao` in `novoEstado`.
  - `novoEstado('exemplo')` seeds the 03/11 paper from `descricao-original.md`. `novoEstado('vazio')` simulates a first use.
- **Simulation panel** (bottom-left): advance the simulated date by 1 or 5 days, toggle online/offline, reset the data. The date is `S.hoje`; the app never reads the real clock for "today".
- **Code layout:**
  - `S` holds the persisted state, which mirrors the PRD §3.1 entities.
  - `T` holds transient UI state.
  - Every mutation ends with `commit()`. It refreshes today's paper snapshot, saves, simulates a sync, and re-renders the whole `#app` from string templates.
  - Events are delegated through `data-act`, `data-form` and other `data-*` attributes.
  - Comments cite PRD IDs.
- **Checking it headlessly:**
  - Syntax: extract the `<script>` and run `node --check` on it.
  - Screenshots and PDF: Edge is at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, with `--headless=new --screenshot=… | --print-to-pdf=…`. Inject setup calls before `</script>` in a temp copy of the file to reach a given screen.

The documents are written in Portuguese (pt-BR), and the product UI must be pt-BR too, with dates as dd/mm/aaaa.

- `descricao-original.md`: the owner's original request and the two real example "papers" (03/11 and 04/11/2026), plus the visual layout of the printed sheet. Use these as prototype seed data.
- `brainstorm.md`: what the two examples imply and the decisions taken.
- `PRD.md` (v0.5): **the source of truth**. Requirements use IDs (RF-xx, RN-xx, RNF-xx, decisions Dx), with priority M/S/C (C = backlog, out of the MVP). Cite these IDs in code and commits. When a decision changes, bump the PRD version and add a row to its revision history (section 12).

## What the product is

**TodoList_C** (brand **saladaMista**; the official app name, D9: use it in the UI, the "Sobre" window, the window title, the installer and the executable) is a desktop to-do app built around a daily **"paper"**: one list per date, split into user-defined sections (default "Profissional" / "Pessoal"), printable as an A4 sheet that matches the owner's current handmade layout.

## Delivery stages (PRD §9)

1. **Stage 1, current:** a single interactive clickable prototype page. Data lives in memory, login is fake, there is no backend, and the "Sobre" site and contact are placeholders (D5). It needs a "next day" button to test the import, and real A4 printing through the browser. Exit criterion: the owner walks through the 5 scenarios in PRD §2 and approves the layout.
2. **Stage 2:** the desktop MVP. The stack is confirmed (D10, PRD §8); don't swap pieces without a new PRD decision.
   - **App:** Electron + React + TypeScript + Tailwind, scaffolded with `electron-vite`. UI state lives in Zustand, fed from the main process over IPC.
   - **Domain logic** (paper import, RN-xx rules, sync) goes in a separate, Electron-free TypeScript module, so it can be unit-tested and reused by Capacitor in Stage 3.
   - **Local DB:**
     - SQLite via `better-sqlite3` with Drizzle ORM, migrations through `drizzle-kit`.
     - Accessed **only from the main process**; the renderer talks to it over IPC with `contextIsolation`.
     - The file lives in `app.getPath('userData')`, protected by the OS profile (RNF-03; no SQLCipher).
   - **Backend:** Supabase on the **free tier** (D3, RNF-09: zero infrastructure cost) for Postgres with RLS and auth.
     - Google sign-in uses OAuth with PKCE: the system browser handles it and returns through the `todolistc://` protocol or a temporary loopback server.
     - Email/password uses Supabase Auth directly.
     - The session token is stored encrypted with Electron `safeStorage`, so the app opens offline (RF-04).
   - **Sync:** custom, with no PowerSync or ElectricSQL (see "Sync constraints" below).
   - **Packaging:** `electron-builder` + `electron-updater`, publishing to GitHub Releases. Windows first, macOS second (D1). The MVP is unsigned.
   - **PDF:** `webContents.printToPDF` (RF-55).
   - **Quality:** Vitest for domain rules (RN-03 import, RN-07 propagation, sync conflicts), Playwright in Electron mode for end-to-end tests, and ESLint + Prettier.
3. **Stage 3:** mobile, reusing the React UI through Capacitor.

## Core domain rules (easy to get wrong)

Data model in PRD §3.1: `Usuario`, `Secao`, `Atividade`, `Paper`, `PaperItem`.

- **Paper creation/import (RF-11, RN-03):** on the first launch of a date, import (a) the pending items of the **most recent existing paper**, whatever its date (no business-day logic, and days can be skipped), plus (b) planned activities with `data_planejada <= today` that were never imported. Items come **unchanged**; edits happen only in the new paper.
- **History is a snapshot:** `PaperItem.texto_no_dia` / `status_no_dia` freeze each day. Editing an activity today must not change past papers. Past papers are read-only (D8). The « » buttons in the date band move between papers (RF-16), skipping days without one; past days are rendered from the snapshot, today from live activities (`linhasPaper()`).
- **Unchecked in the wizard (RF-12a, RN-09, D4):** the item stays pending in a "Fora do paper" list with no date and is **not** auto-imported again. It returns only when the user brings it back manually.
- **Hierarchy:** at most 2 levels (item → sub-item). Completing or deleting a parent propagates to its children, never the other way round (RN-07). A pending sub-item pulls its parent into the next paper (RF-14, RN-08).
- Completed or deleted items are never imported (RN-04). There is one paper per user per date (RN-01). "Today" is the local machine date (RN-02).

## Sync constraints (Stage 2)

- The app is local-first: every write goes to the local DB first, and the app must work fully offline (RF-70).
- Client-generated UUIDs; `updated_at` and `deleted_at` (soft delete) on every synced table.
- Sync is custom (D10): a local outbox of changes pushed on reconnect, then an incremental pull of rows with `updated_at > last_sync`.
- Conflict resolution is last-write-wins **per field** by `updated_at` (RF-74), so the design needs per-field timestamps or a per-field change log, not just a row-level `updated_at`. The app must support multiple PCs per user (D6).
- The Supabase free tier pauses the project after one week without use. Sync must tolerate a paused backend and resume later (PRD §8.1).

## A4 print layout (RF-50 to RF-54)

- A date band at the top: background `#323A3D` (the logo background), white bold centered text.
- Each section is a box with a thick black border and a header band (default `#4AA05C`, the green of "mista" in the logo, white bold text; `corTexto()` picks black or white for custom colors).
- Bullets: "●" for level 1 and "○" for level 2.
- **Blank space at the bottom of each box** for handwritten notes.
- The white-background logo is centered in the paper footer, pinned to the bottom of the page when everything fits on one sheet (RF-56).
- Completed items are omitted by default.
- If the content overflows, shrink the font down to a legible minimum; beyond that, break onto a second page without splitting a section.
- Implement with HTML/CSS `@page A4`.

The horizontal saladaMista logo sits at the left of the app header and opens the "Sobre" window (RF-60, RF-61).

- **Source files** (repo root):
  - `logo-salada-mista.jpg` is the original logo (dark background), used on the login screen and in "Sobre".
  - `logo-salada-mista-branco.png` is derived from it with a white background, used in the app header and the paper footer (on screen and in print). It was generated by removing the background color (#323A3D) and recoloring the white and grey text dark; regenerate it if the JPG changes.
- **In the prototype:** both are embedded as base64 data URIs (`LOGO_SRC`, `LOGO_BRANCO_SRC`), so the HTML stays a single offline file. If a logo file changes, re-embed it.
- **App icon:** `resources/icon.png` (512 px) and `resources/icon.ico` (16 to 256 px). Both hold the "SM" symbol cut from `logo-salada-mista.jpg`, with a transparent background; `electron-builder.yml` points to them. The source symbol is only about 133 px wide, so the large sizes are upscaled. Replace both files if a vector version of the symbol becomes available.
