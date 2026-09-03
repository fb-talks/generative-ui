import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerWeatherTool } from "./weather-tool.js";
import { registerColorTool } from "./color-tool.js";
import { registerBuildingsTool } from "./buildings-tool.js";
import { registerHelloTool } from "./hello-tool.js";
import { randomUUID } from "crypto";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const app = express();
const port = 3010;

// Serve the sandbox proxy from THIS origin (different from the Vite app's).
// Hosting it cross-origin isolates the widget frames from the host page:
// it is the recommended security setup for MCP-UI sandboxes, and it also
// avoids a Chrome WindowProxy-identity bug that breaks postMessage
// event.source checks between same-origin sandboxed iframes.
app.get("/sandbox_proxy.html", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "../public/sandbox_proxy.html"));
});

// app.use(
//   cors({
//     origin: "*",
//     exposedHeaders: ["Mcp-Session-Id"],
//     allowedHeaders: ["*"],
//   }),
// );
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id", "mcp-protocol-version"],
    allowedHeaders: ["Content-Type", "mcp-session-id", "mcp-protocol-version"],
  }),
);
app.use(express.json());

// Self-contained ESM bundle of the MCP Apps `App` class. The widgets import
// it from here (`import { App } from "http://localhost:3010/ext-apps.js"`)
// so the demo works without touching the network: same file that ships in
// node_modules, served with the CORS headers the sandboxed iframe needs.
const extAppsBundle = require.resolve(
  "@modelcontextprotocol/ext-apps/app-with-deps",
);
app.get("/ext-apps.js", (_req, res) => {
  res.sendFile(extAppsBundle);
});

// Map to store transports by session ID, as shown in the documentation.
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication.
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // A session already exists; reuse the existing transport.
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // This is a new initialization request. Create a new transport.
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
        console.log(`MCP Session initialized: ${sid}`);
      },
    });

    // Clean up the transport from our map when the session closes.
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`MCP Session closed: ${transport.sessionId}`);
        delete transports[transport.sessionId];
      }
    };

    // Create a new server instance for this specific session.
    const server = new McpServer({
      name: "mcp-apps-demo",
      version: "1.0.0",
    });

    // Register the tools, each with its MCP Apps UI resource
    registerWeatherTool(server);
    registerColorTool(server);
    registerBuildingsTool(server);
    registerHelloTool(server);

    // Connect the server instance to the transport for this session.
    await server.connect(transport);
  } else {
    return res.status(400).json({
      error: { message: "Bad Request: No valid session ID provided" },
    });
  }

  // Handle the client's request using the session's transport.
  await transport.handleRequest(req, res, req.body);
});

// A separate, reusable handler for GET and DELETE requests.
const handleSessionRequest = async (
  req: express.Request,
  res: express.Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  console.log("sessionId", sessionId);
  if (!sessionId || !transports[sessionId]) {
    return res.status(404).send("Session not found");
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// GET handles the long-lived stream for server-to-client messages.
app.get("/mcp", handleSessionRequest);

// DELETE handles explicit session termination from the client.
app.delete("/mcp", handleSessionRequest);

app.listen(port, () => {
  console.log(`MCP Apps Demo Server running at http://localhost:${port}`);
});
