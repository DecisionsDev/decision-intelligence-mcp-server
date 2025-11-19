import { AuthenticationMode, parseAuthenticationMode, defaultAuthenticationMode } from '../src/authentication-mode.js';

describe(`Decision Runtime`, () => {

    describe(`defaultAuthenticationMode`, () => {

        test(`should return AuthenticationMode.DI_API_KEY`, () => {
            expect(defaultAuthenticationMode()).toEqual(AuthenticationMode.DI_API_KEY);
        });
    });

    describe(`parseDecisionRuntime`, () => {

        test(`should parse 'DiApiKey' as AuthenticationMode.DI_API_KEY`, () => {
            expect(parseAuthenticationMode('DiApiKey')).toEqual(AuthenticationMode.DI_API_KEY);
        });

        test(`should parse 'diapikey' as AuthenticationMode.DI_API_KEY`, () => {
            expect(parseAuthenticationMode('diapikey')).toEqual(AuthenticationMode.DI_API_KEY);
        });

        test(`should parse 'ZenApiKey' as AuthenticationMode.ZEN_API_KEY`, () => {
            expect(parseAuthenticationMode('ZenApiKey')).toEqual(AuthenticationMode.ZEN_API_KEY);
        });

        test(`should parse 'ZenApiKey' as AuthenticationMode.ZEN_API_KEY`, () => {
            expect(parseAuthenticationMode('zenapikey')).toEqual(AuthenticationMode.ZEN_API_KEY);
        });

        test(`should parse 'Basic' as AuthenticationMode.BASIC`, () => {
            expect(parseAuthenticationMode('Basic')).toEqual(AuthenticationMode.BASIC);
        });

        test(`should parse 'Basic' as AuthenticationMode.BASIC`, () => {
            expect(parseAuthenticationMode('basic')).toEqual(AuthenticationMode.BASIC);
        });

        test(`should parse 'DI' returns undefined`, () => {
            expect(parseAuthenticationMode('DI')).toEqual(undefined);
        });
    });

});
