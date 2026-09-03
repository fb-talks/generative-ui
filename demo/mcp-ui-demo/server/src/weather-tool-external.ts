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

export function registerWeatherTool(server: McpServer) {
  // Load the HTML content from the external file
  const htmlPath = path.join(__dirname, "weather-widget.html");
  const htmlString = fs.readFileSync(htmlPath, "utf8");

  const weatherDashboardUI = createUIResource({
    uri: "ui://weather-server/dashboard-template",
    encoding: "text",
    content: {
      type: "rawHtml",
      htmlString,
    },
  });

  // Register the UI resource so the host can fetch it
  registerAppResource(
    server,
    "weather_dashboard_ui2",
    weatherDashboardUI.resource.uri,
    {
      _meta: {
        ui: {
          resourceUri: weatherDashboardUI.resource.uri,
        },
      },
    },
    async () => ({
      contents: [weatherDashboardUI.resource],
    }),
  );

  // Register the tool with _meta linking to the UI resource
  registerAppTool(
    server,
    "weather_dashboard223",
    {
      description: "Interactive weather dashboard widget",
      inputSchema: {
        location: z.string().describe("City name"),
      },
      // This tells MCP Apps hosts where to find the UI
      _meta: {
        ui: {
          resourceUri: weatherDashboardUI.resource.uri,
        },
      },
    },
    async ({ location }) => {
      return {
        content: [{ type: "text", text: `There Weather for ${location} is 23°` }],
      };
    },
  );
}
