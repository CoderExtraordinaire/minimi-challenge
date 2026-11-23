import * as chrono from "chrono-node";

export interface DateRange {
    from: string;
    to: string;
    label: string;
}

export function resolveDateRange(text: string, now: Date = new Date()): DateRange | null {
    const found = chrono.parse(text, now)[0];
    if (!found) return null;

    let start = found.start.date();
    if (found.start.isCertain("weekday") && !found.start.isCertain("month") && start > now) {
        start = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const end = found.end ? found.end.date() : start;

    const from = new Date(start);
    from.setHours(0, 0, 0, 0);
    const to = new Date(end);
    to.setHours(23, 59, 59, 999);

    return { from: from.toISOString(), to: to.toISOString(), label: found.text };
}