import { useState, type ReactNode } from 'react';
import { useApiKeyValue } from './ApiKeyContext';

export type DemoResult = { raw: unknown; node: ReactNode };

type Props = {
  /** One line explaining what makes this variant different. */
  blurb: string;
  /** The file to open on the projector while showing this demo. */
  file: string;
  examples: string[];
  run: (prompt: string, apiKey: string) => Promise<DemoResult>;
};

/**
 * The chrome around every demo: prompt box, example chips, and the
 * "rendered component | raw model output" split. The three demos differ
 * only in their `run()`.
 */
export function DemoRunner({ blurb, file, examples, run }: Props) {
  const apiKey = useApiKeyValue();
  const [prompt, setPrompt] = useState(examples[0]);
  const [output, setOutput] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(text: string) {
    setPrompt(text);
    setLoading(true);
    setError(null);
    try {
      setOutput(await run(text, apiKey));
    } catch (e) {
      setOutput(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="muted blurb">
        {blurb} <code>{file}</code>
      </p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(prompt);
        }}
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask for something…"
        />
        <button type="submit" disabled={loading || !prompt.trim()}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </form>

      <div className="examples">
        {examples.map((ex) => (
          <button key={ex} className="chip" onClick={() => submit(ex)} disabled={loading}>
            {ex}
          </button>
        ))}
      </div>

      {error && <pre className="error">{error}</pre>}

      {output && (
        <section className="output">
          <div>
            <h2>Rendered</h2>
            {output.node}
          </div>
          <div>
            <h2>What the model returned</h2>
            <pre>{JSON.stringify(output.raw, null, 2)}</pre>
          </div>
        </section>
      )}
    </>
  );
}
