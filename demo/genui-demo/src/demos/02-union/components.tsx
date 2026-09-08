/**
 * DEMO 2 — the catalog, with three DIFFERENT signatures.
 *
 * This is the realistic case: components don't share a props shape.
 */

export type AlertProps = { severity: 'info' | 'warning' | 'error'; message: string };
export type UserCardProps = { name: string; role: string; skills: string[] };
export type BarChartProps = { title: string; bars: { label: string; value: number }[] };

export function Alert({ severity, message }: AlertProps) {
  const icon = { info: 'ℹ️', warning: '⚠️', error: '⛔️' }[severity];
  return (
    <div className={`ui ui--alert ui--${severity}`}>
      <span className="ui__icon">{icon}</span>
      <p>{message}</p>
    </div>
  );
}

export function UserCard({ name, role, skills }: UserCardProps) {
  return (
    <div className="ui ui--card">
      <div className="ui__avatar">{name.charAt(0).toUpperCase()}</div>
      <div>
        <h3>{name}</h3>
        <p>{role}</p>
        <ul className="skills">
          {skills.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BarChart({ title, bars }: BarChartProps) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="ui ui--chart">
      <h3>{title}</h3>
      {bars.map((b) => (
        <div className="bar" key={b.label}>
          <span className="bar__label">{b.label}</span>
          <span className="bar__track">
            <span className="bar__fill" style={{ width: `${(b.value / max) * 100}%` }} />
          </span>
          <b className="bar__value">{b.value}</b>
        </div>
      ))}
    </div>
  );
}
