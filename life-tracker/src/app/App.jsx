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
