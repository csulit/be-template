import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";

export function registerQueryTool(server: McpServer, pool: Pool): void {
  server.tool(
    "query",
    "Execute a read-only SQL SELECT query against the database. Returns up to 1000 rows.",
    {
      sql: z.string().describe("SQL SELECT query to execute"),
      params: z.array(z.unknown()).optional().describe("Parameterized query values ($1, $2, ...)"),
    },
    async ({ sql, params }) => {
      try {
        const trimmed = sql.trim();

        if (!/^SELECT\b/i.test(trimmed)) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Only SELECT queries are allowed. Use the insert_record, update_record, or delete_record tools for write operations.",
              },
            ],
            isError: true,
          };
        }

        let query = trimmed;
        if (!/\bLIMIT\b/i.test(query)) {
          query = query.replace(/;?\s*$/, " LIMIT 1000");
        }

        const result = await pool.query(query, params ?? []);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ rowCount: result.rowCount, rows: result.rows }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Query error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
