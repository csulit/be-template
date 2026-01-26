import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";
import { z } from "zod";
import { validateSchemaName, validateTableName } from "../lib/validation.js";

export function registerDescribeTableTool(server: McpServer, pool: Pool): void {
  server.tool(
    "describe_table",
    "Get column details, types, and constraints for a table",
    {
      table: z.string().describe("Table name"),
      schema: z.string().default("public").describe("Schema name (default: public)"),
    },
    async ({ table, schema }) => {
      try {
        validateSchemaName(schema);
        validateTableName(table);

        const columnsResult = await pool.query(
          `SELECT
             column_name, data_type, is_nullable, column_default,
             character_maximum_length, numeric_precision, numeric_scale
           FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [schema, table]
        );

        const constraintsResult = await pool.query(
          `SELECT
             tc.constraint_name, tc.constraint_type,
             kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
           WHERE tc.table_schema = $1 AND tc.table_name = $2
           ORDER BY tc.constraint_type, kcu.column_name`,
          [schema, table]
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  columns: columnsResult.rows,
                  constraints: constraintsResult.rows,
                },
                null,
                2
              ),
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
