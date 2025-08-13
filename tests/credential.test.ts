import {CredentialKinds, Credentials} from "../src/credentials.js";

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
            const credentials = Credentials.createBasicAuthCredentials('toto', 'tutu')
            expect(credentials.getAuthorizationHeaderKey()).toBe(authorization);
        });

        test('should return the encoded username and password as header value', () => {
            const username = 'username';
            const password = 'password';
            const credentials = Credentials.createBasicAuthCredentials(username, password);
            const encodedUsernamePassword= Buffer.from(`${username}:${password}`).toString('base64');
            expect(credentials.getAuthorizationHeaderValue()).toBe(`Basic ${encodedUsernamePassword}`);
        });

        test('should not display sensitive information', () => {
            const username = 'blah blah blah';
            const password = 'meh';
            const credentials = Credentials.createBasicAuthCredentials(username, password);
            const credentialsAsString = credentials.toString();
            expect(credentialsAsString).toContain(username);
            expect(credentialsAsString).not.toContain(password);
        });
    });

    describe('for DI API key', () => {
        test(`should return '${apikey}' as header key`, () => {
            const credentials = Credentials.createDiApiKeyCredentials('toto');
            expect(credentials.getAuthorizationHeaderKey()).toBe(apikey);
        });

        test('should return the API key as header value', () => {
            const apiKey = 'titi';
            const credentials = Credentials.createDiApiKeyCredentials(apiKey);
            expect(credentials.getAuthorizationHeaderValue()).toBe(apiKey);
        });

        test('should not display sensitive information', () => {
            const apiKey = 'woof woof';
            const credentials = Credentials.createDiApiKeyCredentials(apiKey);
            expect(credentials.toString()).not.toContain(apiKey);
        });
    });

    describe('for Zen API key', () => {
        test(`should return '${authorization}' as header key`, () => {
            const credentials = Credentials.createZenApiKeyCredentials('toto', 'tutu')
            expect(credentials.getAuthorizationHeaderKey()).toBe(authorization);
        });

        test('should return the encoded username and API key as header value', () => {
            const username = 'username';
            const apiKey = 'apiKey';
            const credentials = Credentials.createZenApiKeyCredentials(username, apiKey)
            const encodedUsernamePassword= Buffer.from(`${username}:${apiKey}`).toString('base64');
            expect(credentials.getAuthorizationHeaderValue()).toBe(`ZenApiKey ${encodedUsernamePassword}`);
        });

        test('should not display sensitive information', () => {
            const username = 'blah blah blah';
            const apiKey = 'meh';
            const credentials = Credentials.createZenApiKeyCredentials(username, apiKey)
            const credentialsAsString = credentials.toString();
            expect(credentialsAsString).toContain(username);
            expect(credentialsAsString).not.toContain(apiKey);
        });
    });


    describe('validateCredentials', () => {

        test(`should return DI APi key credentials`, () => {
            const apikey = 'blah.blah.blah';
            const credentials = Credentials.validateCredentials({ apikey });
            expect(credentials!.kind).toBe(CredentialKinds.DI_API_KEY);
            expect(credentials!.getAuthorizationHeaderValue()).toBe(apikey);
        });

        test(`should return Zen APi key credentials`, () => {
            const apikey = 'blah.blah.blah';
            const username = 'pim.pam.plouf';
            const credentials = Credentials.validateCredentials({ apikey, username });
            expect(credentials!.kind).toBe(CredentialKinds.ZEN_API_KEY);
            const encoded= Buffer.from(`${username}:${apikey}`).toString('base64');
            expect(credentials!.getAuthorizationHeaderValue()).toBe(`ZenApiKey ${encoded}`);
        });

        test(`should return basic authentication credentials`, () => {
            const password = 'blah.blah.blah';
            const username = 'pim.pam.plouf';
            const credentials = Credentials.validateCredentials({ password, username });
            expect(credentials!.kind).toBe(CredentialKinds.BASIC_AUTH);
            const encoded= Buffer.from(`${username}:${password}`).toString('base64');
            expect(credentials!.getAuthorizationHeaderValue()).toBe(`Basic ${encoded}`);
        });

        test(`should throw an error if apikey is empty`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: '      '});
            }).toThrow(`The DI decision runtime API key cannot be empty`)
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

        test(`should throw an error if both apikey and password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: 'toto', password: 'titi'});
            }).toThrow(`Decision runtime credentials: cannot provide both API key and password`)
        });

        test(`should throw an error if all three apikey, username and password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({ apikey: 'toto', username: 'titi', password: 'tutu'});
            }).toThrow(`Decision runtime credentials: cannot provide both API key and password`)
        });

        test(`should throw an error when neither apikey nor username/password are defined`, () => {
            expect(() => {
                Credentials.validateCredentials({});
            }).toThrow(`Decision runtime credentials are missing: please provide either an API key, a username and a Zen API key, or a username and a password`)
        });

        test('should use APIKEY environment variable when command line arguments are not provided', () => {
            const apiKey = 'the api key'
            process.env.APIKEY = apiKey;
            expect(Credentials.validateCredentials({})).toMatchObject({
                apikey: apiKey,
                kind: CredentialKinds.DI_API_KEY
            });
        });

        test('should prioritize command line arguments over environment variable', () => {
            const apikey = 'the api key'
            process.env.APIKEY = 'the other API key';
            expect(Credentials.validateCredentials({apikey})).toMatchObject({
                apikey: apikey,
                kind: CredentialKinds.DI_API_KEY
            });

            const username = 'Antonio Dela Vega'
            process.env.USERNAME = 'the other username';
            expect(Credentials.validateCredentials({apikey, username})).toMatchObject({
                apikey: apikey,
                username: username,
                kind: CredentialKinds.ZEN_API_KEY
            });

            const password = 'password'
            process.env.APIKEY = undefined;
            process.env.PASSWORD = 'the other password';
            expect(Credentials.validateCredentials({password, username})).toMatchObject({
                password: password,
                username: username,
                kind: CredentialKinds.BASIC_AUTH
            });
        });

        test('can combine both command line arguments and environment variables', () => {
            const apikey = 'the api key'
            const envUsername = 'the other username';
            process.env.USERNAME = envUsername;
            expect(Credentials.validateCredentials({apikey})).toMatchObject({
                apikey: apikey,
                username: envUsername,
                kind: CredentialKinds.ZEN_API_KEY
            });

            const envApiKey = 'the other API key';
            process.env.APIKEY = envApiKey;
            const username = 'Antonio Dela Vega'
            expect(Credentials.validateCredentials({username})).toMatchObject({
                apikey: envApiKey,
                username: username,
                kind: CredentialKinds.ZEN_API_KEY
            });

            const password = 'password'
            process.env.APIKEY = undefined;
            process.env.PASSWORD = 'the other password';
            expect(Credentials.validateCredentials({password})).toMatchObject({
                password: password,
                username: envUsername,
                kind: CredentialKinds.BASIC_AUTH
            });

            process.env.APIKEY = undefined;
            const envPassword = 'the other password';
            process.env.PASSWORD = envPassword;
            expect(Credentials.validateCredentials({username})).toMatchObject({
                password: envPassword,
                username: username,
                kind: CredentialKinds.BASIC_AUTH
            });
        });
        test(`should throw an error if the APIKEY environment variable is empty`, () => {
            process.env.APIKEY = '          ';
            expect(() => Credentials.validateCredentials({})).
                toThrow('The DI decision runtime API key cannot be empty');
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

        test(`should throw an error if both APIKEY and PASSWORD environment variables are defined`, () => {
            process.env.APIKEY = 'the.api.key';
            process.env.PASSWORD = 'the.password';
            expect(() => Credentials.validateCredentials({})).
                toThrow('Decision runtime credentials: cannot provide both API key and password');
        });

        test(`should throw an error if all three APIKEY, USERNAME and PASSWORD environment variables are defined`, () => {
            process.env.APIKEY = 'the.api.key';
            process.env.USERNAME = 'the.username';
            process.env.PASSWORD = 'the.password';
            expect(() => Credentials.validateCredentials({})).
                toThrow('Decision runtime credentials: cannot provide both API key and password');
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