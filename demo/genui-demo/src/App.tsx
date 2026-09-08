import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useApiKey } from './useApiKey';
import { ApiKeyContext } from './shared/ApiKeyContext';

const TABS = [
  { to: '/flat', label: '1 · Flat schema' },
  { to: '/union', label: '2 · anyOf union' },
  { to: '/tools', label: '3 · Function calling' },
];

/** The shell: API key gate, tab bar, and the active demo in the <Outlet />. */
export default function App() {
  const { apiKey, setApiKey } = useApiKey();
  const [keyDraft, setKeyDraft] = useState('');

  if (!apiKey) {
    return (
      <main className="app app--gate">
        <h1>Generative UI demo</h1>
        <p className="muted">
          Paste your Gemini API key. It is stored in this browser only (<code>localStorage</code>),
          never in the code.
        </p>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            setApiKey(keyDraft);
          }}
        >
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="AIza..."
            autoFocus
          />
          <button type="submit">Save</button>
        </form>
        <p className="muted small">
          Get one at <a href="https://aistudio.google.com/apikey">aistudio.google.com/apikey</a>
        </p>
      </main>
    );
  }

  return (
    <ApiKeyContext.Provider value={apiKey}>
      <main className="app">
        <header>
          <h1>Generative UI demo</h1>
          <button className="link" onClick={() => setApiKey('')}>
            change API key
          </button>
        </header>

        <nav className="tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `tab ${isActive ? 'tab--active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </main>
    </ApiKeyContext.Provider>
  );
}
