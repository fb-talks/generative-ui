import { DemoRunner } from '../../shared/DemoRunner';
import { REGISTRY } from './components';
import { generateUI } from './genui';

/**
 * DEMO 1 — flat schema.
 * Every component shares the same props, so the renderer is a registry lookup.
 */
export default function FlatDemo() {
  return (
    <DemoRunner
      blurb="One schema for everything: { component, props: { title, text } }. All components share the same props, so rendering is a 4-line registry lookup."
      file="src/demos/01-flat/genui.ts"
      examples={[
        'warn me that my session has expired',
        'introduce Ada Lovelace to the audience',
        'a famous sentence about simplicity in software',
      ]}
      run={async (prompt, apiKey) => {
        const spec = await generateUI(prompt, apiKey);

        const Component = REGISTRY[spec.component];
        const node = Component ? <Component {...spec.props} /> : null;

        return { raw: spec, node };
      }}
    />
  );
}
