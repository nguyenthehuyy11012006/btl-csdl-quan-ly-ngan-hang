# FHBank Desktop

The desktop interface uses React, TypeScript, Tailwind CSS, and Electron. Its MySQL connection runs in Electron's main process; database credentials are never exposed to the React renderer.

## Run in development

1. Make sure MySQL is running and the `quan_ly_ngan_hang` database exists.
2. Copy `app/.env.example` to `app/.env` and set the local MySQL credentials in `app/.env`.
3. From the project root, run:

   ```shell
   npm install
   npm run dev
   ```

The SQL setup script drops and recreates `quan_ly_ngan_hang`. Run it only if replacing the database contents is acceptable.

## Build for Windows

On Windows, create the NSIS installer:

```powershell
npm run desktop:pack
```

The installer is written to `release/`.

## Configure an installed Windows app

For a packaged app, create `%APPDATA%\FHBank\.env` with the same `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` values. Keep `.env` files local and never commit them.

The MySQL server must be reachable from the computer running the app. Do not commit real database credentials.

## Verify the interface build

```powershell
npm run build
```
