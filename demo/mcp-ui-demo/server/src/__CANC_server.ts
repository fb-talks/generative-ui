import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createUIResource } from "@mcp-ui/server";
import { randomUUID } from "crypto";
import {
  registerAppTool,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import z from "zod";

const app = express();
const port = 3000;

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id", "mcp-protocol-version"],
    allowedHeaders: ["Content-Type", "mcp-session-id", "mcp-protocol-version"],
  }),
);
app.use(express.json());

// Map to store transports by session ID
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
      name: "typescript-server-walkthrough",
      version: "1.0.0",
    });

    /**
     *
     */

    const widgetUI = createUIResource({
      uri: "ui://my-server/widget",
      encoding: "text",
      content: {
        type: "rawHtml",
        htmlString: `
      <html>
        <body>
          <div id="app">Loading...</div>
          <script>
            // Listen for render data from the adapter
            window.addEventListener('message', (event) => {
              if (event.data.type === 'ui-lifecycle-iframe-render-data') {
                const { toolInput, toolOutput } = event.data.payload.renderData;
                document.getElementById('app').textContent = 
                  JSON.stringify({ toolInput, toolOutput }, null, 2);
              }
            });
            
            // Signal that the widget is ready
            window.parent.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
          </script>
        </body>
      </html>
    `,
      },
      adapters: {
        mcpApps: {
          enabled: true,
        },
      },
    });

    // Register the resource so the host can fetch it
    registerAppResource(
      server,
      "widget_ui", // Resource name
      widgetUI.resource.uri, // Resource URI
      {
        _meta: {
          ui: {
            resourceUri: widgetUI.resource.uri,
          },
        },
      }, // Resource metadata
      async () => ({
        contents: [widgetUI.resource],
      }),
    );

    // Register the tool with _meta linking to the UI resource
    registerAppTool(
      server,
      "my_widget",
      {
        description: "An interactive widget",
        inputSchema: {
          query: z.string().describe("User query"),
        },
        // This tells MCP Apps hosts where to find the UI
        _meta: {
          ui: {
            resourceUri: widgetUI.resource.uri,
          },
        },
      },
      async ({ query }) => {
        return {
          content: [{ type: "text", text: `Processing: ${query}` }],
        };
      },
    );

    /** FINE*/

    // Register our MCP-UI tool on the new server instance.
    server.registerTool(
      "greet",
      {
        title: "Greet",
        description: "A simple tool that returns a UI resource.",
        inputSchema: {},
        _meta: {
          ui: {
            resourceUri: "ui://greeting",
          },
        },
      } as any,
      async () => {
        // Create the UI resource to be returned to the client (this is the only part specific to MCP-UI)
        const uiResource = createUIResource({
          uri: "ui://greeting",
          content: { type: "externalUrl", iframeUrl: "https://example.com" },
          encoding: "text",
        });

        return {
          content: [uiResource],
        };
      },
    );
    server.registerTool(
      "list",
      {
        title: "List2",
        description: "A simple tool that returns a UI resource.",
        inputSchema: {},
        _meta: {
          ui: {
            resourceUri: "ui://list2",
          },
        },
      } as any,
      async () => {
        // Create the UI resource to be returned to the client (this is the only part specific to MCP-UI)
        const uiResource = createUIResource({
          uri: "ui://list2",
          content: { type: "externalUrl", iframeUrl: "https://example.com" },
          encoding: "text",
        });

        return {
          content: [uiResource],
        };
      },
    );

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
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
});
