import { DemoRunner } from '../../shared/DemoRunner';
import { Alert, UserCard, BarChart } from './components';
import { generateUI, type UISpec } from './genui';

/**
 * DEMO 2 — anyOf discriminated union.
 *
 * The three components no longer share a props shape, so `REGISTRY[name]`
 * stops typechecking: the renderer becomes an explicit, exhaustive switch.
 * Add a fourth component and TypeScript points here.
 */
function RenderUI({ spec }: { spec: UISpec }) {
  switch (spec.component) {
    case 'Alert':
      return <Alert {...spec.props} />;
    case 'UserCard':
      return <UserCard {...spec.props} />;
    case 'BarChart':
      return <BarChart {...spec.props} />;
    default:
      return null;
  }
}

export default function UnionDemo() {
  return (
    <DemoRunner
      blurb="Three components, three different signatures. One schema each, combined with anyOf and discriminated by a single-value enum."
      file="src/demos/02-union/genui.ts"
      examples={[
        'the disk is almost full',
        'introduce Ada Lovelace to the audience',
        'compare the npm downloads of React, Angular and Vue',
      ]}
      run={async (prompt, apiKey) => {
        const spec = await generateUI(prompt, apiKey);
        return { raw: spec, node: <RenderUI spec={spec} /> };
      }}
    />
  );
}
