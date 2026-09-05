import { useEffect, useState, type ComponentType } from "react";
import { GeminiTest } from "./components/GeminiTest";
import { ProxyTest } from "./components/ProxyTest";
import { MinimalTool } from "./components/MinimalTool";
import styles from "./App.module.css";
import "./App.css";

// Simplest possible router: the hash picks the page, hashchange re-renders.
const ROUTES: Record<string, { label: string; Page: ComponentType }> = {
  "#/minimal": { label: "Minimal Tool", Page: MinimalTool },
  "#/proxy": { label: "Proxy Test", Page: ProxyTest },
  "#/": { label: "Gemini Demo", Page: GeminiTest },
};

function App() {
  const [hash, setHash] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const { Page } = ROUTES[hash] ?? ROUTES["#/"];

  return (
    <>
      <nav className={styles.nav}>
        {Object.entries(ROUTES).map(([path, route]) => (
          <a key={path} href={path} className={hash === path ? styles.active : undefined}>
            {route.label}
          </a>
        ))}
      </nav>
      <Page />
    </>
  );
}

export default App;
