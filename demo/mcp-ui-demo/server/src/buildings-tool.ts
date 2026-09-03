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

const BUILDINGS_URL =
  "https://json-server-vercel-for-tutorials2.vercel.app/buildings";

interface Building {
  id: number;
  address: string;
  city: string;
  location: { lat: number; lng: number };
  mq: number;
  type: "apartment" | "house" | "commercial";
  price: number;
  rooms: number;
  bathrooms: number;
  balcony: boolean;
  garden: boolean;
  condition: "new" | "used";
}

export function registerBuildingsTool(server: McpServer) {
  // Load HTML from external file
  const htmlPath = path.join(__dirname, "buildings-widget.html");
  const htmlString = fs.readFileSync(htmlPath, "utf8");

  const buildingsUI = createUIResource({
    uri: "ui://buildings-server/list-template",
    encoding: "text",
    content: {
      type: "rawHtml",
      htmlString,
    },
  });

  // Register the UI resource so the host can fetch it
  registerAppResource(
    server,
    "buildings_list_ui",
    buildingsUI.resource.uri,
    {
      _meta: {
        ui: {
          resourceUri: buildingsUI.resource.uri,
        },
      },
    },
    async () => ({
      contents: [buildingsUI.resource],
    }),
  );

  // Register the tool with _meta linking to the UI resource
  registerAppTool(
    server,
    "buildings_list",
    {
      description:
        "List real estate properties for sale (immobili), optionally filtered by city, property type, maximum price or minimum number of rooms.",
      inputSchema: {
        city: z
          .string()
          .optional()
          .describe("Filter by city, e.g. 'Roma' or 'Milano'"),
        type: z
          .enum(["apartment", "house", "commercial"])
          .optional()
          .describe("Property type"),
        maxPrice: z.number().optional().describe("Maximum price in euros"),
        minRooms: z.number().optional().describe("Minimum number of rooms"),
      },
      _meta: {
        ui: {
          resourceUri: buildingsUI.resource.uri,
        },
      },
    },
    async ({ city, type, maxPrice, minRooms }) => {
      let all: Building[];
      try {
        const res = await fetch(BUILDINGS_URL);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        all = (await res.json()) as Building[];
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `Could not fetch the properties: ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          ],
        };
      }

      const buildings = all.filter((b) => {
        if (city && b.city.toLowerCase() !== city.toLowerCase()) return false;
        if (type && b.type !== type) return false;
        if (maxPrice !== undefined && b.price > maxPrice) return false;
        if (minRooms !== undefined && b.rooms < minRooms) return false;
        return true;
      });

      const summary = buildings.length
        ? buildings
            .map(
              (b) =>
                `- ${b.address} (${b.city}): ${b.type}, ${b.mq} m², ${b.rooms} rooms, ${b.bathrooms} bathrooms, ${b.condition}, ${b.price} EUR`,
            )
            .join("\n")
        : "No property matches the given filters.";

      return {
        content: [
          {
            type: "text" as const,
            text: `${buildings.length} of ${all.length} properties match.\n${summary}`,
          },
        ],
        // The widget reads the list from here (see buildings-widget.html)
        structuredContent: {
          buildings,
          total: all.length,
          filters: { city, type, maxPrice, minRooms },
        },
      };
    },
  );
}
