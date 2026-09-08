/**
 * DEMO 3 — the "database".
 *
 * The point of this file: the model never sees these numbers. It only decides
 * WHICH year (and category) the user is asking about; the component fetches
 * the real figures itself. Same trust boundary you have in production.
 */

export type MonthlySales = { label: string; value: number };
export type SalesReportData = {
  year: number;
  category: string;
  months: MonthlySales[];
  total: number;
  previousYearTotal: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_WEIGHT: Record<string, number> = {
  all: 1,
  shoes: 0.42,
  clothing: 0.31,
  accessories: 0.18,
};

/** Deterministic pseudo-random, so the same year always returns the same numbers. */
function seeded(year: number, month: number): number {
  const x = Math.sin(year * 97 + month * 31) * 10000;
  return x - Math.floor(x);
}

function monthsFor(year: number, category: string): MonthlySales[] {
  const weight = CATEGORY_WEIGHT[category] ?? CATEGORY_WEIGHT.all;
  const growth = 1 + (year - 2020) * 0.12;
  return MONTHS.map((label, i) => ({
    label,
    // A summer dip and a December spike, so the chart has a shape worth showing.
    value: Math.round(
      (18_000 + seeded(year, i) * 9_000) *
        (i === 11 ? 1.7 : i === 7 ? 0.6 : 1) *
        growth *
        weight,
    ),
  }));
}

const sum = (rows: MonthlySales[]) => rows.reduce((acc, m) => acc + m.value, 0);

/** Pretends to be `SELECT month, sum(total) FROM orders WHERE year = ?`. */
export function fetchSales(year: number, category = 'all'): Promise<SalesReportData> {
  const months = monthsFor(year, category);
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          year,
          category,
          months,
          total: sum(months),
          previousYearTotal: sum(monthsFor(year - 1, category)),
        }),
      700,
    ),
  );
}
