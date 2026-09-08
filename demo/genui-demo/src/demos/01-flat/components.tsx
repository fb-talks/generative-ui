/**
 * DEMO 1 — THE CATALOG
 *
 * These are the ONLY components the model is allowed to pick from.
 * The model never writes JSX: it just returns a name + some props.
 */

export type UIProps = {
  title: string;
  text: string;
};

export function Alert({ title, text }: UIProps) {
  return (
    <div className="ui ui--alert">
      <span className="ui__icon">⚠️</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function UserCard({ title, text }: UIProps) {
  return (
    <div className="ui ui--card">
      <div className="ui__avatar">{title.charAt(0).toUpperCase()}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function Quote({ title, text }: UIProps) {
  return (
    <blockquote className="ui ui--quote">
      <p>“{text}”</p>
      <footer>— {title}</footer>
    </blockquote>
  );
}

/** The registry: name -> component. This map IS the contract with the model. */
export const REGISTRY = {
  Alert,
  UserCard,
  Quote,
} satisfies Record<string, React.FC<UIProps>>;

/** Derived from the registry so schema and code can never drift apart. */
export const COMPONENT_NAMES = Object.keys(REGISTRY) as (keyof typeof REGISTRY)[];
