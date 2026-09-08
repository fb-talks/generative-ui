import { DemoRunner } from '../../shared/DemoRunner';
import { Alert, UserCard, BarChart } from './components';
import { SalesReport } from './SalesReport';
import { generateUI, type UISpec } from './genui';

/**
 * DEMO 3 — function calling, one tool per component.
 *
 * Since every call already arrives as { name, args }, we can go back to a
 * registry — and render a LIST, because the model may call several tools.
 */
const REGISTRY = { Alert, UserCard, BarChart, SalesReport };

function RenderUI({ specs }: { specs: UISpec[] }) {
  return (
    <div className="stack">
      {specs.map((spec, i) => {
        const Component = REGISTRY[spec.component] as React.FC<typeof spec.props>;
        return Component ? (
          <div key={i}>
            <Component {...spec.props} />
            <p>{JSON.stringify(spec.props)}</p>
          </div>
        ) : null;
      })}
    </div>
  );
}

export default function ToolsDemo() {
  return (
    <DemoRunner
      blurb="One tool per component. Each one self-describes, the model can call several at once, and { name, description, parameters } is already the shape of an MCP tool."
      file="src/demos/03-tools/genui.ts"
      examples={[
        'introduce Ada Lovelace and chart her three main contributions by impact',
        'the disk is almost full',
        'how much did we sell in 2024?',
        'compare 2023 and 2024 sales for shoes',
        'compare the npm downloads of React, Angular and Vue',
      ]}
      run={async (prompt, apiKey) => {
        const specs = await generateUI(prompt, apiKey);
        return { raw: specs, node: <RenderUI specs={specs} /> };
      }}
    />
  );
}
