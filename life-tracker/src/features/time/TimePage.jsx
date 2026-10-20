/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */

import { useCallback, useEffect, useState } from "react";
import { Play, Square, Plus, Trash2, Clock3, LoaderCircle } from "lucide-react";
import { format } from "date-fns";
import { formatDuration } from "../../lib/formatters";
import {
  addManualEntry,
  deleteTimeEntry,
  getActiveTimer,
  getTimeCategories,
  getTimeEntriesForDay,
  startTimer,
  stopTimer,
} from "./time.service";

function getDuration(startAt, endAt = new Date().toISOString()) {
  return Math.max(
    0,
    Math.floor(
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000,
    ),
  );
}

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function TimePage() {
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activityTitle, setActivityTitle] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    startAt: toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000)),
    endAt: toLocalInputValue(new Date()),
  });

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  const loadData = useCallback(async () => {
    try {
      const [categoryList, dayEntries, timer] = await Promise.all([
        getTimeCategories(),
        getTimeEntriesForDay(new Date(`${selectedDate}T12:00:00`)),
        getActiveTimer(),
      ]);

      setCategories(categoryList);
      setEntries(dayEntries);
      setActiveTimer(timer);

      if (!selectedCategory && categoryList.length) {
        setSelectedCategory(String(categoryList[0].id));
        setForm((current) => ({
          ...current,
          categoryId: String(categoryList[0].id),
        }));
      }
    } catch (err) {
      setError(err.message || "Could not load your activities.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }

    const update = () => {
      setElapsed(
        Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(activeTimer.startAt).getTime()) / 1000,
          ),
        ),
      );
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [activeTimer]);

  // Keep the visible daily timeline up to date.

  useEffect(() => {
    let cancelled = false;

    async function refreshEntries() {
      try {
        const dayEntries = await getTimeEntriesForDay();

        if (!cancelled) {
          setEntries(dayEntries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not refresh activities.");
        }
      }
    }

    refreshEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart() {
    setError("");
    setSaving(true);

    try {
      const timer = await startTimer({
        title: activityTitle,
        categoryId: selectedCategory,
      });

      setActiveTimer(timer);
      setActivityTitle("");
    } catch (err) {
      setError(err.message || "Could not start the timer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStop() {
    setError("");
    setSaving(true);

    try {
      await stopTimer();
      setActiveTimer(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not stop the timer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await addManualEntry(form);
      setShowManualForm(false);

      const now = new Date();
      setForm((current) => ({
        ...current,
        title: "",
        startAt: toLocalInputValue(new Date(now.getTime() - 60 * 60 * 1000)),
        endAt: toLocalInputValue(now),
      }));

      await loadData();
    } catch (err) {
      setError(err.message || "Could not save the entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this activity entry?")) return;

    try {
      await deleteTimeEntry(id);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not delete the entry.");
    }
  }

  const totalMinutes = entries.reduce(
    (sum, entry) => sum + getDuration(entry.startAt, entry.endAt),
    0,
  );

  const categoryName = (id) =>
    categories.find((category) => category.id === id)?.name || "Uncategorized";

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="animate-spin" size={18} />
        Loading your time log...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm text-slate-500">
            {format(new Date(), "EEEE, dd MMMM yyyy")}
          </p>
          <h1 className="page-title">Time tracking</h1>
          <p className="mt-2 text-sm text-slate-500">
            Track what you actually do, without judging yourself.
          </p>
        </div>

        <button
          onClick={() => setShowManualForm((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
        >
          <Plus size={17} />
          Manual entry
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-brand-50 p-3 text-brand-700">
            <Clock3 size={23} />
          </span>
          <div>
            <h2 className="font-semibold">
              {activeTimer ? "Activity in progress" : "Start an activity"}
            </h2>
            <p className="text-sm text-slate-500">
              {activeTimer
                ? "Your start time is saved locally."
                : "Choose a category and give this activity a name."}
            </p>
          </div>
        </div>

        {activeTimer ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                {categoryName(activeTimer.categoryId)}
              </p>
              <p className="mt-1 text-lg font-semibold">{activeTimer.title}</p>
              <p className="mt-3 font-mono text-4xl font-semibold tracking-tight">
                {formatDuration(Math.floor(elapsed / 60))}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  running
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Started at {format(new Date(activeTimer.startAt), "hh:mm:ss a")}
              </p>
            </div>

            <button
              onClick={handleStop}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700"
            >
              <Square size={17} />
              {saving ? "Saving..." : "Stop and save"}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={activityTitle}
              onChange={(event) => setActivityTitle(event.target.value)}
              placeholder="What are you doing?"
              aria-label="Activity name"
              className="min-w-0 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Activity category"
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-500"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleStart}
              disabled={saving || !activityTitle.trim() || !selectedCategory}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Play size={17} />
              {saving ? "Starting..." : "Start"}
            </button>
          </div>
        )}
      </section>

      {showManualForm && (
        <section className="panel p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Add past activity</h2>

          <form
            onSubmit={handleManualSubmit}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Activity name</span>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Worked on research paper"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Category</span>
              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium">Start time</span>
              <input
                required
                type="datetime-local"
                value={form.startAt}
                onChange={(event) =>
                  setForm({ ...form, startAt: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium">End time</span>
              <input
                required
                type="datetime-local"
                value={form.endAt}
                onChange={(event) =>
                  setForm({ ...form, endAt: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
              />
            </label>

            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                {saving ? "Saving..." : "Save entry"}
              </button>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                const date = new Date(`${selectedDate}T12:00:00`);
                date.setDate(date.getDate() - 1);
                setSelectedDate(format(date, "yyyy-MM-dd"));
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Previous day
            </button>

            <input
              type="date"
              value={selectedDate}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />

            <button
              disabled={selectedDate >= format(new Date(), "yyyy-MM-dd")}
              onClick={() => {
                const date = new Date(`${selectedDate}T12:00:00`);
                date.setDate(date.getDate() + 1);
                setSelectedDate(format(date, "yyyy-MM-dd"));
              }}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Next day
            </button>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Today's timeline</h2>
            <p className="mt-1 text-sm text-slate-500">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}{" "}
              saved
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-2">
            <p className="text-xs text-slate-500">Total time logged</p>
            <p className="text-lg font-semibold">
              {formatDuration(totalMinutes)}
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Clock3 className="mx-auto mb-3 text-slate-300" size={32} />
            <p className="font-medium">No activities logged today</p>
            <p className="mt-1 text-sm text-slate-500">
              Start a timer or add a manual entry to begin.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const category = categories.find(
                (item) => item.id === entry.categoryId,
              );

              return (
                <article
                  key={entry.id}
                  className="flex items-start gap-3 p-4 sm:items-center sm:px-5"
                >
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full sm:mt-0"
                    style={{ backgroundColor: category?.color || "#64748b" }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{entry.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {categoryName(entry.categoryId)} ·{" "}
                      {format(new Date(entry.startAt), "hh:mm a")} –{" "}
                      {format(new Date(entry.endAt), "hh:mm a")}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-sm font-semibold">
                    {formatDuration(getDuration(entry.startAt, entry.endAt))}
                  </p>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Delete ${entry.title}`}
                    title="Delete activity"
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
