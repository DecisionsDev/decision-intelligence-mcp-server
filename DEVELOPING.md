# Developing the MCP server

You can develop your own MCP server by using the source files that are available here.

### Getting source files

Run the following command to get the source files of the MCP server:

```bash
git clone https://github.com/DecisionsDev/di-mcp-server.git
cd di-mcp-server
```

### Building the MCP server

Run the following commands to build the MCP server from the source files:

```bash
npm install
npm run build
```

### Testing the MCP server

Run the following command to test the MCP server:

```bash
npm test
```

### Code coverage

The project is configured with Jest's built-in code coverage capabilities. To generate a code coverage report, run the following command:

```bash
npm run test:coverage
```

This will:
1. Run all tests in the project
2. Generate a coverage report showing which parts of the code are covered by tests
3. Create detailed reports in the `coverage` directory

The coverage report includes:
- Statement coverage: percentage of code statements executed
- Branch coverage: percentage of control structures (if/else, switch) executed
- Function coverage: percentage of functions called
- Line coverage: percentage of executable lines executed

Coverage thresholds are set to 70% for statements, branches, functions, and lines. If the coverage falls below these thresholds, the test command fails.

To view the detailed HTML coverage report, open `coverage/lcov-report/index.html` in your browser after running the coverage command.
### Running the MCP server in development mode with `nodemon`

Run the MCP server with `nodemon` and the `DEBUG` environment variable:
- The server is restarted whenever changes are detected on the source code.
- Debug output is enabled.

#### Using command line options
```bash
npm run dev -- --apikey <APIKEY> --url <URL>
```
#### Using environment variables
```bash
APIKEY=<APIKEY> URL=<URL> npm run dev
```
