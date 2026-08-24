# HTML Thumbnail Library

A private, visual library for loose `.html` and `.htm` files. Files are read in your browser and stored in **IndexedDB on this device**—the app does not upload them to a service or change the originals.

## Start on Windows

Double-click **`START.bat`**. On first run it installs the required packages, starts the Vite development server, and opens the library in your browser.

## Start from a terminal

```bash
npm install
npm run dev
```

Open the address shown by Vite (normally <http://localhost:3000>).

## Use the library

1. Select **Upload HTML**, select **Import Folder**, or drag one or more files onto the import area.
2. Click a thumbnail for a large, scrollable preview. Use the arrow buttons (or arrow keys) to move between results and Escape to close.
3. Search document names, titles, paths, and visible page text. Use the slider to change card size and the sort menu to reorder the grid.
4. Use **Download HTML** to recreate the original file. **Remove from library** only removes the IndexedDB copy; it never deletes the source file.

If a matching filename and relative path is imported again, choose whether to replace the library copy, keep both copies, or skip it. Non-HTML files are skipped and included in the import summary.

## Privacy and limitations

- Imported documents remain in this browser profile. Clearing site data removes the library.
- Preview iframes are sandboxed without script permission, so scripts inside imported documents cannot execute or affect the application.
- Remote images or styles referenced by an imported document may still be requested by the browser. For a completely offline preview, use self-contained HTML files.
- Folder import uses the browser's `webkitdirectory` capability and works best in Chromium-based browsers.

## Production build

```bash
npm run build
npm run preview
```
