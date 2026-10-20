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
