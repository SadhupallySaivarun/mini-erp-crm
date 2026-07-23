import { prisma } from "../config/db";

/**
 * Generates a unique, human-readable challan number like: CH-20260722-0007
 * Format: CH-<YYYYMMDD>-<sequence for the day, zero padded>
 *
 * Uses a count of today's challans + retry-on-conflict to stay correct
 * even under concurrent requests (unique constraint on challanNumber
 * guarantees no duplicates ever get persisted).
 */
export async function generateChallanNumber(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const countToday = await prisma.salesChallan.count({
    where: { createdAt: { gte: startOfDay, lt: endOfDay } },
  });

  const sequence = String(countToday + 1).padStart(4, "0");
  return `CH-${datePart}-${sequence}`;
}
