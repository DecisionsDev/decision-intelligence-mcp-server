import {Command} from 'commander';
import {DecisionRuntime, parseDecisionRuntime} from "./decision-runtime.js";
import {debug, setDebug} from "./debug.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {Credentials} from "./credentials.js";

export class Configuration {
    static readonly STDIO = "STDIO";
    static readonly HTTP = "HTTP";

    static readonly TRANSPORTS: string[] = [ Configuration.STDIO, Configuration.HTTP];

    constructor(
        public credentials: Credentials,
        public runtime: DecisionRuntime,
        public transport: StdioServerTransport | undefined,
        public url: string,
        public version: string,
        public debugEnabled: boolean,
        public deploymentSpaces: string[] = Configuration.defaultDeploymentSpaces(),
        public decisionServiceIds: string[] | undefined = undefined
    ) {
        this.runtime = runtime || Configuration.defaultRuntime();
    }

    static defaultRuntime(): DecisionRuntime {
        return DecisionRuntime.DI;
    }

    static defaultTransport(): string {
        return Configuration.STDIO;
    }

    static defaultDeploymentSpaces(): string[] {
        return ['development'];
    }

    isDiRuntime(): boolean {
        return this.runtime === DecisionRuntime.DI;
    }

    isAdsRuntime(): boolean {
        return this.runtime === DecisionRuntime.ADS;
    }

    isStdioTransport(): boolean {
        return this.transport !== undefined;
    }

    isHttpTransport(): boolean {
        return this.transport === undefined;
    }
}

// Configuration validation functions
function validateUrl(url: string) : string {
    debug("URL=" + url);
    if (url === undefined) {
        throw new Error('The decision runtime REST API URL is not defined');
    }
    try {
        new URL(url);
        return url;
    } catch {
        throw new Error(`Invalid URL format: '${url}'`);
    }
}

function validateTransport(transport: string) :StdioServerTransport | undefined {
    debug("TRANSPORT=" + transport);
    if (transport === undefined) {
        debug(`The transport protocol is not defined. Using '${Configuration.defaultTransport()}'`);
    } else {
        if (!Configuration.TRANSPORTS.includes(transport)) {
            throw new Error(`Invalid transport protocol: '${transport}'. Must be one of: '${Configuration.TRANSPORTS.join('\', \'')}'`);
        }
    }
    return (transport === undefined || Configuration.STDIO === transport) ?  new StdioServerTransport() : undefined;
}

function validateDecisionRuntime(runtime: string): DecisionRuntime {
    debug("RUNTIME=" + runtime);
    if (runtime === undefined) {
        debug(`The decision runtime is not defined. Using '${Configuration.defaultRuntime()}'`);
        return runtime;
    }
    const decisionRuntime = parseDecisionRuntime(runtime);
    if (decisionRuntime === undefined) {
        throw new Error(`Invalid target decision runtime: '${decisionRuntime}'. Must be one of: '${Object.values(DecisionRuntime).join('\', \'')}'}`);
    }
    return decisionRuntime;
}

function validateDeploymentSpaces(parseDeploymentSpaceOption: string | undefined): string[] {
    debug("DEPLOYMENT SPACES=" + parseDeploymentSpaceOption);
    const deploymentSpaces = parseDeploymentSpaces(parseDeploymentSpaceOption);
    const invalidDeploymentSpaces: string[] = [];
    const encodedDeploymentSpaces: string[] = [];

    for (const deploymentSpace of deploymentSpaces) {
        try {
            encodedDeploymentSpaces.push(encodeURIComponent(deploymentSpace));
        } catch {
            invalidDeploymentSpaces.push(deploymentSpace);
        }
    }

    const nbOfInvalidDeploymentSpaces = invalidDeploymentSpaces.length;
    if (nbOfInvalidDeploymentSpaces > 0) {
        if (nbOfInvalidDeploymentSpaces === 1) {
            throw new Error(`Invalid deployment space '${invalidDeploymentSpaces[0]}' cannot be URI encoded.`);
        }
        throw new Error(`Invalid deployment spaces '${invalidDeploymentSpaces.join("', '")}' cannot be URI encoded.`);
    }
    return encodedDeploymentSpaces;
}

function parseDeploymentSpaces(deploymentSpaces: string | undefined): string[] {
    if (deploymentSpaces !== undefined) {
        const parsedDeploymentSpaces = deploymentSpaces
            .split(',')
            .map(ds => ds.trim())
            .filter(ds => ds.length > 0);
        if (parsedDeploymentSpaces.length > 0) {
            return parsedDeploymentSpaces;
        }
    }
    return Configuration.defaultDeploymentSpaces();
}

function splitCommaIgnoringEscaped(input: string): string[] {
    const result: string[] = [];
    let current = '';
    let i = 0;
    
    while (i < input.length) {
        if (input[i] === '\\' && i + 1 < input.length && input[i + 1] === ',') {
            current += ',';
            i += 2;
        } else if (input[i] === ',') {
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += input[i];
            i++;
        }
    }
    
    if (current.length > 0) {
        result.push(current.trim());
    }
    
    return result.filter(item => item.length > 0);
}

function parseDecisionServiceIds(decisionServiceIds: string | undefined): string[] | undefined {
    if (decisionServiceIds !== undefined) {
        const ret = splitCommaIgnoringEscaped(decisionServiceIds);
        if (ret.length > 0) {
            return ret;
        }
    }
    return undefined;
}

export function createConfiguration(version: string, cliArguments?: readonly string[]): Configuration {
    const program = new Command();
    program
        .name("di-mcp-server")
        .description("MCP Server for IBM Decision Intelligence")
        .version(version)
        .option('--debug', 'Enable debug output')
        .option('--url <string>', "Base URL for the decision runtime API, required. Or set the 'URL' environment variable")
        .option('--apikey <string>', "API key for the decision runtime, required if not using basic authentication. Or set the 'URL' environment variable")
        .option('--username <string>', "Username for the decision runtime. Or set the 'USERNAME' environment variable")
        .option('--password <string>', "Password for the decision runtime. Or set 'PASSWORD' environment variable)")
        .option('--transport <transport>', "Transport mode: 'STDIO' or 'HTTP'")
        .option("--runtime <runtime>", "Target decision runtime: 'DI' or 'ADS'. Default value is 'DI'")
        .option('--deployment-spaces <list>', "Comma-separated list of deployment spaces to scan (default: 'development')")
        .option('--decision-service-ids <list>', 'If defined, comma-separated list of decision service ids to be exposed as tools');

    program.parse(cliArguments);

    const options = program.opts();
    const debugFlag = Boolean(options.debug || process.env.DEBUG === "true");
    setDebug(debugFlag);

    // Validate all options;
    const credentials = Credentials.validateCredentials(options);
    const runtime = validateDecisionRuntime(options["runtime"] || process.env.RUNTIME);
    const transport = validateTransport(options.transport || process.env.TRANSPORT);
    const url = validateUrl(options.url || process.env.URL);
    const deploymentSpaces = validateDeploymentSpaces(options.deploymentSpaces || process.env.DEPLOYMENT_SPACES);
    const decisionServiceIds = parseDecisionServiceIds(options.decisionServiceIds || process.env.DECISION_SERVICE_IDS);
 
    // Create and return configuration object
    return new Configuration(credentials, runtime, transport, url, version, debugFlag, deploymentSpaces, decisionServiceIds);
}