#!/usr/bin/env node

import {createConfiguration} from "./command-line.js";
import {createMcpServer} from "./mcp-server.js";
import {debug} from "./debug.js";
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const require = createRequire(import.meta.url);
const packageJson = require(path.join(dirname, '../package.json'));

const configuration = createConfiguration(packageJson.version);
const serverName = "mcp-server";
createMcpServer(serverName, configuration).then(() => {
     debug(`MCP server '${serverName}' is up & running...`);
 });
