import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";
import { validateTableName, validateColumnName } from "../lib/validation.js";

export function registerInsertRecordTool(server: McpServer, pool: Pool): void {
  server.tool(
    "insert_record",
    "Insert a new record into a table. Returns the inserted row.",
    {
      table: z.string().describe("Table name"),
      data: z.record(z.string(), z.unknown()).describe("Column-value pairs to insert"),
    },
    async ({ table, data }) => {
      try {
        const quotedTable = validateTableName(table);
        const columns = Object.keys(data);

        if (columns.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: No data provided for insert.",
              },
            ],
            isError: true,
          };
        }

        const quotedColumns = columns.map((col) => validateColumnName(col));
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const values = Object.values(data);

        const sql = `INSERT INTO ${quotedTable} (${quotedColumns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
        const result = await pool.query(sql, values);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ inserted: result.rows[0] }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Insert error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
