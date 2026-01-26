import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pool } from "./lib/db.js";
import { registerQueryTool } from "./tools/query.js";
import { registerListTablesTool } from "./tools/list-tables.js";
import { registerDescribeTableTool } from "./tools/describe-table.js";
import { registerListSchemasTool } from "./tools/list-schemas.js";
import { registerInsertRecordTool } from "./tools/insert-record.js";
import { registerUpdateRecordTool } from "./tools/update-record.js";
import { registerDeleteRecordTool } from "./tools/delete-record.js";

const server = new McpServer({
  name: "postgres",
  version: "1.0.0",
});

registerQueryTool(server, pool);
registerListTablesTool(server, pool);
registerDescribeTableTool(server, pool);
registerListSchemasTool(server, pool);
registerInsertRecordTool(server, pool);
registerUpdateRecordTool(server, pool);
registerDeleteRecordTool(server, pool);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PostgreSQL MCP server running on stdio");
}

function shutdown(): void {
  console.error("Shutting down...");
  pool
    .end()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
