#!/usr/bin/env bash
set -euo pipefail

# Personal Time & Expense Tracker — React + Vite + Tailwind CSS 3
# Usage:
#   chmod +x setup-tracker-frontend.sh
#   ./setup-tracker-frontend.sh
# Optional:
#   PROJECT_NAME=my-tracker ./setup-tracker-frontend.sh

PROJECT_NAME="${PROJECT_NAME:-life-tracker}"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Error: Node.js (LTS) and npm are required. Install Node.js from https://nodejs.org/ and rerun."
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Warning: Node.js 20+ is recommended. Current version: $(node --version)"
fi

if [ -e "$PROJECT_NAME" ]; then
  echo "Error: '$PROJECT_NAME' already exists. Set PROJECT_NAME to a new directory name."
  exit 1
fi

echo "Creating $PROJECT_NAME..."
npm create vite@latest "$PROJECT_NAME" -- --template react
cd "$PROJECT_NAME"

echo "Installing runtime dependencies..."
npm install \
  react-router-dom \
  dexie \
  recharts \
  lucide-react \
  date-fns \
  zustand \
  zod \
  clsx \
  tailwind-merge

echo "Installing Tailwind CSS 3.x and development dependencies..."
npm install -D \
  tailwindcss@3.4.17 \
  postcss \
  autoprefixer \
  vite-plugin-pwa \
  eslint \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh

npx tailwindcss init -p

mkdir -p \
  public/icons \
  src/app \
  src/assets \
  src/components/layout \
  src/components/ui \
  src/features/dashboard/components \
  src/features/time/components \
  src/features/expenses/components \
  src/features/reports/components \
  src/features/settings/components \
  src/hooks \
  src/lib \
  src/services \
  src/store \
  src/styles \
  src/utils \
  src/db \
  src/types

cat > tailwind.config.js <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      boxShadow: {
        soft: "0 8px 30px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
EOF

cat > postcss.config.js <<'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF

cat > src/styles/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
  color: #0f172a;
  background: #f8fafc;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html {
  min-width: 320px;
  min-height: 100%;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

#root {
  min-height: 100vh;
}

@layer components {
  .panel {
    @apply rounded-2xl border border-slate-200 bg-white shadow-soft;
  }

  .page-title {
    @apply text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl;
  }

  .muted {
    @apply text-sm text-slate-500;
  }
}
EOF

cat > src/db/database.js <<'EOF'
import Dexie from "dexie";

export const db = new Dexie("life-tracker");

db.version(1).stores({
  timeEntries: "++id, categoryId, title, startAt, endAt, createdAt",
  timeCategories: "++id, name, color, isArchived",
  transactions: "++id, type, categoryId, occurredAt, createdAt",
  expenseCategories: "++id, name, color, isArchived",
  monthlyFinances: "++id, monthKey",
  goals: "++id, kind, categoryId, periodKey",
  settings: "key",
});

export async function seedDefaultCategories() {
  const timeCount = await db.timeCategories.count();
  if (timeCount === 0) {
    await db.timeCategories.bulkAdd([
      { name: "Office work", color: "#3B82F6", isArchived: false },
      { name: "Projects & research", color: "#10B981", isArchived: false },
      { name: "Learning", color: "#8B5CF6", isArchived: false },
      { name: "Social", color: "#F59E0B", isArchived: false },
      { name: "Travel", color: "#64748B", isArchived: false },
      { name: "Health & rest", color: "#EC4899", isArchived: false },
      { name: "Distractions", color: "#EF4444", isArchived: false },
      { name: "Personal", color: "#14B8A6", isArchived: false },
    ]);
  }

  const expenseCount = await db.expenseCategories.count();
  if (expenseCount === 0) {
    await db.expenseCategories.bulkAdd([
      { name: "Rent & utilities", color: "#3B82F6", isArchived: false },
      { name: "Food", color: "#F59E0B", isArchived: false },
      { name: "Travel", color: "#8B5CF6", isArchived: false },
      { name: "Fuel", color: "#64748B", isArchived: false },
      { name: "Essentials", color: "#14B8A6", isArchived: false },
      { name: "Health & fitness", color: "#EC4899", isArchived: false },
      { name: "Social & entertainment", color: "#F97316", isArchived: false },
      { name: "Smoking & drinking", color: "#EF4444", isArchived: false },
      { name: "Shopping", color: "#A855F7", isArchived: false },
      { name: "Other", color: "#64748B", isArchived: false },
    ]);
  }
}
EOF

