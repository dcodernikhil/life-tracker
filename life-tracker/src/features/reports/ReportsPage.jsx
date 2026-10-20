/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChartNoAxesCombined,
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock3,
  PiggyBank,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { db } from "../../db/database";
import {
  getTransactions,
  getExpenseCategories,
} from "../expenses/expense.service";

const COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#8B5CF6",
  "#F97316",
  "#64748B",
  "#EF4444",
  "#14B8A6",
];

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDuration = (milliseconds) => {
  const minutes = Math.floor(Math.max(0, milliseconds) / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h ${remainingMinutes}m`;
};

const getBudgetKey = (month) => `category-budgets:${month}`;

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [timeCategories, setTimeCategories] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [budgetInputs, setBudgetInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        transactionData,
        expenseCategoryData,
        timeEntryData,
        timeCategoryData,
        budgetRecord,
      ] = await Promise.all([
        getTransactions({ month, type: null }),
        getExpenseCategories(),
        db.timeEntries.toArray(),
        db.timeCategories.toArray(),
        db.settings.get(getBudgetKey(month)),
      ]);

      setTransactions(transactionData);
      setExpenseCategories(expenseCategoryData);
      setTimeCategories(timeCategoryData);

      // Report entries started in the selected month.
      setTimeEntries(
        timeEntryData.filter((entry) => entry.startAt?.slice(0, 7) === month),
      );

      const savedBudgets = budgetRecord?.value || {};
      setBudgets(savedBudgets);
      setBudgetInputs(
        Object.fromEntries(
          expenseCategoryData.map((category) => [
            category.id,
            savedBudgets[category.id] ?? "",
          ]),
        ),
      );
    } catch (err) {
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const finance = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalBudget = expenseCategories.reduce(
      (sum, category) => sum + (Number(budgets[category.id]) || 0),
      0,
    );

    return {
      income,
      expenses,
      balance: income - expenses,
      totalBudget,
      remaining: totalBudget - expenses,
    };
  }, [transactions, expenseCategories, budgets]);

  const categorySpending = useMemo(() => {
    return expenseCategories
      .map((category, index) => {
        const spent = transactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              Number(transaction.categoryId) === Number(category.id),
          )
          .reduce(
            (sum, transaction) => sum + Number(transaction.amount || 0),
            0,
          );

        const budget = Number(budgets[category.id]) || 0;

        return {
          id: category.id,
          name: category.name,
          spent,
          budget,
          remaining: budget - spent,
          color: category.color || COLORS[index % COLORS.length],
        };
      })
      .filter((item) => item.spent > 0 || item.budget > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [transactions, expenseCategories, budgets]);

  const timeSummary = useMemo(() => {
    const totalMilliseconds = timeEntries.reduce((sum, entry) => {
      if (!entry.startAt || !entry.endAt) return sum;

      const start = new Date(entry.startAt).getTime();
      const end = new Date(entry.endAt).getTime();

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        return sum;
      }

      return sum + end - start;
    }, 0);

    const categoryTotals = timeCategories
      .map((category, index) => {
        const milliseconds = timeEntries.reduce((sum, entry) => {
          if (
            Number(entry.categoryId) !== Number(category.id) ||
            !entry.startAt ||
            !entry.endAt
          ) {
            return sum;
          }

          const start = new Date(entry.startAt).getTime();
          const end = new Date(entry.endAt).getTime();

          if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            end <= start
          ) {
            return sum;
          }

          return sum + end - start;
        }, 0);

        return {
          name: category.name,
          hours: Number((milliseconds / 3600000).toFixed(2)),
          duration: formatDuration(milliseconds),
          color: category.color || COLORS[index % COLORS.length],
        };
      })
      .filter((item) => item.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    return {
      totalMilliseconds,
      completedCount: timeEntries.filter((entry) => entry.endAt).length,
      categoryTotals,
    };
  }, [timeEntries, timeCategories]);

  const saveBudgets = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const nextBudgets = {};

      for (const category of expenseCategories) {
        const rawValue = budgetInputs[category.id];

        if (rawValue === "" || rawValue == null) continue;

        const amount = Number(rawValue);

        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error(`Enter a valid budget for ${category.name}.`);
        }

        if (amount > 0) nextBudgets[category.id] = amount;
      }

      await db.settings.put({
        key: getBudgetKey(month),
        value: nextBudgets,
      });

      setBudgets(nextBudgets);
      setNotice("Budgets saved for this month.");
    } catch (err) {
      setError(err.message || "Unable to save budgets.");
    } finally {
      setSaving(false);
    }
  };

  const spendingOverBudget = categorySpending.filter(
    (category) => category.budget > 0 && category.spent > category.budget,
  );

  if (loading) {
    return (
      <div className="panel p-8 text-center text-sm text-slate-500">
        Loading your monthly report...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review your time patterns, spending, and monthly budget.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <span className="text-sm text-slate-500">Month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setNotice("");
            }}
            className="bg-transparent text-sm font-medium outline-none"
          />
        </label>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {notice}
        </div>
      )}

      {/* Finance summary */}
      <section className="space-y-4">
        <SectionHeading
          icon={<Wallet size={21} />}
          title="Monthly finances"
          description="Based on your saved income and expense transactions."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Income"
            value={formatCurrency(finance.income)}
            detail="Money received"
            icon={<TrendingUp size={20} />}
            color="emerald"
          />
          <SummaryCard
            title="Expenses"
            value={formatCurrency(finance.expenses)}
            detail="Money spent"
            icon={<TrendingDown size={20} />}
            color="rose"
          />
          <SummaryCard
            title="Net balance"
            value={formatCurrency(finance.balance)}
            detail="Income minus expenses"
            icon={<Wallet size={20} />}
            color="indigo"
          />
          <SummaryCard
            title="Budget remaining"
            value={
              finance.totalBudget > 0
                ? formatCurrency(finance.remaining)
                : "Not set"
            }
            detail={
              finance.totalBudget > 0
                ? `Of ${formatCurrency(finance.totalBudget)} budgeted`
                : "Set category budgets below"
            }
            icon={<PiggyBank size={20} />}
            color={finance.remaining < 0 ? "rose" : "amber"}
          />
        </div>
      </section>

      {/* Finance charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="panel p-5 sm:p-6">
          <h2 className="font-semibold text-slate-900">Income vs. expenses</h2>
          <p className="mt-1 text-sm text-slate-500">Selected month totals</p>

          {finance.income === 0 && finance.expenses === 0 ? (
            <EmptyState message="Add income or expenses to see this chart." />
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Income", amount: finance.income },
                    { name: "Expenses", amount: finance.expenses },
                  ]}
                  margin={{ top: 10, right: 8, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis
                    width={55}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      new Intl.NumberFormat("en-IN", {
                        notation: "compact",
                      }).format(value)
                    }
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar
                    dataKey="amount"
                    name="Amount"
                    fill="#6366F1"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="font-semibold text-slate-900">Spending by category</h2>
          <p className="mt-1 text-sm text-slate-500">Expense distribution</p>

          {categorySpending.filter((item) => item.spent > 0).length === 0 ? (
            <EmptyState message="Record expenses to see category-wise spending." />
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySpending.filter((item) => item.spent > 0)}
                    dataKey="spent"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categorySpending
                      .filter((item) => item.spent > 0)
                      .map((item) => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Category budgets */}
      <section className="panel p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-slate-900">Category budgets</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set a spending limit for each category. Budgets are saved per month
            on this device.
          </p>
        </div>

        {spendingOverBudget.length > 0 && (
          <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={19} className="shrink-0" />
            <p>
              {spendingOverBudget.length}{" "}
              {spendingOverBudget.length === 1
                ? "category is"
                : "categories are"}{" "}
              over budget:{" "}
              {spendingOverBudget.map((item) => item.name).join(", ")}.
            </p>
          </div>
        )}

        {expenseCategories.length === 0 ? (
          <EmptyState message="No active expense categories found." />
        ) : (
          <>
            <div className="space-y-5">
              {expenseCategories.map((category, index) => {
                const item = categorySpending.find(
                  (entry) => Number(entry.id) === Number(category.id),
                );
                const spent = item?.spent || 0;
                const budget = Number(budgetInputs[category.id]) || 0;
                const percent = budget > 0 ? (spent / budget) * 100 : 0;
                const over = budget > 0 && spent > budget;

                return (
                  <div key={category.id}>
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              category.color || COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          {category.name}
                        </span>
                        {over && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                            Over budget
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          Spent {formatCurrency(spent)}
                        </span>
                        <div className="relative w-36">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={budgetInputs[category.id] ?? ""}
                            onChange={(event) => {
                              setBudgetInputs((previous) => ({
                                ...previous,
                                [category.id]: event.target.value,
                              }));
                              setNotice("");
                            }}
                            placeholder="No limit"
                            aria-label={`${category.name} budget`}
                            className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {budget > 0 ? (
                      <>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              over
                                ? "bg-rose-500"
                                : percent >= 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-slate-500">
                          <span>{Math.round(percent)}% used</span>
                          <span className={over ? "text-rose-600" : ""}>
                            {over
                              ? `${formatCurrency(spent - budget)} over`
                              : `${formatCurrency(budget - spent)} remaining`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        No budget set.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  Total budget:{" "}
                  {formatCurrency(
                    expenseCategories.reduce(
                      (sum, category) =>
                        sum + (Number(budgetInputs[category.id]) || 0),
                      0,
                    ),
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Leave a field blank or enter 0 to remove its budget.
                </p>
              </div>
              <button
                type="button"
                onClick={saveBudgets}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save budgets"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Time tracking */}
      <section className="space-y-4">
        <SectionHeading
          icon={<Clock3 size={21} />}
          title="Time tracking"
          description="Completed time entries that started in the selected month."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard
            title="Tracked time"
            value={formatDuration(timeSummary.totalMilliseconds)}
            detail="From completed entries"
            icon={<Clock3 size={20} />}
            color="indigo"
          />
          <SummaryCard
            title="Completed entries"
            value={String(timeSummary.completedCount)}
            detail="Entries with a recorded end time"
            icon={<ChartNoAxesCombined size={20} />}
            color="emerald"
          />
        </div>

        <div className="panel p-5 sm:p-6">
          <h2 className="font-semibold text-slate-900">Time by category</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hours recorded in each activity category.
          </p>

          {timeSummary.categoryTotals.length === 0 ? (
            <EmptyState message="No completed time entries found for this month." />
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeSummary.categoryTotals}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" unit=" h" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={115}
                    tickLine={false}
                  />
                  <Tooltip formatter={(value) => `${value} hours`} />
                  <Bar
                    dataKey="hours"
                    name="Hours"
                    fill="#10B981"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Reports use locally stored records. Open time entries are excluded from
        duration totals until an end time is recorded.
      </p>
    </div>
  );
}

function SectionHeading({ icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
        {icon}
      </span>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, detail, icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`rounded-xl p-3 ${colors[color]}`}>{icon}</span>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-slate-50 px-5 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
