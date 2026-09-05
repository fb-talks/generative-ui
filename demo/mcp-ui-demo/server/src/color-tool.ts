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

export function registerColorTool(server: McpServer) {
  // Load HTML from external file
  const htmlPath = path.join(__dirname, "color-widget.html");
  const htmlString = fs.readFileSync(htmlPath, "utf8");

  // Create UI resource for the color picker template
  const colorUI = createUIResource({
    uri: "ui://color-server/picker-template",
    encoding: "text",
    content: {
      type: "rawHtml",
      htmlString,
    },
  });

  // Register the UI resource so the host can fetch it
  registerAppResource(
    server,
    "color_picker_ui",
    colorUI.resource.uri,
    {},
    async () => ({
      contents: [colorUI.resource],
    }),
  );

  // Register the tool with _meta linking to the UI resource
  registerAppTool(
    server,
    "color_picker",
    {
      description:
        "Interactive color picker widget that changes the BACKGROUND COLOR of the host web app. " +
        "ALWAYS call this tool whenever the user asks to change, set, choose or pick the background color " +
        "(sfondo / background / colore di sfondo) of the site, the page, the app, the UI or the theme. " +
        "Examples that MUST trigger this tool: 'cambia il colore di sfondo del sito', 'voglio sfondo blu', " +
        "'change the background color', 'make the page green', 'set the site background to #ff0000'. " +
        "Do NOT answer with plain text for these requests: render this widget instead. " +
        "When the user picks a color, the widget sends a command to the host application, which applies it " +
        "to the site background in real time.",
      inputSchema: {
        initialColor: z
          .string()
          .optional()
          .describe(
            "Hex code (e.g. '#3366ff') to preselect in the picker. If the user mentioned a color by name " +
            "or by hex, convert it to hex and pass it here; otherwise omit it.",
          ),
      },
      _meta: {
        ui: {
          resourceUri: colorUI.resource.uri,
        },
      },
    },
    async ({ initialColor }) => {
      const color = initialColor || "#ffffff";
      return {
        content: [
          {
            type: "text",
            text:
              `Color picker shown (preselected: ${color}). ` +
              "The user can pick a color; the widget will tell the host app to update the site background.",
          },
        ],
        structuredContent: { initialColor: color },
      };
    },
  );
}
