
import api from "./api";

export async function testBackendConnection() {
  const [health, timeEntries, transactions] = await Promise.all([
    api.get("/health"),
    api.get("/time-entries/"),
    api.get("/transactions/"),
  ]);

  return {
    health: health.data,
    timeEntries: timeEntries.data.items,
    transactions: transactions.data.items,
  };
}
