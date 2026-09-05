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
  // Load HTML from external file
  const htmlPath = path.join(__dirname, "weather-widget.html");
  const htmlString = fs.readFileSync(htmlPath, "utf8");

  // Register a tool with a UI interface using the MCP Apps adapter
  const weatherDashboardUI = createUIResource({
    uri: "ui://weather-server/dashboard-template",
    encoding: "text",
    //content: { type: "externalUrl", iframeUrl: "https://www.fabiobiondi.dev" },
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
    {},
    async () => ({
      contents: [weatherDashboardUI.resource],
    }),
  );

  // Register the tool with _meta linking to the UI resource
  registerAppTool(
    server,
    "weather",
    {
      description: "Interactive weather dashboard widget. Only work with Rome",
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
      // In a real app, we might fetch data here
      const temperature = 23;
      const condition = "Sunny";

      return {
        content: [
          {
            type: "text",
            text: `The weather in ${location} is ${temperature}° (${condition})`,
          },
        ],
        // The widget reads city and temperature from here
        // (see weather-widget.html)
        structuredContent: {
          location,
          temperature,
          unit: "°C",
          condition,
        },
      };
    },
  );
}
