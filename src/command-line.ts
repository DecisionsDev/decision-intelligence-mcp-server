// command-line.ts
import {Command} from 'commander';
import {DecisionRuntime, parseDecisionRuntime} from "./decision-runtime.js";
import {debug, setDebug} from "./debug.js";

const version = process.env.npm_package_version || require('./package.json').version;

// Configuration validation functions
function validateUrl(url: string) : string {
    debug("URL=" + url);
    if (url === undefined) {
        throw new Error('The Decision Runtime REST API URL is not defined');
    }
    try {
        new URL(url);
        return url;
    } catch {
        throw new Error(`Invalid URL format: '${url}'`);
    }
}

function validateTransport(transport: string) :string {
    debug("TRANSPORT=" + transport);
    if (transport === undefined) {
        throw new Error('The transport protocol is not defined');
    }
    const validTransports = ['STDIO', 'HTTP'];
    if (!validTransports.includes(transport)) {
        throw new Error(`Invalid transport protocol: '${transport}'. Must be one of: '${validTransports.join('\', \'')}'`);
    }
    return transport;
}

function validateDecisionRuntime(runtime: string): DecisionRuntime {
    debug("DECISION RUNTIME=" + runtime);
    const decisionRuntime = parseDecisionRuntime(runtime);
    if (decisionRuntime === undefined) {
        throw new Error(`Invalid target Decision Runtime: '${decisionRuntime}'. Must be one of: '${Object.values(DecisionRuntime).join('\', \'')}'}`);
    }
    return decisionRuntime;
}

function validateApiKey(apiKey: string): string {
    debug("API KEY=" + apiKey);
    if (apiKey === undefined) {
        throw new Error('The Decision Runtime API key is not defined');
    }
    if (apiKey.trim().length === 0) {
        throw new Error('The Decision Runtime API key cannot be empty');
    }
    if (apiKey.length < 8) {
        throw new Error(`The Decision Runtime API key '${apiKey}' is not valid: it must be at least 8 characters long`);
    }
    return apiKey;
}

export function createConfiguration(cliArguments?: readonly string[]) {
    const program = new Command();
    program
        .name("di-mcp-server")
        .description("MCP Server for IBM Decision Intelligence")
        .version(version)
        .option('--debug', 'Enable debug output')
        .option('--url <string>', "Base URL for the Decision Runtime API")
        .option('--apikey <string>', "API key for the Decision Runtime")
        .option('--transport <transport>', "Transport mode: 'STDIO' or 'HTTP'")
        .option("--decision-runtime <runtime>", "Target Decision Runtime: 'DI' or 'ADS'. Default value is 'DI'");

    program.parse(cliArguments);

    const options = program.opts();
    const debugFlag = Boolean(options.debug || process.env.DEBUG === "true");
    setDebug(debugFlag);

    // Validate all options;
    const apiKey = validateApiKey(options.apikey || process.env.APIKEY);
    const decisionRuntime = validateDecisionRuntime(options["decisionRuntime"] || process.env.DECISION_RUNTIME || DecisionRuntime.DI);
    const transport = validateTransport(options.transport || process.env.TRANSPORT || "STDIO");
    const url = validateUrl(options.url || process.env.URL);

    // Create and return configuration object
    return {
        apiKey: apiKey,
        decisionRuntime: decisionRuntime,
        transport: transport,
        url: url,
        version: version,
        // Helper properties
        isDebugEnabled: debugFlag,
        isDiDecisionRuntime: decisionRuntime == DecisionRuntime.DI,
        isAdsDecisionRuntime: decisionRuntime == DecisionRuntime.ADS,
        isHttpTransport: transport === 'HTTP',
        isStdioTransport: transport === 'STDIO',
    };
}