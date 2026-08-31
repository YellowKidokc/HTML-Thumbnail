# HTML Thumbnail Library Desktop

A local Electron application for browsing large folders of `.html` and `.htm` files as cached visual thumbnails. The original React look and browser IndexedDB code (`src/db.js`) remain in the repository for migration compatibility; the desktop library uses main-process filesystem access and an application-data database.

## Development

```bash
npm install
npm run electron:dev
```

## Windows builds

```bash
npm run dist:portable
npm run dist:installer
```

Builds are written to `release/`. The packaged application is a normal GUI executable and does not run `npm run dev` or open a console window.

## Use

1. Click **Register folder** and choose a source folder.
2. HTML files are found recursively; build, cache, temporary, archive, `.git`, and `node_modules` folders are excluded by default.
3. Search/filter the cached thumbnail wall. Click a card for an isolated live preview; use **Open original** or **Show in folder** when needed.
4. Use **Rescan all**, or leave the application open for its five-second filesystem reconciliation watcher.
5. Export/import registrations, categories, favorites, recently-viewed state, and preferences with the sidebar JSON actions.

The database and screenshot cache live under Electron's per-user application-data directory, never beside source HTML. Scans only read source files. Missing files remain recorded, and exact duplicates are grouped by SHA-256 without deleting anything.

**Launch when Windows starts** is OFF by default. When enabled, Electron creates this application's standard login entry and starts minimized. This does not alter any shortcut belonging to **Website Drop Launcher**. The reboot batch prompt reported on the existing machine appears to come from Website Drop Launcher, not HTML Thumbnail Library.

## Security and limitations

Renderer Node integration is disabled, context isolation and sandboxing are enabled, and all privileged operations use the narrow preload API. Grid cards are cached PNG files rather than live iframes. The preview iframe is sandboxed; scripts may render but receive an opaque origin and cannot reach Electron APIs. Highly restrictive pages, pages requiring a server, or unavailable remote assets may still preview imperfectly. Rename detection currently appears as a missing old record plus a newly discovered record. The original browser IndexedDB library is preserved but automatic browser-profile migration is not included in this first version.
