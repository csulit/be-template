import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";
import { validateTableName, validateColumnName } from "../lib/validation.js";

export function registerUpdateRecordTool(server: McpServer, pool: Pool): void {
  server.tool(
    "update_record",
    "Update records in a table matching WHERE conditions. Returns updated rows and count.",
    {
      table: z.string().describe("Table name"),
      data: z.record(z.string(), z.unknown()).describe("Column-value pairs to set"),
      where: z
        .record(z.string(), z.unknown())
        .describe("WHERE conditions as column-value pairs (equality, AND-joined)"),
    },
    async ({ table, data, where }) => {
      try {
        const quotedTable = validateTableName(table);
        const setCols = Object.keys(data);
        const whereCols = Object.keys(where);

        if (setCols.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: No data provided for update.",
              },
            ],
            isError: true,
          };
        }

        if (whereCols.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: At least one WHERE condition is required.",
              },
            ],
            isError: true,
          };
        }

        let paramIndex = 1;
        const setClauses = setCols.map((col) => {
          const quoted = validateColumnName(col);
          return `${quoted} = $${paramIndex++}`;
        });
        const whereClauses = whereCols.map((col) => {
          const quoted = validateColumnName(col);
          return `${quoted} = $${paramIndex++}`;
        });

        const values = [...Object.values(data), ...Object.values(where)];
        const sql = `UPDATE ${quotedTable} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")} RETURNING *`;
        const result = await pool.query(sql, values);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ updatedCount: result.rowCount, rows: result.rows }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Update error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
