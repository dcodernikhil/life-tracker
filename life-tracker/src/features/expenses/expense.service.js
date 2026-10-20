import { db } from "../../db/database";

export async function getExpenseCategories() {
  return db.expenseCategories
    .filter((category) => !category.isArchived)
    .toArray();
}

export async function getTransactions({ month, type = "expense" } = {}) {
  let transactions = await db.transactions.toArray();

  if (type) {
    transactions = transactions.filter((item) => item.type === type);
  }

  if (month) {
    transactions = transactions.filter(
      (item) => item.occurredAt?.slice(0, 7) === month,
    );
  }

  return transactions.sort(
    (a, b) => b.occurredAt.localeCompare(a.occurredAt),
  );
}

export async function addTransaction(values) {
  const amount = Number(values.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  if (!values.description?.trim()) {
    throw new Error("Enter a description.");
  }

  if (!values.categoryId) {
    throw new Error("Choose a category.");
  }

  if (!values.occurredAt) {
    throw new Error("Choose a date.");
  }

  return db.transactions.add({
    type: values.type || "expense",
    amount,
    description: values.description.trim(),
    categoryId: Number(values.categoryId),
    paymentMethod: values.paymentMethod || "UPI",
    occurredAt: values.occurredAt,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteTransaction(id) {
  return db.transactions.delete(id);
}

export async function updateTransaction(id, values) {
  const amount = Number(values.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  if (!values.description?.trim()) {
    throw new Error("Enter a description.");
  }

  if (!values.categoryId || !values.occurredAt) {
    throw new Error("Category and date are required.");
  }

  return db.transactions.update(id, {
    type: values.type || "expense",
    amount,
    description: values.description.trim(),
    categoryId: Number(values.categoryId),
    paymentMethod: values.paymentMethod || "UPI",
    occurredAt: values.occurredAt,
    updatedAt: new Date().toISOString(),
  });
}