cat > src/lib/formatters.js <<'EOF'
import { format } from "date-fns";

export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function formatDuration(totalMinutes = 0) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatDate(date, pattern = "dd MMM yyyy") {
  return format(new Date(date), pattern);
}

export function getMonthKey(date = new Date()) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}
EOF

cat > src/lib/cn.js <<'EOF'
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
EOF

cat > src/store/useAppStore.js <<'EOF'
import { create } from "zustand";

export const useAppStore = create((set) => ({
  activeTimer: null,
  setActiveTimer: (activeTimer) => set({ activeTimer }),
  clearActiveTimer: () => set({ activeTimer: null }),
}));
EOF

cat > src/components/layout/AppLayout.jsx <<'EOF'
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Clock3,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "../../lib/cn";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/time", label: "Time log", icon: Clock3 },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Activity size={22} />
          </div>
          <div>
            <p className="font-semibold">Life Tracker</p>
            <p className="text-xs text-slate-500">Time & money, clearly.</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Offline-first. Your entries are saved on this device.
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2 md:hidden">
              <Activity className="text-brand-600" size={22} />
              <span className="font-semibold">Life Tracker</span>
            </div>
            <p className="hidden text-sm text-slate-500 md:block">
              Personal overview
            </p>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Local mode
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2 text-[10px] font-medium",
                isActive ? "text-brand-700" : "text-slate-500",
              )
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
EOF

cat > src/features/dashboard/DashboardPage.jsx <<'EOF'
import { Link } from "react-router-dom";
import {
  Clock3,
  Wallet,
  Play,
  Plus,
  ChartNoAxesCombined,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "../../lib/formatters";

const cards = [
  {
    label: "Time logged today",
    value: "0h 0m",
    note: "Start tracking an activity",
    icon: Clock3,
  },
  {
    label: "Expenses today",
    value: formatCurrency(0),
    note: "No transactions recorded yet",
    icon: Wallet,
  },
  {
    label: "Focused work",
    value: "0h 0m",
    note: "Based on your time entries",
    icon: ChartNoAxesCombined,
  },
  {
    label: "Current balance",
    value: "Set up",
    note: "Add your opening balance",
    icon: Wallet,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm text-slate-500">
            {format(new Date(), "EEEE, dd MMMM yyyy")}
          </p>
          <h1 className="page-title">Your day, at a glance</h1>
          <p className="mt-2 text-sm text-slate-500">
            Track honestly. Learn from the pattern. Improve one day at a time.
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          Offline-ready foundation
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
                <Icon size={19} />
              </span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            <p className="mt-2 text-xs text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Logging should take seconds, not become another task.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/time"
              className="flex items-center gap-3 rounded-xl bg-brand-600 p-4 text-white transition hover:bg-brand-700"
            >
              <Play size={21} />
              <span>
                <span className="block font-medium">Start activity</span>
                <span className="mt-1 block text-xs text-blue-100">
                  Start a timer or add a past entry
                </span>
              </span>
            </Link>
            <Link
              to="/expenses"
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
            >
              <Plus size={21} className="text-emerald-600" />
              <span>
                <span className="block font-medium">Add transaction</span>
                <span className="mt-1 block text-xs text-slate-500">
                  Record income or an expense
                </span>
              </span>
            </Link>
          </div>
        </div>

        <div className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Build awareness, not guilt</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Record what actually happened. At month-end, your activity history
            can reveal where your time went and which habits you want to change.
          </p>
          <Link
            to="/reports"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            View reports <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <div className="py-10 text-center">
          <Clock3 className="mx-auto mb-3 text-slate-300" size={30} />
          <p className="font-medium text-slate-700">Nothing logged yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Your saved time entries will appear here.
          </p>
        </div>
      </section>
    </div>
  );
}
EOF

cat > src/features/time/TimePage.jsx <<'EOF'
import { Clock3 } from "lucide-react";

export default function TimePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Time log</h1>
        <p className="mt-2 text-sm text-slate-500">
          Start and stop activities or enter time manually.
        </p>
      </div>
      <div className="panel p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-brand-50 p-3 text-brand-700">
            <Clock3 size={22} />
          </span>
          <div>
            <h2 className="font-semibold">Activity tracking</h2>
            <p className="text-sm text-slate-500">
              The timer and entry form will be implemented next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

cat > src/features/expenses/ExpensesPage.jsx <<'EOF'
import { Wallet } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Expenses</h1>
        <p className="mt-2 text-sm text-slate-500">
          Record spending, income, and your monthly balance.
        </p>
      </div>
      <div className="panel p-6">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <Wallet size={22} />
          </span>
          <div>
            <h2 className="font-semibold">Transaction tracking</h2>
            <p className="text-sm text-slate-500">
              The transaction form and balance calculations will be implemented next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
EOF

cat > src/features/reports/ReportsPage.jsx <<'EOF'
import { ChartNoAxesCombined } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="mt-2 text-sm text-slate-500">
          Review time patterns and spending by month.
        </p>
      </div>
      <div className="panel p-6">
        <ChartNoAxesCombined className="mb-3 text-brand-600" size={24} />
        <h2 className="font-semibold">Your monthly overview</h2>
        <p className="mt-2 text-sm text-slate-500">
          Charts and detailed tables will use your locally saved records.
        </p>
      </div>
    </div>
  );
}
EOF

