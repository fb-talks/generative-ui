import { useState, useEffect, useRef, useMemo } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AppRenderer } from "@mcp-ui/client";
import { createMcpClient } from "../mcp-client";

// EXPERIMENT harness: exercises the sandbox proxy with sequential tool calls
// WITHOUT Gemini (open the app with ?proxytest). Same rendering setup as
// GeminiTest — cross-origin proxy, key={callId} so every call remounts the
// AppRenderer with a fresh sandbox iframe — but tools are called directly.

const DEFAULT_WIDGET_SIZE = { width: 560, height: 400 };

const TOOL_CALLS: { label: string; name: string; input: any }[] = [
  { label: "Hello", name: "hello_world", input: { name: "Fabio" } },
  { label: "Weather", name: "weather_dashboard223", input: { location: "Rome" } },
  { label: "Color", name: "color_picker", input: { initialColor: "#3366ff" } },
  { label: "Buildings", name: "buildings_list", input: { city: "Roma" } },
];

export function ProxyTest() {
  const [client, setClient] = useState<Client | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [toolData, setToolData] = useState<{
    callId: number;
    name: string;
    input: any;
    result?: any;
  } | null>(null);
  const [widgetSize, setWidgetSize] = useState(DEFAULT_WIDGET_SIZE);
  const [log, setLog] = useState<string[]>([]);
  const callIdRef = useRef(0);

  const addLog = (line: string) => {
    console.log("[ProxyTest]", line);
    setLog((l) => [...l, line]);
  };

  useEffect(() => {
    setWidgetSize(DEFAULT_WIDGET_SIZE);
  }, [toolData?.name]);

  useEffect(() => {
    let currentClient: Client | null = null;
    createMcpClient("http://localhost:3010/mcp")
      .then((c) => {
        currentClient = c;
        setClient(c);
      })
      .catch((err) => {
        console.error("Failed to connect to MCP server:", err);
        setConnectionError(String(err));
      });
    const closeClient = () => {
      currentClient?.close().catch(() => {});
      currentClient = null;
    };
    window.addEventListener("pagehide", closeClient);
    return () => {
      window.removeEventListener("pagehide", closeClient);
      closeClient();
    };
  }, []);

  const runTool = async (name: string, input: any) => {
    if (!client) return;
    const callId = ++callIdRef.current;
    addLog(`call #${callId}: ${name} input sent`);
    setToolData({ callId, name, input });
    try {
      const result = await client.callTool({ name, arguments: input });
      addLog(`call #${callId}: ${name} result received`);
      setToolData({ callId, name, input, result });
    } catch (err) {
      addLog(`call #${callId}: ${name} FAILED: ${err}`);
    }
  };

  const sandbox = useMemo(
    () => ({ url: new URL("http://localhost:3010/sandbox_proxy.html") }),
    [],
  );

  return (
    <div style={{ padding: 20, textAlign: "left", color: "#000" }}>
      <h3 style={{ marginTop: 0 }}>Sandbox proxy test (no Gemini)</h3>
      <div id="status">
        {connectionError
          ? `MCP error: ${connectionError}`
          : client
            ? "MCP connected"
            : "Connecting…"}
      </div>
      <div style={{ margin: "12px 0", display: "flex", gap: 8 }}>
        {TOOL_CALLS.map((t) => (
          <button
            key={t.name}
            id={`btn-${t.name}`}
            disabled={!client}
            onClick={() => runTool(t.name, t.input)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {toolData && client && (
        <div
          style={{
            position: "relative",
            width: widgetSize.width,
            maxWidth: "100%",
            height: widgetSize.height,
            border: "2px solid #007bff",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <AppRenderer
            key={toolData.callId}
            client={client}
            toolName={toolData.name}
            toolInput={toolData.input}
            toolResult={toolData.result}
            sandbox={sandbox}
            onMessage={async (params) => {
              addLog(`widget message: ${JSON.stringify(params).slice(0, 120)}`);
              return { isError: false };
            }}
            onFallbackRequest={async (request: any) => {
              if (request.method === "x/host/set-background-color") {
                const color = String(request.params?.color ?? "");
                addLog(`widget set-background-color: ${color}`);
                document.body.style.backgroundColor = color;
                return { applied: true, color };
              }
              throw new Error(`Unknown method: ${request.method}`);
            }}
            onSizeChanged={(dimensions) => {
              addLog(
                `size-changed: ${dimensions.width ?? "-"}x${dimensions.height ?? "-"}`,
              );
              setWidgetSize((prev) => ({
                width: dimensions.width ?? prev.width,
                height: dimensions.height ?? prev.height,
              }));
            }}
            onError={(err) => addLog(`AppRenderer error: ${err.message}`)}
          />
        </div>
      )}
      <pre id="proxy-test-log" style={{ fontSize: 12, background: "#f5f5f5", padding: 8 }}>
        {log.join("\n")}
      </pre>
    </div>
  );
}
