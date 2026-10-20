/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  CalendarDays,
} from "lucide-react";
import {
  addTransaction,
  deleteTransaction,
  getExpenseCategories,
  getTransactions,
} from "./expense.service";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const currentMonth = () => today().slice(0, 7);

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

const initialForm = {
  type: "expense",
  amount: "",
  description: "",
  categoryId: "",
  paymentMethod: "UPI",
  occurredAt: today(),
};

export default function ExpensesPage() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryData, transactionData] = await Promise.all([
        getExpenseCategories(),
        getTransactions({ month, type: null }),
      ]);

      setCategories(categoryData);
      setTransactions(transactionData);
    } catch (err) {
      setError(err.message || "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = income - expenses;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await addTransaction(form);

      setForm({
        ...initialForm,
        type: form.type,
        occurredAt: today(),
      });

      setSuccess(
        `${form.type === "income" ? "Income" : "Expense"} recorded successfully.`,
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save this transaction.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transaction) => {
    const confirmed = window.confirm(
      `Delete "${transaction.description}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteTransaction(transaction.id);
      setSuccess("Transaction deleted.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete transaction.");
    }
  };

  const getCategoryName = (categoryId) =>
    categories.find((category) => category.id === categoryId)?.name ||
    "Uncategorised";

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="mt-2 text-sm text-slate-500">
            Record spending, income, and your monthly balance.
          </p>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <CalendarDays size={18} className="text-slate-500" />
          <span className="text-sm text-slate-600">Month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="min-w-0 bg-transparent text-sm font-medium outline-none"
          />
        </label>
      </div>

      {/* Feedback */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      {/* Monthly summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Monthly balance"
          amount={formatCurrency(balance)}
          icon={<Wallet size={21} />}
          color="slate"
          description="Income minus expenses"
        />

        <SummaryCard
          title="Total income"
          amount={formatCurrency(income)}
          icon={<TrendingUp size={21} />}
          color="emerald"
          description="Money received this month"
        />

        <SummaryCard
          title="Total expenses"
          amount={formatCurrency(expenses)}
          icon={<TrendingDown size={21} />}
          color="rose"
          description="Money spent this month"
        />
      </div>

      {/* Add transaction */}
      <section className="panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <Plus size={21} />
          </span>

          <div>
            <h2 className="font-semibold text-slate-900">
              Add transaction
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Record income or an expense manually.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((previous) => ({
                    ...previous,
                    type: option.value,
                  }))
                }
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                  form.type === option.value
                    ? option.value === "income"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Amount (₹)
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-emerald-500">
                <IndianRupee size={17} className="text-slate-400" />
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full bg-transparent px-2 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <input
                id="description"
                name="description"
                type="text"
                required
                maxLength={150}
                value={form.description}
                onChange={handleChange}
                placeholder="e.g. Lunch, salary, rent"
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="categoryId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                value={form.categoryId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="occurredAt"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Date
              </label>
              <input
                id="occurredAt"
                name="occurredAt"
                type="date"
                required
                value={form.occurredAt}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="paymentMethod"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Payment method
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Debit Card">Debit card</option>
                <option value="Credit Card">Credit card</option>
                <option value="Bank Transfer">Bank transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || categories.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              {saving ? "Saving..." : "Add transaction"}
            </button>
          </div>

          {categories.length === 0 && !loading && (
            <p className="text-sm text-amber-700">
              No active categories found. Check your default category seeding.
            </p>
          )}
        </form>
      </section>

      {/* Transaction history */}
      <section className="panel overflow-hidden">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="font-semibold text-slate-900">
              Transaction history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"} in {month}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <span className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-500">
              <Wallet size={25} />
            </span>
            <h3 className="font-medium text-slate-800">
              No transactions yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Add your first income or expense to start tracking your monthly
              finances.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((transaction) => {
              const isIncome = transaction.type === "income";

              return (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-6"
                >
                  <span
                    className={`hidden rounded-xl p-3 sm:block ${
                      isIncome
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isIncome ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {transaction.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getCategoryName(transaction.categoryId)} ·{" "}
                      {transaction.paymentMethod || "Other"} ·{" "}
                      {transaction.occurredAt}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`whitespace-nowrap text-sm font-semibold ${
                        isIncome ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(Number(transaction.amount))}
                    </p>
                    <span className="text-xs text-slate-400">
                      {isIncome ? "Income" : "Expense"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(transaction)}
                    title="Delete transaction"
                    aria-label={`Delete ${transaction.description}`}
                    className="ml-1 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, amount, icon, color, description }) {
  const styles = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900">
            {amount}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <span className={`rounded-xl p-3 ${styles[color]}`}>{icon}</span>
      </div>
    </div>
  );
}