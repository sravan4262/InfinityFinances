import type { RecurrenceRule, RecurrenceFrequency } from "./types";

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

export function addInterval(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
  const d = new Date(date);
  if (frequency === "daily") d.setDate(d.getDate() + interval);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7 * interval);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + interval);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + interval);
  return d;
}

export function pendingOccurrences(rule: RecurrenceRule, asOfYmd: string): string[] {
  const out: string[] = [];
  const asOf = parseYmd(asOfYmd);
  const end = rule.endDate ? parseYmd(rule.endDate) : null;

  let cursor: Date;
  if (rule.lastMaterializedThrough) {
    cursor = addInterval(parseYmd(rule.lastMaterializedThrough), rule.frequency, rule.interval);
  } else {
    cursor = parseYmd(rule.startDate);
  }

  while (cursor.getTime() <= asOf.getTime()) {
    if (end && cursor.getTime() > end.getTime()) break;
    out.push(toYmd(cursor));
    cursor = addInterval(cursor, rule.frequency, rule.interval);
  }

  return out;
}

export function describeRecurrence(rule: Pick<RecurrenceRule, "frequency" | "interval" | "endDate">): string {
  const unit =
    rule.frequency === "daily" ? "day" :
    rule.frequency === "weekly" ? "week" :
    rule.frequency === "monthly" ? "month" : "year";
  const every = rule.interval === 1 ? `Every ${unit}` : `Every ${rule.interval} ${unit}s`;
  return rule.endDate ? `${every} until ${rule.endDate}` : every;
}
