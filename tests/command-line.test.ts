import {createConfiguration, Configuration} from '../src/command-line.js';
import {debug, setDebug} from '../src/debug.js';
import {DecisionRuntime, parseDecisionRuntime} from '../src/decision-runtime.js';
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";

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

    const version = '2.0.0';
    const protocol = 'https:';
    const hostname = 'api.example.com';
    const url = `${protocol}//${hostname}`;

    describe('validateUrl', () => {
        test('should return URL string argument for valid URL', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.url).toBe(url);
            expect(config.version).toBe(version);
        });

        test('should throw error when URL is undefined', () => {
            expect(() => {
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--apikey', 'validkey123',
                    '--transport', 'STDIO'
                ]);
            }).toThrow('The decision runtime REST API URL is not defined');
        });

        test('should throw error for invalid URL format', () => {
            expect(() => {
                createConfiguration(version, [
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

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.url).toBe(urlFromEnv);
        });

        test('should call debug function with URL', () => {
            createConfiguration(version, [
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
            const stdioConfig = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            const httpConfig = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'HTTP'
            ]);

            expect(stdioConfig.transport).toBeInstanceOf(StdioServerTransport);
            expect(httpConfig.transport).toBe(undefined);
        });

        test('should throw error for invalid transport', () => {
            expect(() => {
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', 'validkey123',
                    '--transport', 'INVALID'
                ]);
            }).toThrow('Invalid transport protocol: \'INVALID\'. Must be one of: \'STDIO\', \'HTTP\'');
        });

        test('should use transport from environment variable', () => {
            process.env.TRANSPORT = 'HTTP';

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123'
            ]);

            expect(config.transport).toBe(undefined);
        });

        test('should default to STDIO when not specified', () => {
            // Clear environment variable
            delete process.env.TRANSPORT;

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123'
            ]);

            expect(config.transport).toBeInstanceOf(StdioServerTransport);
        });

        test('should call debug function with transport', () => {
            createConfiguration(version, [
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
            const diConfig = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'DI'
            ]);

            const adsConfig = createConfiguration(version, [
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
            const config = createConfiguration(version, [
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
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', 'validkey123',
                    '--transport', 'STDIO',
                    '--runtime', 'INVALID'
                ]);
            }).toThrow('Invalid target decision runtime: \'undefined\'. Must be one of: \'DI\', \'ADS\'');
        });

        test('should use decision runtime from environment variable', () => {
            process.env.RUNTIME = 'ADS';

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.runtime).toBe(DecisionRuntime.ADS);
        });

        test('should call debug function with decision runtime', () => {
            createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'DI'
            ]);

            expect(mockDebug).toHaveBeenCalledWith('RUNTIME=DI');
        });

        test('should call parseDecisionRuntime function', () => {
            createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--runtime', 'DI'
            ]);

            expect(mockParseDecisionRuntime).toHaveBeenCalledWith('DI');
        });
    });

    describe('validateCredentials', () => {

        test('should throw error when no credentials are defined', () => {
            expect(() => {
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--transport', 'STDIO'
                ]);
            }).toThrow('Decision runtime credentials are missing: please provide either an API key, a username and a Zen API key, or a username and a password');
        });

        describe('With API key', () => {
            const apiKey = 'validkey123';
            test('should accept valid API keys', () => {
                const config = createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', apiKey,
                    '--transport', 'STDIO'
                ]);

                expect(config).toMatchObject({
                    credentials: {
                        apikey: apiKey
                    },
                });
            });

            test('should throw error for empty API key', () => {
                expect(() => {
                    createConfiguration(version, [
                        'node', 'cli.js',
                        '--url', url,
                        '--apikey', '   ',
                        '--transport', 'STDIO'
                    ]);
                }).toThrow('The DI decision runtime API key cannot be empty');
            });

            test('should use API key from environment variable', () => {
                const envApiKey = 'env-api-key-123';
                process.env.APIKEY = envApiKey;

                const config = createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--transport', 'STDIO'
                ]);

                expect(config).toMatchObject({
                    credentials: {
                        apikey: envApiKey
                    },
                });
            });

            test('should call debug function with API key', () => {
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', apiKey,
                    '--transport', 'STDIO'
                ]);

                expect(mockDebug).toHaveBeenCalledWith('DI API Key(API key: ***)');
            });
        });

        describe('with username/password', () => {
        });
    });

    describe('createConfiguration', () => {
        const apiKey = 'validkey123';
        test('should create complete configuration object', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--debug',
                '--url', url,
                '--apikey', apiKey,
                '--transport', 'HTTP',
                '--runtime', 'ADS'
            ]);

            expect(config).toMatchObject({
                credentials: {
                    apikey: apiKey
                },
                runtime: DecisionRuntime.ADS,
                transport: undefined,
                url: url,
                version: version,
                debugEnabled: true
            });
        });

        test('should create configuration with defaults', () => {
            process.env.URL = url;
            process.env.APIKEY = apiKey;
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(version, ['node', 'cli.js']);

            expect(config).toMatchObject({
                credentials: {
                    apikey: apiKey
                },
                runtime: DecisionRuntime.DI,
                transport: expect.any(StdioServerTransport),
                url: url,
                version: version,
                debugEnabled: originalEnv.DEBUG === 'true',
                deploymentSpaces: ['development']
            });
        });

        test('should handle debug flag from CLI argument', () => {
            process.env.URL = url;
            process.env.APIKEY = apiKey;
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(version, ['node', 'cli.js', '--debug']);

            expect(config.debugEnabled).toBe(true);
            expect(mockSetDebug).toHaveBeenCalledWith(true);
        });

        test('should handle debug flag from environment variable', () => {
            process.env.DEBUG = 'true';
            process.env.URL = url;
            process.env.APIKEY = apiKey;
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(version, ['node', 'cli.js']);

            expect(config.debugEnabled).toBe(true);
            expect(mockSetDebug).toHaveBeenCalledWith(true);
        });

        test('should prioritize CLI arguments over environment variables', () => {
            process.env.URL = 'https://env-api.example.com';
            process.env.APIKEY = 'env-api-key';
            process.env.TRANSPORT = 'STDIO';
            process.env.RUNTIME = 'DI';
            process.env.DEPLOYMENT_SPACES = 'prod,dev,staging';

            const urlFromCli = 'https://cli-api.example.com';
            const cliApiKey = 'cli-api-key-123';
            const deploymentSpaces = ['toto','titi','tutu'];
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', urlFromCli,
                '--apikey', cliApiKey,
                '--transport', 'HTTP',
                '--runtime', 'ADS',
                '--deployment-spaces', deploymentSpaces.join(',')
            ]);

            expect(config).toMatchObject({
                credentials: {
                    apikey: cliApiKey
                },
                runtime: DecisionRuntime.ADS,
                transport: undefined,
                url: urlFromCli,
                deploymentSpaces: deploymentSpaces
            });
        });

        test('should set helper properties correctly for DI runtime', () => {
            process.env.URL = url;
            process.env.APIKEY = apiKey;
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--runtime', 'DI'
            ]);

            expect(config.isDiRuntime()).toBe(true);
            expect(config.isAdsRuntime()).toBe(false);
        });

        test('should set helper properties correctly for ADS runtime', () => {
            process.env.URL = url;
            process.env.APIKEY = apiKey;
            process.env.TRANSPORT = 'STDIO';

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--runtime', 'ADS'
            ]);

            expect(config.isDiRuntime()).toBe(false);
            expect(config.isAdsRuntime()).toBe(true);
        });

        test('should set transport helper properties correctly', () => {
            process.env.URL = url;
            process.env.APIKEY = apiKey;

            const stdioConfig = createConfiguration(version, [
                'node', 'cli.js',
                '--transport', 'STDIO'
            ]);

            const httpConfig = createConfiguration(version, [
                'node', 'cli.js',
                '--transport', 'HTTP'
            ]);

            expect(stdioConfig.isStdioTransport()).toBe(true);
            expect(stdioConfig.isHttpTransport()).toBe(false);
            expect(httpConfig.isStdioTransport()).toBe(false);
            expect(httpConfig.isHttpTransport()).toBe(true);
        });

        test('should parse arguments when no arguments provided', () => {

            const originalArgv = process.argv;
            try {
                process.argv = [originalArgv[0], originalArgv[1]];
                process.env.URL = url;
                process.env.APIKEY = apiKey;

                // Should use process.argv when no arguments provided
                const config = createConfiguration(version);

                expect(config).toBeDefined();
                expect(config).toMatchObject({
                    credentials: {
                        apikey: apiKey
                    },
                    runtime: Configuration.defaultRuntime(),
                    transport: expect.any(StdioServerTransport),
                    url: url,
                    deploymentSpaces: ['development']
                });
            } finally {
                process.argv = originalArgv;
            }
        });
    });

    describe('validateDeploymentSpaces', () => {
        const deploymentSpaces = ['development', 'production', 'test'];
        const encodedDeploymentSpaces = deploymentSpaces.map(ds => encodeURIComponent(ds));
        const encodedDefaultDeploymentSpaces = Configuration.defaultDeploymentSpaces().map(ds => encodeURIComponent(ds));
        test('should accept valid deployment spaces', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--deployment-spaces', deploymentSpaces.join(',')
            ]);

            expect(config.deploymentSpaces).toEqual(encodedDeploymentSpaces);
        });

        test('should accept deployment space with white spaces', () => {
            const deploymentSpace = 'toto     toto';
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--deployment-spaces', `  ${deploymentSpace}        `
            ]);

            expect(config.deploymentSpaces).toEqual([encodeURIComponent(deploymentSpace)]);
        });

        test('should trim deployment spaces', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--deployment-spaces', '     development         ,  production     ,  test  '
            ]);

            expect(config.deploymentSpaces).toEqual(encodedDeploymentSpaces);
        });

        test('should use default deployment spaces when parsed array is empty', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--deployment-spaces', '     ,     ,       ,     '
            ]);

            expect(config.deploymentSpaces).toEqual(encodedDefaultDeploymentSpaces);
        });

        test('should create Configuration with default deploymentSpaces when not provided', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.deploymentSpaces).toEqual(encodedDefaultDeploymentSpaces);
        });

        test('should throw error for invalid deployment spaces that cannot be URI encoded', () => {
            // Create a deployment space name that will cause encodeURIComponent to throw
            // This is a surrogate pair that is deliberately malformed
            const invalidSpace = 'test\uD800space'; // Unpaired surrogate, will cause encodeURIComponent to throw

            // Mock the encodeURIComponent to throw for our specific test case
            const originalEncodeURIComponent = global.encodeURIComponent;
            global.encodeURIComponent = jest.fn().mockImplementation((str) => {
                if (str === invalidSpace) {
                    throw new URIError('URI malformed');
                }
                return originalEncodeURIComponent(str);
            });

            try {
                expect(() => {
                    createConfiguration(version, [
                        'node', 'cli.js',
                        '--url', url,
                        '--apikey', 'validkey123',
                        '--transport', 'STDIO',
                        '--deployment-spaces', `development,${invalidSpace}`
                    ]);
                }).toThrow(`Invalid deployment space '${invalidSpace}' cannot be URI encoded.`);
            } finally {
                // Restore the original function
                global.encodeURIComponent = originalEncodeURIComponent;
            }
        });

        test('should throw error listing all invalid deployment spaces when multiple are invalid', () => {
            // Create three deployment space names that will cause encodeURIComponent to throw
            const invalidSpace1 = 'test\uD800space1';
            const invalidSpace2 = 'test\uD800space2';
            const invalidSpace3 = 'test\uD800space3';

            // Mock the encodeURIComponent to throw for our specific test cases
            const originalEncodeURIComponent = global.encodeURIComponent;
            global.encodeURIComponent = jest.fn().mockImplementation((str) => {
                if ([invalidSpace1, invalidSpace2, invalidSpace3].includes(str)) {
                    throw new URIError('URI malformed');
                }
                return originalEncodeURIComponent(str);
            });

            try {
                expect(() => {
                    createConfiguration(version, [
                        'node', 'cli.js',
                        '--url', url,
                        '--apikey', 'validkey123',
                        '--transport', 'STDIO',
                        '--deployment-spaces', `development,${invalidSpace1},${invalidSpace2},${invalidSpace3},production`
                    ]);
                }).toThrow(`Invalid deployment spaces '${invalidSpace1}', '${invalidSpace2}', '${invalidSpace3}' cannot be URI encoded.`);
            } finally {
                // Restore the original function
                global.encodeURIComponent = originalEncodeURIComponent;
            }
        });

        test('should use deployment spaces from environment variable', () => {
            const deploymentSpaces = ['env-space-1', 'env-space-2'];
            process.env.DEPLOYMENT_SPACES = deploymentSpaces.join(',');

            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.deploymentSpaces).toEqual(deploymentSpaces.map(ds => encodeURIComponent(ds)));
        });

        test('should call debug function with deployment spaces', () => {
            const deploymentSpaces = 'dev,prod';
            createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--deployment-spaces', deploymentSpaces
            ]);

            expect(mockDebug).toHaveBeenCalledWith(`DEPLOYMENT SPACES=${deploymentSpaces}`);
        });
    });

    describe('Error handling', () => {
        test('should fail fast on first validation error', () => {
            const apiKey = ' ';
            expect(() => {
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', 'invalid-url',
                    '--apikey', apiKey,
                    '--transport', 'INVALID'
                ]);
            }).toThrow(`The DI decision runtime API key cannot be empty`); // Should throw on invalid API key first
        });

        test('should provide descriptive error messages', () => {
            expect(() => {
                createConfiguration(version, [
                    'node', 'cli.js',
                    '--url', url,
                    '--apikey', 'validkey123',
                    '--transport', 'WEBSOCKET'
                ]);
            }).toThrow('Invalid transport protocol: \'WEBSOCKET\'. Must be one of: \'STDIO\', \'HTTP\'');
        });
    });

    describe('getDecisionServiceIds', () => {
        test('should get no decisionServiceIds', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO'
            ]);

            expect(config.decisionServiceIds).toEqual(undefined);
        });

        test('should get decisionServiceIds', () => {
            const config = createConfiguration(version, [
                'node', 'cli.js',
                '--url', url,
                '--apikey', 'validkey123',
                '--transport', 'STDIO',
                '--decision-service-ids', "A,B"
            ]);

            expect(config.decisionServiceIds).toEqual(["A", "B"]);
        });
    });
});