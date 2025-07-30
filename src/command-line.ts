import {Command} from 'commander';
import {DecisionRuntime, parseDecisionRuntime} from "./decision-runtime.js";
import {debug, setDebug} from "./debug.js";

export class Configuration {
    static readonly STDIO = "STDIO";
    static readonly HTTP = "HTTP";

    constructor(
        public apiKey: string,
        public runtime: DecisionRuntime,
        public transport: string,
        public url: string,
        public version: string,
        public debugEnabled: boolean
    ) {
    }

    static defaultRuntime(): DecisionRuntime {
        return DecisionRuntime.DI;
    }

    static defaultTransport(): string {
        return Configuration.STDIO;
    }

    static builder() {
        return new ConfigurationBuilder();
    }

    isDiRuntime(): boolean {
        return this.runtime == DecisionRuntime.DI;
    }

    isAdsRuntime(): boolean {
        return this.runtime == DecisionRuntime.ADS;
    }

    isStdioTransport(): boolean {
        return this.transport === Configuration.STDIO;
    }
    isHttpTransport(): boolean {
        return this.transport === Configuration.HTTP;
    }
}

class ConfigurationBuilder {
    private configuration: Partial<Configuration> = {};

    apiKey(apiKey: string): ConfigurationBuilder {
        this.configuration.apiKey = apiKey;
        return this;
    }

    runtime(runtime: DecisionRuntime): ConfigurationBuilder {
        this.configuration.runtime = this.getRuntime(runtime);
        return this;
    }

    transport(transport: string): ConfigurationBuilder {
        this.configuration.transport = this.getTransport(transport);
        return this;
    }

    url(url: string): ConfigurationBuilder {
        this.configuration.url = url;
        return this;
    }

    version(version: string): ConfigurationBuilder {
        this.configuration.version = version;
        return this;
    }

    debug(enabled: boolean = true): ConfigurationBuilder {
        this.configuration.debugEnabled = enabled;
        return this;
    }

    build(): Configuration {
        const required: (keyof Configuration)[] = [
            'apiKey', 'url', 'version'
        ];

        const missing = required.filter(key => !this.configuration[key]);

        if (missing.length > 0) {
            throw new Error(`Missing required configuration fields: ${missing.join(', ')}`);
        }

        return new Configuration(
            this.configuration.apiKey!,
            this.getRuntime(this.configuration.runtime),
            this.getTransport(this.configuration.transport),
            this.configuration.url!,
            this.configuration.version!,
            this.configuration.debugEnabled ?? false
        );
    }

    private getTransport(transport: string | undefined) {
        return transport || Configuration.defaultTransport();
    }

    private getRuntime(runtime: DecisionRuntime | undefined) {
        return runtime || Configuration.defaultRuntime();
    }
}

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
        debug(`The transport protocol is not defined. Using '${Configuration.defaultTransport()}'`);
    } else {
        const validTransports = ['STDIO', 'HTTP'];
        if (!validTransports.includes(transport)) {
            throw new Error(`Invalid transport protocol: '${transport}'. Must be one of: '${validTransports.join('\', \'')}'`);
        }
    }
    return transport;
}

function validateDecisionRuntime(runtime: string): DecisionRuntime {
    debug("RUNTIME=" + runtime);
    if (runtime === undefined) {
        debug(`The Decision Runtime is not defined. Using '${Configuration.defaultRuntime()}'`);
        return runtime;
    }
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
    return apiKey;
}

export function createConfiguration(cliArguments?: readonly string[]): Configuration {
    const program = new Command();
    const version = String(process.env.npm_package_version);
    program
        .name("di-mcp-server")
        .description("MCP Server for IBM Decision Intelligence")
        .version(version)
        .option('--debug', 'Enable debug output')
        .option('--url <string>', "Base URL for the Decision Runtime API")
        .option('--apikey <string>', "API key for the Decision Runtime")
        .option('--transport <transport>', "Transport mode: 'STDIO' or 'HTTP'")
        .option("--runtime <runtime>", "Target Decision Runtime: 'DI' or 'ADS'. Default value is 'DI'");

    program.parse(cliArguments);

    const options = program.opts();
    const debugFlag = Boolean(options.debug || process.env.DEBUG === "true");
    setDebug(debugFlag);

    // Validate all options;
    const apiKey = validateApiKey(options.apikey || process.env.APIKEY);
    const runtime = validateDecisionRuntime(options["runtime"] || process.env.RUNTIME);
    const transport = validateTransport(options.transport || process.env.TRANSPORT);
    const url = validateUrl(options.url || process.env.URL);

    // Create and return configuration object
    return Configuration.builder()
        .apiKey(apiKey)
        .url(url)
        .runtime(runtime)
        .transport(transport)
        .version(version)
        .debug(debugFlag)
        .build();
}