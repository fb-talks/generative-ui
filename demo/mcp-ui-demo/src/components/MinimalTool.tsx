import { useEffect, useState } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { AppRenderer } from "@mcp-ui/client";
import { createMcpClient } from "../mcp-client";

// Slide example: ONE object describes the tool call, AppRenderer does the rest.
const TOOL = { name: "hello_world", input: { name: "Fabio" } };

const SANDBOX = { url: new URL("http://localhost:3010/sandbox_proxy.html") };

export function MinimalTool() {
  const [client, setClient] = useState<Client | null>(null);
  const [result, setResult] = useState<any>();

  useEffect(() => {
    let mcp: Client | null = null;
    createMcpClient("http://localhost:3010/mcp").then(async (c) => {
      mcp = c;
      setClient(c);
      setResult(await c.callTool({ name: TOOL.name, arguments: TOOL.input }));
    });
    return () => {
      mcp?.close().catch(() => {});
    };
  }, []);

  if (!client) return <p>Connecting to MCP server…</p>;

  return (
    <div style={{ width: 560, height: 400, margin: 40 }}>
      <AppRenderer
        client={client}
        toolName={TOOL.name}
        toolInput={TOOL.input}
        toolResult={result}
        sandbox={SANDBOX}
      />
    </div>
  );
}
