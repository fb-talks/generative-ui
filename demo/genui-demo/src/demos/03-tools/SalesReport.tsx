import { useEffect, useState } from 'react';
import { fetchSales, type SalesReportData } from './salesDb';

export type SalesReportProps = { year: number; category?: string };

const eur = (n: number) => `€${n.toLocaleString('en-US')}`;

/**
 * DEMO 3 — the component that fetches its own data.
 *
 * The model sends two props: a year and a category. Nothing else. The numbers
 * on screen come from `salesDb`, not from the model — so they can't be
 * hallucinated, and the same question always renders the same figures.
 */
export function SalesReport({ year, category = 'all' }: SalesReportProps) {
  const [data, setData] = useState<SalesReportData | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    fetchSales(year, category).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [year, category]);

  if (!data) {
    return (
      <div className="ui ui--chart">
        <h3>Sales {year}</h3>
        <p className="muted">Querying the database…</p>
      </div>
    );
  }

  const max = Math.max(...data.months.map((m) => m.value), 1);
  const delta = Math.round(((data.total - data.previousYearTotal) / data.previousYearTotal) * 100);

  return (
    <div className="ui ui--chart">
      <h3>
        Sales {data.year}
        {data.category !== 'all' && ` — ${data.category}`}
      </h3>

      <p className="sales__total">
        {eur(data.total)}{' '}
        <span className={delta >= 0 ? 'sales__delta sales__delta--up' : 'sales__delta'}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs {data.year - 1}
        </span>
      </p>

      {data.months.map((m) => (
        <div className="bar" key={m.label}>
          <span className="bar__label">{m.label}</span>
          <span className="bar__track">
            <span className="bar__fill" style={{ width: `${(m.value / max) * 100}%` }} />
          </span>
          <b className="bar__value">{Math.round(m.value / 1000)}k</b>
        </div>
      ))}

      <p className="muted sales__source">
        source: <code>fetchSales({data.year}, '{data.category}')</code> — not the model
      </p>
    </div>
  );
}
