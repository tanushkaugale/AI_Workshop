import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pg from "pg";
import { z } from "zod";

// 1. Connect to PostgreSQL
const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "sanjivani_db",
});

// 2. Create the MCP server
const server = new McpServer({
  name: "sanjivani-sugar-factory-server",
  version: "1.0.0",
});

// 3. Register exactly ONE MCP tool
server.tool(
  "get_sanjivani_farmers",
  "Retrieve farmer records from Sanjivani Sugar Factory, including names, villages, sugarcane supply in tons, amounts paid, and pending payments. Optionally filter by village.",
  {
    village: z
      .string()
      .optional()
      .describe("Optional village name, such as Kopargaon or Shirdi"),
  },
  async ({ village }) => {
    try {
      let query = `
        SELECT
          id,
          name,
          village,
          sugarcane_supply_tons,
          amount_paid,
          payment_pending,
          factory_name
        FROM farmers
      `;

      const params: string[] = [];

      if (village) {
        query += " WHERE LOWER(village) = LOWER($1)";
        params.push(village);
      }

      query += " ORDER BY id ASC";

      const result = await pool.query(query, params);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.rows, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("PostgreSQL query failed:", error);

      return {
        content: [
          {
            type: "text" as const,
            text: "Unable to retrieve farmer records from PostgreSQL.",
          },
        ],
        isError: true,
      };
    }
  }
);

// 4. Start the MCP server using stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exitCode = 1;
});