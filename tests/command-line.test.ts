import {createConfiguration} from '../src/command-line.js';
import {debug, setDebug} from '../src/debug.js';
import {DecisionRuntime, parseDecisionRuntime} from '../src/decision-runtime.js';

// Mock the debug function and setDebug function
jest.mock('../src/debug', () => ({
    debug: jest.fn(),
    setDebug: jest.fn(),
}));
const mockDebug = debug as jest.MockedFunction<typeof debug>;
const mockSetDebug = setDebug as jest.MockedFunction<typeof setDebug>;

// Mock the DecisionRuntime enum and parseDecisionRuntime function
jest.mock('../src/decision-runtime', () => ({
    DecisionRuntime: {
        DI: 'DI',
        ADS: 'ADS'
    },
    parseDecisionRuntime: jest.fn(),
}));
const mockParseDecisionRuntime = parseDecisionRuntime as jest.MockedFunction<typeof parseDecisionRuntime>;

const version = '2.0.0';
describe('CLI Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env;
        process.env = { ...originalEnv };
        process.env.npm_package_version = version;

        // Clear all mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockParseDecisionRuntime.mockImplementation((runtime: string) => {
            if (runtime === 'DI' || runtime === 'ADS') {
                return runtime as DecisionRuntime;
            }
            return undefined;
        });
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    const protocol = 'https:';
    const hostname = 'api.example.com';
    const url = `${protocol}//${hostname}`;

    describe('validateUrl', () => {
        test('should return URL string argument for valid URL', () => {
            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.url).toBe(url);
        });

        test('should throw error when URL is undefined', () => {
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--apikey', 'validkey123',
                    '--transport', 'STDIO'
                ]);
            }).toThrow('The Decision Runtime REST API URL is not defined');
        });

        test('should throw error for invalid URL format', () => {
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', 'invalid-url',
                    '--apikey', 'validkey123',
                    '--transport', 'STDIO'
                ]);
            }).toThrow('Invalid URL format: \'invalid-url\'');
        });

        test('should use URL from environment variable', () => {
            const urlFromEnv = 'https://env-api.example.com';
            process.env.URL = urlFromEnv;

            const config = createConfiguration([
                'node', 'cli.js',
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.url).toBe(urlFromEnv);
        });

        test('should call debug function with URL', () => {
            createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(mockDebug).toHaveBeenCalledWith('URL=https://api.example.com');
        });
    });

    describe('validateTransport', () => {
        test('should accept valid transports', () => {
            const stdioConfig = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            const httpConfig = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'HTTP'
            ]);

            expect(stdioConfig.transport).toBe('STDIO');
            expect(httpConfig.transport).toBe('HTTP');
        });

        test('should throw error for invalid transport', () => {
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', 'validkey123',
                    '--transport', 'INVALID'
                ]);
            }).toThrow('Invalid transport protocol: \'INVALID\'. Must be one of: \'STDIO\', \'HTTP\'');
        });

        test('should use transport from environment variable', () => {
            process.env.TRANSPORT = 'HTTP';

            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123'
            ]);

            expect(config.transport).toBe('HTTP');
        });

        test('should default to STDIO when not specified', () => {
            // Clear environment variable
            delete process.env.TRANSPORT;

            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123'
            ]);

            expect(config.transport).toBe('STDIO');
        });

        test('should call debug function with transport', () => {
            createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'HTTP'
            ]);

            expect(mockDebug).toHaveBeenCalledWith('TRANSPORT=HTTP');
        });
    });

    describe('validateDecisionRuntime', () => {
        test('should accept valid decision runtimes', () => {
            const diConfig = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'DI'
            ]);

            const adsConfig = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'ADS'
            ]);

            expect(diConfig.runtime).toBe(DecisionRuntime.DI);
            expect(adsConfig.runtime).toBe(DecisionRuntime.ADS);
        });

        test('should default to DI when not specified', () => {
            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.runtime).toBe(DecisionRuntime.DI);
        });

        test('should throw error for invalid decision runtime', () => {
            mockParseDecisionRuntime.mockReturnValue(undefined);

            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', 'validkey123',
                    '--transport', 'STDIO',
                    '--runtime', 'INVALID'
                ]);
            }).toThrow('Invalid target Decision Runtime: \'undefined\'. Must be one of: \'DI\', \'ADS\'');
        });

        test('should use decision runtime from environment variable', () => {
            process.env.RUNTIME = 'ADS';

            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.runtime).toBe(DecisionRuntime.ADS);
        });

        test('should call debug function with decision runtime', () => {
            createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'DI'
            ]);

            expect(mockDebug).toHaveBeenCalledWith('RUNTIME=DI');
        });

        test('should call parseDecisionRuntime function', () => {
            createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'DI'
            ]);

            expect(mockParseDecisionRuntime).toHaveBeenCalledWith('DI');
        });
    });

    describe('validateApiKey', () => {
        test('should accept valid API keys', () => {
            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.apiKey).toBe('validkey123');
        });

        test('should throw error when API key is undefined', () => {
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', url,
                    '--transport', 'STDIO'
                ]);
            }).toThrow('The Decision Runtime API key is not defined');
        });

        test('should throw error for empty API key', () => {
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', '   ',
                    '--transport', 'STDIO'
                ]);
            }).toThrow('The Decision Runtime API key cannot be empty');
        });

        test('should use API key from environment variable', () => {
            process.env.APIKEY = 'env-api-key-123';

            const config = createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--transport', 'STDIO'
            ]);

            expect(config.apiKey).toBe('env-api-key-123');
        });

        test('should call debug function with API key', () => {
            createConfiguration([
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(mockDebug).toHaveBeenCalledWith('API KEY=validkey123');
        });
    });

    describe('createConfiguration', () => {
        test('should create complete configuration object', () => {
            const config = createConfiguration([
                'node', 'cli.js',
                '--debug',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'HTTP',
                '--runtime', 'ADS'
            ]);

            expect(config).toMatchObject({
                apiKey: 'validkey123',
                runtime: DecisionRuntime.ADS,
                transport: 'HTTP',
                url: url,
                version: version,
                isDebugEnabled: true,
                isDiRuntime: false,
                isAdsRuntime: true,
                isHttpTransport: true,
                isStdioTransport: false,
            });
        });

        test('should create configuration with defaults', () => {
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(['node', 'cli.js']);

            expect(config).toMatchObject({
                apiKey: 'validkey123',
                runtime: DecisionRuntime.DI,
                transport: 'STDIO',
                url: url,
                version: version,
                isDebugEnabled: false,
                isDiRuntime: true,
                isAdsRuntime: false,
                isHttpTransport: false,
                isStdioTransport: true,
            });
        });

        test('should handle debug flag from CLI argument', () => {
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(['node', 'cli.js', '--debug']);

            expect(config.isDebugEnabled).toBe(true);
            expect(mockSetDebug).toHaveBeenCalledWith(true);
        });

        test('should handle debug flag from environment variable', () => {
            process.env.DEBUG = 'true';
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(['node', 'cli.js']);

            expect(config.isDebugEnabled).toBe(true);
            expect(mockSetDebug).toHaveBeenCalledWith(true);
        });

        test('should prioritize CLI arguments over environment variables', () => {
            process.env.URL = 'https://env-api.example.com';
            process.env.APIKEY = 'env-api-key';
            process.env.TRANSPORT = 'STDIO';
            process.env.RUNTIME = 'DI';

            const urlFromCli = 'https://cli-api.example.com';
            const config = createConfiguration([
                'node', 'cli.js',
                '--url', urlFromCli,
                '--apikey', 'cli-api-key-123',
                '--transport', 'HTTP',
                '--runtime', 'ADS'
            ]);

            expect(config.url).toBe(urlFromCli);
            expect(config.apiKey).toBe('cli-api-key-123');
            expect(config.transport).toBe('HTTP');
            expect(config.runtime).toBe(DecisionRuntime.ADS);
        });

        test('should set helper properties correctly for DI runtime', () => {
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration([
                'node', 'cli.js',
                '--runtime', 'DI'
            ]);

            expect(config.isDiRuntime).toBe(true);
            expect(config.isAdsRuntime).toBe(false);
        });

        test('should set helper properties correctly for ADS runtime', () => {
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration([
                'node', 'cli.js',
                '--runtime', 'ADS'
            ]);

            expect(config.isDiRuntime).toBe(false);
            expect(config.isAdsRuntime).toBe(true);
        });

        test('should set transport helper properties correctly', () => {
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';

            const stdioConfig = createConfiguration([
                'node', 'cli.js',
                '--transport', 'STDIO'
            ]);

            const httpConfig = createConfiguration([
                'node', 'cli.js',
                '--transport', 'HTTP'
            ]);

            expect(stdioConfig.isStdioTransport).toBe(true);
            expect(stdioConfig.isHttpTransport).toBe(false);
            expect(httpConfig.isStdioTransport).toBe(false);
            expect(httpConfig.isHttpTransport).toBe(true);
        });

        test('should parse arguments when no arguments provided', () => {
            process.env.URL = url;
            process.env.APIKEY = 'validkey123';
            process.env.TRANSPORT = 'STDIO';

            // Should use process.argv when no arguments provided
            const config = createConfiguration();

            expect(config).toBeDefined();
            expect(config.apiKey).toBe('validkey123');
        });
    });

    describe('Error handling', () => {
        test('should fail fast on first validation error', () => {
            const apiKey = ' ';
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', 'invalid-url',
                    '--apikey', apiKey,
                    '--transport', 'INVALID'
                ]);
            }).toThrow(`The Decision Runtime API key cannot be empty`); // Should throw on invalid API key first
        });

        test('should provide descriptive error messages', () => {
            expect(() => {
                createConfiguration([
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', 'validkey123',
                    '--transport', 'WEBSOCKET'
                ]);
            }).toThrow('Invalid transport protocol: \'WEBSOCKET\'. Must be one of: \'STDIO\', \'HTTP\'');
        });
    });
});