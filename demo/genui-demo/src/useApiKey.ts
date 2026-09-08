import { useState } from 'react';

const STORAGE_KEY = 'gemini-api-key';

/**
 * Keeps the API key out of the repo: the user pastes it once and the browser
 * remembers it. Good enough for a demo — never do this with a production key.
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  );

  function setApiKey(value: string) {
    const key = value.trim();
    setApiKeyState(key);
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  }

  return { apiKey, setApiKey, clearApiKey: () => setApiKey('') };
}
