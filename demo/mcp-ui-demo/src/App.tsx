import { GeminiTest } from "./components/GeminiTest";
import { ProxyTest } from "./components/ProxyTest";
import "./App.css";

function App() {
  // EXPERIMENT: ?proxytest exercises the sandbox proxy without Gemini
  const proxyTest = new URLSearchParams(window.location.search).has(
    "proxytest",
  );
  return proxyTest ? <ProxyTest /> : <GeminiTest />;
}

export default App;
