import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Pool } from "pg";

export function registerListSchemasTool(server: McpServer, pool: Pool): void {
  server.tool("list_schemas", "List all database schemas (excluding system schemas)", async () => {
    try {
      const result = await pool.query(
        `SELECT schema_name
           FROM information_schema.schemata
           WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
           ORDER BY schema_name`
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
  });
}
