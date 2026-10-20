
import { db } from "../../db/database";

const ACTIVE_TIMER_KEY = "activeTimer";

export async function getTimeCategories() {
  return db.timeCategories
    .filter((category) => !category.isArchived)
    .toArray();
}

export async function getActiveTimer() {
  const setting = await db.settings.get(ACTIVE_TIMER_KEY);
  return setting?.value ?? null;
}

export async function startTimer({ title, categoryId }) {
  const activeTimer = await getActiveTimer();

  if (activeTimer) {
    throw new Error("Stop the current activity before starting another.");
  }

  const timer = {
    title: title.trim(),
    categoryId: Number(categoryId),
    startAt: new Date().toISOString(),
  };

  if (!timer.title) {
    throw new Error("Please enter an activity name.");
  }

  await db.settings.put({
    key: ACTIVE_TIMER_KEY,
    value: timer,
  });

  return timer;
}

export async function stopTimer() {
  const timer = await getActiveTimer();

  if (!timer) {
    throw new Error("There is no active timer.");
  }

  const endAt = new Date().toISOString();

  await db.transaction("rw", db.timeEntries, db.settings, async () => {
    await db.timeEntries.add({
      title: timer.title,
      categoryId: timer.categoryId,
      startAt: timer.startAt,
      endAt,
      createdAt: new Date().toISOString(),
    });

    await db.settings.delete(ACTIVE_TIMER_KEY);
  });

  return timer;
}

export async function getTimeEntriesForDay(date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const start = dayStart.toISOString();
  const end = dayEnd.toISOString();

  return db.timeEntries
    .where("startAt")
    .between(start, end, true, true)
    .reverse()
    .sortBy("startAt");
}

// export async function addManualEntry({
//   title,
//   categoryId,
//   startAt,
//   endAt,
// }) {
//   const start = new Date(startAt);
//   const end = new Date(endAt);

//   if (!title.trim()) {
//     throw new Error("Please enter an activity name.");
//   }

//   if (!Number.isFinite(start.getTime()) ||
//       !Number.isFinite(end.getTime()) ||
//       end <= start) {
//     throw new Error("End time must be later than start time.");
//   }

//   const entry = {
//     title: title.trim(),
//     categoryId: Number(categoryId),
//     startAt: start.toISOString(),
//     endAt: end.toISOString(),
//     createdAt: new Date().toISOString(),
//   };

//   const id = await db.timeEntries.add(entry);

//   return { ...entry, id };
// }

export async function deleteTimeEntry(id) {
  await db.timeEntries.delete(id);
}


/**
 * Find saved entries that overlap a proposed time interval.
 * An interval overlaps another when:
 * proposedStart < existingEnd AND proposedEnd > existingStart
 */
export async function findOverlappingEntries(
  startAt,
  endAt,
  excludeId = null,
) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("End time must be later than start time.");
  }

  const entries = await db.timeEntries.toArray();

  return entries.filter((entry) => {
    if (excludeId != null && String(entry.id) === String(excludeId)) {
      return false;
    }

    const existingStart = new Date(entry.startAt).getTime();
    const existingEnd = new Date(entry.endAt).getTime();

    return (
      Number.isFinite(existingStart) &&
      Number.isFinite(existingEnd) &&
      start < existingEnd &&
      end > existingStart
    );
  });
}

/**
 * Update an existing manually recorded or completed activity.
 */
export async function updateTimeEntry(id, values) {
  const title = values.title?.trim();
  const start = new Date(values.startAt);
  const end = new Date(values.endAt);

  if (!title) {
    throw new Error("Please enter an activity name.");
  }

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    throw new Error("End time must be later than start time.");
  }

  const overlaps = await findOverlappingEntries(
    start.toISOString(),
    end.toISOString(),
    id,
  );

  if (overlaps.length > 0) {
    throw new Error(
      "This activity overlaps another saved activity. Adjust the times first.",
    );
  }

  const existing = await db.timeEntries.get(id);

  if (!existing) {
    throw new Error("Activity not found.");
  }

  await db.timeEntries.update(id, {
    title,
    categoryId: Number(values.categoryId),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Add a manual entry while checking for overlapping activities.
 */
export async function addManualEntry(values) {
  const title = values.title?.trim();
  const start = new Date(values.startAt);
  const end = new Date(values.endAt);

  if (!title) {
    throw new Error("Please enter an activity name.");
  }

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    throw new Error("End time must be later than start time.");
  }

  const overlaps = await findOverlappingEntries(
    start.toISOString(),
    end.toISOString(),
  );

  if (overlaps.length > 0) {
    throw new Error(
      "This activity overlaps another saved activity. Adjust the times first.",
    );
  }

  const entry = {
    title,
    categoryId: Number(values.categoryId),
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    createdAt: new Date().toISOString(),
  };

  const id = await db.timeEntries.add(entry);
  return { ...entry, id };
}
