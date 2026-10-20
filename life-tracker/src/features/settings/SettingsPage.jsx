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
