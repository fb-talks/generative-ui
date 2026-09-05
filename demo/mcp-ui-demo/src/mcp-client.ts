import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { UI_EXTENSION_CAPABILITIES } from "@mcp-ui/client";

export async function createMcpClient(serverUrl: string): Promise<Client> {
  // Create the client with UI extension capabilities.
  // @mcp-ui/client 7.1.1 types the extension map as Record<string, unknown>,
  // the SDK 1.30 wants Record<string, object>: stesso valore a runtime
  // ({ "io.modelcontextprotocol/ui": { mimeTypes: [...] } }), index signature
  // piu' stretta. Il cast sta solo su quel campo.
  const capabilities: ClientCapabilities = {
    roots: { listChanged: true },
    extensions: UI_EXTENSION_CAPABILITIES as ClientCapabilities["extensions"],
  };

  const client = new Client(
    { name: "my-mcp-client", version: "1.0.0" },
    { capabilities },
  );

  // Connect to the MCP server
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  await client.connect(transport);

  console.log("Connected to MCP server");
  return client;
}
