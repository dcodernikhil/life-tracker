# Life Tracker

Offline-first personal time and expense tracker.

## Stack
- React + Vite
- Tailwind CSS 3.4.17
- Dexie / IndexedDB
- React Router
- Recharts
- Zustand
- Zod
- vite-plugin-pwa

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Important offline notes
- The database is local to this browser profile and origin.
- Clearing browser data can delete locally stored records; add and test export/restore before relying on this app for important records.
- PWA shell caching supports loading the application offline after its first successful visit, when served over HTTPS or localhost.
- Offline entries do not automatically sync between laptop and phone. A sync service must be implemented separately.
