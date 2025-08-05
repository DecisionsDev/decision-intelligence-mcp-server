#!/usr/bin/env node

import {createConfiguration} from "./command-line.js";
import {createMcpServer} from "./mcp-server.js";
import {debug} from "./debug.js";
// Ensure Zod is included in the bundle
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { z } from 'zod';

const configuration = createConfiguration();
const serverName = "mcp-server";
createMcpServer(serverName, configuration).then(() => {
     debug(`MCP server '${serverName}' is up & running...`);
 });
