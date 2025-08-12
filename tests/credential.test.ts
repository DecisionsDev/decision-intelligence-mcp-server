import {Credentials} from "../src/credentials.js";

describe('Credentials', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };

        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    const apikey = 'apikey';
    const authorization = 'authorization';

    describe('for basic authentication', () => {
        test(`should return '${authorization}' as header key`, () => {
            const credentials = new Credentials({username: 'toto', password: 'tutu'});
            expect(credentials.getAuthorizationHeaderKey()).toBe(authorization);
        });

        test('should return the encoded username and password as header value', () => {
            const username = 'username';
            const password = 'password';
            const credentials = new Credentials({username: username, password: password});
            const encodedUsernamePassword= Buffer.from(`${username}:${password}`).toString('base64');
            expect(credentials.getAuthorizationHeaderValue()).toBe(`Basic ${encodedUsernamePassword}`);
        });

        test('should not display sensitive information', () => {
            const username = 'blah blah blah';
            const password = 'meh';
            const credentials = new Credentials({username: username, password: password});
            const credentialsAsString = credentials.toString();
            expect(credentialsAsString).toContain(username);
            expect(credentialsAsString).not.toContain(password);
        });
    });

    describe('for API key', () => {
        test(`should return '${apikey}' as header key`, () => {
            const credentials = new Credentials({apikey: 'toto'});
            expect(credentials.getAuthorizationHeaderKey()).toBe(apikey);
        });

        test('should return the API key as header value', () => {
            const apiKey = 'titi';
            const credentials = new Credentials({apikey: apiKey});
            expect(credentials.getAuthorizationHeaderValue()).toBe(apiKey);
        });

        test('should not display sensitive information', () => {
            const apiKey = 'woof woof';
            const credentials = new Credentials({apikey: apiKey});
            expect(credentials.toString()).not.toContain(apiKey);
        });
    });

    describe('validateCredentials', () => {

        test(`should throw an error if apikey is empty`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: '      '});
            }).toThrow(`The decision runtime API key cannot be empty`)
        });

        test(`should throw an error if username is empty`, () => {
            expect(() => {
                Credentials.validateCredentials({ username: '      ', password: 'tutu'});
            }).toThrow(`The decision runtime username cannot be empty`)
        });

        test(`should throw an error if password is empty`, () => {
            expect(() => {
                Credentials.validateCredentials({ username: 'foo', password: '      '});
            }).toThrow(`The decision runtime password cannot be empty`)
        });

        test(`should throw an error if both is apikey and username are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: 'toto', username: 'titi'});
            }).toThrow(`Decision runtime credentials: cannot define both API key and username/password command line arguments`)
        });

        test(`should throw an error if both is apikey and password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: 'toto', password: 'titi'});
            }).toThrow(`Decision runtime credentials: cannot define both API key and username/password command line arguments`)
        });

        test(`should throw an error if apikey, username and password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: 'toto', username: 'titi', password: 'tutu'});
            }).toThrow(`Decision runtime credentials: cannot define both API key and username/password command line arguments`)
        });

        test(`should throw an error when neither apikey nor username/password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({});
            }).toThrow(`No decision runtime credentials provide: please set either the APIKEY or both USERNAME and PASSWORD environment variables - or use the corresponding command line arguments`)
        });

        test(`should throw an error when neither apikey nor username/password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({});
            }).toThrow(`No decision runtime credentials provide: please set either the APIKEY or both USERNAME and PASSWORD environment variables - or use the corresponding command line arguments`)
        });

        test('should use APIKEY environment variable when command line arguments are not provided', () => {
            const apiKey = 'the api key'
            process.env.APIKEY = apiKey;
            expect(Credentials.validateCredentials({})).toMatchObject({
                apikey: apiKey
            });
        });

        test(`should throw an error if the APIKEY environment variable is empty`, () => {
            process.env.APIKEY = '          ';
            expect(() => Credentials.validateCredentials({})).
                toThrow('The decision runtime API key cannot be empty');
        });

        test(`should throw an error if the USERNAME environment variable is empty`, () => {
            process.env.USERNAME = '          ';
            process.env.PASSWORD = 'the.password';
            expect(() => Credentials.validateCredentials({})).
                toThrow('The decision runtime username cannot be empty');
        });

        test(`should throw an error if the PASSWORD environment variable is empty`, () => {
            process.env.PASSWORD = '          ';
            process.env.USERNAME = 'the.password';
            expect(() => Credentials.validateCredentials({})).
                toThrow('The decision runtime password cannot be empty');
        });

        test(`should throw an error if both APIKEY and USERNAME environment variables are defined`, () => {
            process.env.APIKEY = 'the.api.key';
            process.env.USERNAME = 'the.username';
            expect(() => Credentials.validateCredentials({})).
                toThrow('Decision runtime credentials: cannot define both APIKEY and USERNAME/PASSWORD environment variables');
        });

        test(`should throw an error if both APIKEY and PASSWORD environment variables are defined`, () => {
            process.env.APIKEY = 'the.api.key';
            process.env.PASSWORD = 'the.password';
            expect(() => Credentials.validateCredentials({})).
                toThrow('Decision runtime credentials: cannot define both APIKEY and USERNAME/PASSWORD environment variables');
        });

        test(`should throw an error if both APIKEY, USERNAME and PASSWORD environment variables are defined`, () => {
            process.env.APIKEY = 'the.api.key';
            process.env.USERNAME = 'the.username';
            process.env.PASSWORD = 'the.password';
            expect(() => Credentials.validateCredentials({})).
                toThrow('Decision runtime credentials: cannot define both APIKEY and USERNAME/PASSWORD environment variables');
        });

        test('should use USERNAME/PASSWORD environment variables when command line arguments are not provided', () => {
            const username = 'foo.bar.bra';
            const password = 'babar';
            process.env.USERNAME = username;
            process.env.PASSWORD = password;
            expect(Credentials.validateCredentials({})).toMatchObject({
                username: username,
                password: password
            });
        });
    });
});