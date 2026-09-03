import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createUIResource } from "@mcp-ui/server";
import {
  registerAppTool,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tool minimale: mostra un widget e basta. Serve come esempio del giro
// completo tool -> risorsa UI -> iframe, senza nessuna comunicazione
// di ritorno dal widget verso host o modello.
export function registerHelloTool(server: McpServer) {
  const htmlPath = path.join(__dirname, "hello-widget.html");
  const htmlString = fs.readFileSync(htmlPath, "utf8");

  const helloUI = createUIResource({
    uri: "ui://hello-server/hello-template",
    encoding: "text",
    content: {
      type: "rawHtml",
      htmlString,
    },
  });

  // Register the UI resource so the host can fetch it
  registerAppResource(
    server,
    "hello_world_ui",
    helloUI.resource.uri,
    {
      _meta: {
        ui: {
          resourceUri: helloUI.resource.uri,
        },
      },
    },
    async () => ({
      contents: [helloUI.resource],
    }),
  );

  // Register the tool with _meta linking to the UI resource
  registerAppTool(
    server,
    "hello_world",
    {
      description:
        "Shows a minimal 'Hello world' widget. " +
        "Call this tool whenever the user asks for a hello world, a demo widget, " +
        "or wants to greet someone with the UI ('dimmi ciao', 'hello world', " +
        "'saluta Fabio', 'show the demo widget'). " +
        "Do NOT answer with plain text for these requests: render this widget instead.",
      inputSchema: {
        name: z
          .string()
          .optional()
          .describe(
            "Name to greet, e.g. 'Fabio'. Omit it to show the generic 'Hello, world!'.",
          ),
      },
      _meta: {
        ui: {
          resourceUri: helloUI.resource.uri,
        },
      },
    },
    async ({ name }) => {
      const greeted = name || "world";
      return {
        content: [
          {
            type: "text",
            text: `Hello widget shown (greeting: ${greeted}).`,
          },
        ],
        structuredContent: { name: greeted },
      };
    },
  );
}
