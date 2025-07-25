# MCP Server for IBM Decision Intelligence

[![Build and test](https://github.com/DecisionsDev/di-mcp-server/actions/workflows/build.yml/badge.svg)](https://github.com/DecisionsDev/di-mcp-server/actions/workflows/build.yml) [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE) [![npm version](https://badge.fury.io/js/di-mcp-server.svg)](https://www.npmjs.com/package/di-mcp-server)


A Model Context Protocol (MCP) server that empowers AI assistants with access to the decisions from the IBM Decision Intelligence SaaS service.

The MCP server is available as a NPM package in the free NPM registry: https://www.npmjs.com/package/di-mcp-server.

It supports both STDIO and HTTP Streamable transports for local or remote deployments in order to support any MCP clients.

```mermaid
flowchart LR
    github["di-mcp-server github repository"] -- publish --> registry
    registry["NPM registry"] -- npx -y di-mcp-server--> server

    subgraph MCP Host 
        client["MCP Client"] <-- MCP/STDIO --> server("DI MCP Server")
    end

    server -- HTTPS --> runtime("DI Runtime")

    subgraph Decision Intelligence SaaS
        runtime
    end


    client <-- MCP/HTTP --> server2("DI MCP Server") -- HTTPS --> runtime

```

## Getting started


The MCP server can be easily ran with `npx` to expose as MCP tools the operations of the last deployed version of all decision services:

```bash
npx -y mcp-server <APIKEY> <DECISION_RUNTIME_BASEURL> <TRANSPORT>
```

Where:

- APIKEY: the API key to access the Decision Runtime
- DECISION_RUNTIME_BASEURL: is the baseurl of the REST API of the Decision Runtime. Its pattern is: https://<TENANT_NAME>.decision-dev-us-south.decision.saas.ibm.com/ads/runtime/api/v1 where TENANT_NAME is the name of the tenant
- STDIO or HTTP


Example:

```bash
npx -y di-mcp-server azI6ZTViZDAAJDNMAtMDA1OS00NzVkLTg0YTctOGNiNzRkZjJmNzkyOlpnUHNMb0VCb0tBcDBsSnZhdTZXLy96N3ppWEwxM2Z4WHRJcDNlNXZVWlk9 https://ibm.decision-dev-us-south.decision.saas.ibm.com/ads/runtime/api/v1 STDIO
```

## Integration Guides

### IBM Watson Orchestrate

In the agent builder, click 'Add tool'

![](doc/wo1.png)

Click import, then click import from mcp server

![](doc/wo2.png)

Click add MCP server

![](doc/wo4.png)

Specify a name for the server and the `npx` command already explained in the previous getting started section.

![](doc/wo5.png)

Close the dialog box and select the tool that you want to add to your agent

![](doc/wo6.png)

That's it, your agent is now empowered with decisions!

### Claude Desktop

1. Locate Configuration File
   
   Find your Claude configuration directory:
   - **macOS**: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `${HOME}/.config/Claude/claude_desktop_config.json`


2. **Add MCP Server Configuration**

In the configuration directory, edit or create `claude_desktop_config.json`:

```json
{
    [..]
    "mcpServers": {
        "di-mcp-server": {
            "command": "npx",
            "args": [
                "-y",
                "di-mcp-server",
                "<APIKEY>",
                "https://<TENANT_NAME>.decision-dev-us-south.decision.saas.ibm.com/ads/runtime/api/v1",
                "STDIO"
            ]
        }
    }
    [..]
}
```

More information at https://modelcontextprotocol.io/quickstart/user.

## Development

### Get sources

```bash
git clone https://github.com/DecisionsDev/di-mcp-server.git
cd di-mcp-server
```

### Building from Source

```bash
npm install
npm run build
```

### Run tests

```bash
npm test
```

## License
[Apache 2.0](LICENSE)

## Notice

© Copyright IBM Corporation 2025.
