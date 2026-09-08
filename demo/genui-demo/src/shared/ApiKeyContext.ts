import { createContext, useContext } from 'react';

/** Provided by <App>, consumed by every demo through <DemoRunner>. */
export const ApiKeyContext = createContext<string>('');

export const useApiKeyValue = () => useContext(ApiKeyContext);
