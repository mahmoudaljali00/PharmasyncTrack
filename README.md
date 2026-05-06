# pharmasync-track

Modern pharmacy management system: products, point-of-sale, inventory, suppliers, customers, users, reports, and a fully-customizable Settings module. Bilingual (English / Arabic) with full RTL support.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **UI:** Tailwind CSS v4 + shadcn/ui + lucide-react
- **Database:** Neon (serverless Postgres) via `@neondatabase/serverless`
- **Auth:** Custom JWT with bcrypt hashing, HTTP-only cookies, refresh tokens
- **Email:** Resend (password resets, admin notifications, test emails)
- **Image storage:** Cloudinary (signed uploads for pharmacy logo)
- **Printing:** Browser print + Web Bluetooth (ESC/POS) + QZ Tray
- **Barcodes:** `jsbarcode` (Code128 default)

## Required Environment Variables

| Key | Used for |
| --- | --- |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | Signs access tokens |
| `RESEND_API_KEY` | Sends transactional email |
| `RESEND_FROM_EMAIL` | Verified sender address |
| `RESEND_FROM_NAME` | Sender display name |
| `APP_URL` | Public app URL used in email links |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (server-side) |
| `CLOUDINARY_API_KEY` | Cloudinary API key (server-side) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret (kept server-side only) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name exposed to the browser |

## Local Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and sign in. The seed admin is created via `/api/auth/seed`.

## Modules

### Authentication & Users
- Login / logout with JWT access + refresh tokens (HTTP-only cookies)
- Forgot password → email link via Resend, 30-min single-use token
- Admin-only User Management at `/dashboard/users`: CRUD, role assignment, activate/deactivate, password reset, activity log, per-user sales summary

### Suppliers & Customers
- Admin-only CRUD at `/dashboard/suppliers` and `/dashboard/customers`
- Soft-delete, status filter, search
- Per-customer purchase history with totals

### Settings (admin-only)
Located at `/dashboard/settings` with seven tabs:

1. **Pharmacy** — name, address, phone, email, tax ID, signed Cloudinary logo upload
2. **Receipt** — header / footer text, paper size (58 mm / 80 mm / A4), show-logo + show-tax toggles, **live preview**
3. **Business** — tax rate, default discount, low-stock threshold, working hours
4. **System** — currency + symbol, timezone, default language / theme, date format, decimal places
5. **Printing** — Browser printing (always available), Web Bluetooth thermal printer (Chrome / Edge), QZ Tray ESC/POS desktop integration. Each is feature-detected and gracefully degrades.
6. **Backup** — JSON export of business data (sensitive fields redacted), restore pharmacy settings from a backup file, schedule preferences (daily / weekly / monthly)
7. **Email** — Resend status + send test email

Settings are loaded once on the server, hydrated into a `SettingsProvider`, and consumed everywhere via `useSettings()`. The POS receipt, sidebar branding, currency formatting and print CSS all read from settings.

### Point of Sale
- Cart with discount, payment method, optional customer assignment
- Receipt component reads from settings for branding, paper size, currency
- Bluetooth ESC/POS test print available in Settings

### Barcode Labels
- Per-product label printing at `/dashboard/products/[id]/labels`
- Adjustable count + small / medium / large layouts
- Renders pharmacy name, product name, Code128 barcode, price

## Printing Architecture

`globals.css` ships paper-size-aware `@media print` rules selected via `data-paper="58mm | 80mm | a4"` for receipts and `data-size="small | medium | large"` for label sheets. The browser print dialog works everywhere with no extra software.

For direct-to-printer scenarios:

- **Web Bluetooth** — `lib/printing/web-bluetooth.ts` connects to a thermal printer over BLE and writes raw ESC/POS bytes built by `lib/printing/escpos.ts`.
- **QZ Tray** — `lib/printing/qz-tray.ts` posts ESC/POS payloads to the locally-running QZ Tray HTTP listener. Users install QZ Tray once from qz.io.

Both clients are feature-detected: if unavailable the UI shows the install/connect CTA and the rest of the app keeps working.

## Backup & Restore

`/api/settings/backup` (GET, admin-only) returns a JSON snapshot of every business table with sensitive fields stripped (password hashes, refresh-token hashes, password-reset tokens). The Backup tab downloads this file via a generated `<a>` element so it never leaves the admin's machine unencrypted in transit.

`/api/settings/restore` (POST, admin-only) accepts the same JSON shape and restores **only** the `pharmacy_settings` row. Full database restore is delegated to Neon's point-in-time recovery — restoring app tables in-process risks foreign-key violations and stale state.

## Security

- bcrypt password hashing (cost 10)
- Admin-only routes use `requireAdmin()` which throws `FORBIDDEN` for non-admins
- Server-side input validation on every settings PATCH
- Sensitive fields (`password_hash`, `token_hash`) never serialized
- Cloudinary uploads are signed server-side; the browser cannot upload without a fresh signature
- Activity log records every admin user mutation with IP + user agent

## Project Layout

```
app/
  api/                        REST endpoints
    auth/                     login, logout, me, forgot/reset password
    settings/                 GET/PATCH, upload-signature, backup, restore, test-email
    users/ suppliers/ customers/ ...
  dashboard/
    settings/page.tsx         Admin settings shell (server component)
    products/[id]/labels/     Barcode label print page
    ...
components/
  settings/
    settings-client.tsx       Tabbed shell + save logic
    tabs/                     Pharmacy, Receipt, Business, System, Printing, Backup, Email
  pos/receipt-print.tsx       Branded, paper-size-aware receipt
  products/label-print-client.tsx
contexts/
  settings-context.tsx        Hydrates pharmacy settings to all client trees
lib/
  settings.ts                 Server-side load/save singleton
  cloudinary.ts               Signed uploads, secure delete
  email.ts                    Resend client
  format.ts                   Currency + date helpers driven by settings
  printing/
    escpos.ts                 ESC/POS byte builders (text, barcode, cut)
    web-bluetooth.ts          Browser BLE client
    qz-tray.ts                QZ Tray HTTP client
```

## Roadmap (intentionally not in scope)

- Multi-branch support (branch table, per-branch users / inventory / invoices)
- Automatic backup cron jobs (currently the schedule is stored, but ingestion happens via download)
- Vendor-specific ESC/POS extensions (drawer kick, multi-language code pages)
