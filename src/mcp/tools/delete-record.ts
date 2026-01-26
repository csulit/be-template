import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";
import { validateTableName, validateColumnName } from "../lib/validation.js";

export function registerDeleteRecordTool(server: McpServer, pool: Pool): void {
  server.tool(
    "delete_record",
    "Delete records from a table matching WHERE conditions. Returns deleted rows and count.",
    {
      table: z.string().describe("Table name"),
      where: z
        .record(z.string(), z.unknown())
        .describe(
          "WHERE conditions as column-value pairs (equality, AND-joined). At least one condition required."
        ),
    },
    async ({ table, where }) => {
      try {
        const quotedTable = validateTableName(table);
        const whereCols = Object.keys(where);

        if (whereCols.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: At least one WHERE condition is required for delete.",
              },
            ],
            isError: true,
          };
        }

        const whereClauses = whereCols.map((col, i) => {
          const quoted = validateColumnName(col);
          return `${quoted} = $${i + 1}`;
        });

        const values = Object.values(where);
        const sql = `DELETE FROM ${quotedTable} WHERE ${whereClauses.join(" AND ")} RETURNING *`;
        const result = await pool.query(sql, values);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ deletedCount: result.rowCount, rows: result.rows }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Delete error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
