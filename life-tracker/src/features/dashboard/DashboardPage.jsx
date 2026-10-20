/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */
import { testBackendConnection } from "../../services/apiTest";

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Clock3,
  Wallet,
  Play,
  Plus,
  ChartNoAxesCombined,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { db } from "../../db/database";
import { formatCurrency } from "../../lib/formatters";
import { getActiveTimer } from "../time/time.service";
import { liveQuery } from "dexie";

function getDuration(entries, activeTimer) {
  const completedMs = entries.reduce((total, entry) => {
    const start = new Date(entry.startAt).getTime();
    const end = new Date(entry.endAt).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return total;
    }

    return total + end - start;
  }, 0);

  const activeMs = activeTimer
    ? Math.max(0, Date.now() - new Date(activeTimer.startAt).getTime())
    : 0;

  const totalMinutes = Math.floor((completedMs + activeMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date = new Date()) {
  return getLocalDayKey(date).slice(0, 7);
}

function getTimeToday(entries) {
  const today = getLocalDayKey();
  const now = Date.now();

  return entries.reduce((total, entry) => {
    const start = new Date(entry.startAt).getTime();
    const end = new Date(entry.endAt).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return total;
    }

    // Include only the portion of each entry that falls within today.
    const dayStart = new Date(`${today}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    return (
      total +
      Math.max(0, Math.min(end, dayEnd, now) - Math.max(start, dayStart))
    );
  }, 0);
}

function formatMilliseconds(ms) {
  const minutes = Math.floor(ms / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function DashboardPage() {
  const location = useLocation();
  const [data, setData] = useState({
    entries: [],
    transactions: [],
    activeTimer: null,
    timeCategories: [],
    loading: true,
    error: "",
  });

  const loadDashboard = useCallback(async () => {
    try {
      const [entries, transactions, activeTimer, timeCategories] =
        await Promise.all([
          db.timeEntries.toArray(),
          db.transactions.toArray(),
          getActiveTimer(),
          db.timeCategories.toArray(),
        ]);

      setData({
        entries,
        transactions,
        activeTimer,
        timeCategories,
        loading: false,
        error: "",
      });
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setData((previous) => ({
        ...previous,
        loading: false,
        error: "Couldn't load your saved data. Please try again.",
      }));
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, location.key]);

  useEffect(() => {
  testBackendConnection()
    .then((result) => console.log("Backend test:", result))
    .catch((error) => {
      console.error("Backend test failed:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    });
}, []);

  // Keep the dashboard in sync with database changes from other components.
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [entries, transactions, activeTimer, timeCategories] =
        await Promise.all([
          db.timeEntries.toArray(),
          db.transactions.toArray(),
          getActiveTimer(),
          db.timeCategories.toArray(),
        ]);

      return {
        entries,
        transactions,
        activeTimer,
        timeCategories,
      };
    }).subscribe({
      next: (result) => {
        setData({
          ...result,
          loading: false,
          error: "",
        });
      },
      error: (error) => {
        console.error("Failed to load dashboard:", error);
        setData((previous) => ({
          ...previous,
          loading: false,
          error: "Couldn't load your saved data. Please try again.",
        }));
      },
    });

    return () => subscription.unsubscribe();
  }, [location.key]);

  const today = getLocalDayKey();
  const month = getLocalMonthKey();

  const todayEntries = data.entries.filter(
    (entry) => entry.startAt?.slice(0, 10) === today,
  );

  const todayTransactions = data.transactions.filter(
    (transaction) => transaction.occurredAt?.slice(0, 10) === today,
  );

  const monthTransactions = data.transactions.filter(
    (transaction) => transaction.occurredAt?.slice(0, 7) === month,
  );

  const todayExpenses = todayTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

  const monthIncome = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

  const monthExpenses = monthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

  const recentActivity = [
    ...data.entries.map((entry) => ({
      id: `time-${entry.id}`,
      title: entry.title,
      date: entry.startAt,
      type: "time",
      detail: entry.endAt
        ? formatMilliseconds(
            Math.max(
              0,
              new Date(entry.endAt).getTime() -
                new Date(entry.startAt).getTime(),
            ),
          )
        : "Time entry",
    })),
    ...data.transactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      title: transaction.description,
      date: transaction.occurredAt,
      type: transaction.type,
      detail: `${transaction.type === "income" ? "+" : "-"}${formatCurrency(
        Number(transaction.amount || 0),
      )}`,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const cards = [
    {
      label: "Time logged today",
      value: formatMilliseconds(
        getTimeToday(data.entries) +
          (data.activeTimer
            ? Math.max(
                0,
                Date.now() - new Date(data.activeTimer.startAt).getTime(),
              )
            : 0),
      ),
      note: data.activeTimer
        ? `Tracking: ${data.activeTimer.title}`
        : `${todayEntries.length} completed ${todayEntries.length === 1 ? "entry" : "entries"}`,
      icon: Clock3,
    },
    {
      label: "Expenses today",
      value: formatCurrency(todayExpenses),
      note: `${todayTransactions.filter((item) => item.type === "expense").length} transactions today`,
      icon: Wallet,
    },
    {
      label: "Focused work",
      value: formatMilliseconds(
        getTimeToday(
          data.entries.filter((entry) => {
            const category = data.timeCategories.find(
              (item) => item.id === entry.categoryId,
            );
            return category?.name?.toLowerCase().includes("work");
          }),
        ),
      ),
      note: "Based on categories containing “work”",
      icon: ChartNoAxesCombined,
    },
    {
      label: "Monthly net",
      value: formatCurrency(monthIncome - monthExpenses),
      note: `${formatCurrency(monthIncome)} income · ${formatCurrency(monthExpenses)} expenses`,
      icon: Wallet,
    },
  ];

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

      {data.error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {data.error}
          <button
            onClick={loadDashboard}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <span className="rounded-xl bg-slate-100 p-2 text-slate-600">
                <Icon size={19} />
              </span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">
              {data.loading ? "…" : value}
            </p>
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
            Review your time and money patterns to understand where your day
            goes and what you want to change.
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your latest saved time entries and transactions.
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {recentActivity.length} shown
          </span>
        </div>

        {data.loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading your activity…
          </p>
        ) : recentActivity.length === 0 ? (
          <div className="py-10 text-center">
            <Clock3 className="mx-auto mb-3 text-slate-300" size={30} />
            <p className="font-medium text-slate-700">Nothing logged yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Your saved time entries and transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                    {item.type === "time" ? (
                      <Clock3 size={17} />
                    ) : (
                      <Wallet size={17} />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(item.date), "dd MMM, h:mm a")}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    item.type === "income"
                      ? "text-emerald-600"
                      : item.type === "expense"
                        ? "text-slate-700"
                        : "text-slate-500"
                  }`}
                >
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
