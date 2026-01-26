import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";
import { validateSchemaName } from "../lib/validation.js";

export function registerListTablesTool(server: McpServer, pool: Pool): void {
  server.tool(
    "list_tables",
    "List all tables in a database schema",
    {
      schema: z.string().default("public").describe("Schema name (default: public)"),
    },
    async ({ schema }) => {
      try {
        validateSchemaName(schema);

        const result = await pool.query(
          `SELECT table_name, table_type
           FROM information_schema.tables
           WHERE table_schema = $1
           ORDER BY table_name`,
          [schema]
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