cat > src/features/settings/SettingsPage.jsx <<'EOF'
import { Settings2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure categories, backups, and preferences.
        </p>
      </div>
      <div className="panel p-6">
        <Settings2 className="mb-3 text-slate-600" size={24} />
        <h2 className="font-semibold">Personal preferences</h2>
        <p className="mt-2 text-sm text-slate-500">
          Category management and data export will be added in a later step.
        </p>
      </div>
    </div>
  );
}
EOF

cat > src/app/App.jsx <<'EOF'
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../features/dashboard/DashboardPage";
import TimePage from "../features/time/TimePage";
import ExpensesPage from "../features/expenses/ExpensesPage";
import ReportsPage from "../features/reports/ReportsPage";
import SettingsPage from "../features/settings/SettingsPage";
import { seedDefaultCategories } from "../db/database";

function AppRoutes() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    seedDefaultCategories()
      .then(() => setDbReady(true))
      .catch((error) => {
        console.error("Could not initialize local database:", error);
        setDbError("Local storage could not be initialized. Please check browser storage settings.");
      });
  }, []);

  if (dbError) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="panel max-w-lg p-6">
          <h1 className="text-lg font-semibold">Storage initialization failed</h1>
          <p className="mt-2 text-sm text-slate-600">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        Preparing your local workspace…
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="time" element={<TimePage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
EOF

cat > src/main.jsx <<'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
EOF

cat > vite.config.js <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "Life Tracker",
        short_name: "LifeTracker",
        description: "Personal offline-first time and expense tracker",
        theme_color: "#2563eb",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "/",
        icons: [],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
    }),
  ],
});
EOF

cat > index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#2563eb" />
    <meta name="description" content="A personal offline-first time and expense tracker." />
    <title>Life Tracker — Time & Expenses</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > .env.example <<'EOF'
# Future optional sync configuration.
# Do not put service-role keys or secrets in VITE_ variables.
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
EOF

cat > .gitignore <<'EOF'
node_modules
dist
dist-ssr
*.local
.env
.env.*
!.env.example
.DS_Store
coverage
EOF

cat > README.md <<'EOF'
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
EOF

echo
echo "Setup complete."
echo "Next:"
echo "  cd \"$PROJECT_NAME\""
echo "  npm run dev"
echo
echo "Tailwind CSS version installed:"
npm ls tailwindcss --depth=0
