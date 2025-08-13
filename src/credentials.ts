import {OptionValues} from "commander";
import {debug} from "./debug.js";

export enum CredentialKinds {
    DI_API_KEY = "DI API key",
    ZEN_API_KEY = "Zen API key",
    BASIC_AUTH = "Basic Auth",
}

interface CredentialsOptions {
    apikey?: string;
    username?: string;
    password?: string;
}

export class Credentials {
    private readonly apikey?: string;

    private readonly username?: string;

    private readonly password?: string;

    readonly kind: CredentialKinds;

    private constructor(options: CredentialsOptions = {}, kind: CredentialKinds) {
        const { apikey, username, password } = options;
        this.apikey = apikey;
        this.username = username;
        this.password = password;
        this.kind = kind;
        debug(this.toString());
    }

    static validateCredentials(options: OptionValues) {
        const apikey = options.apikey || process.env.APIKEY;
        const username = options.username || process.env.USERNAME;
        const password = options.password || process.env.PASSWORD;

        if (apikey) {
            if (password) {
                throw new Error('Decision runtime credentials: cannot provide both API key and password');
            }
            return username ? this.createZenApiKeyCredentials(username, apikey) : this.createDiApiKeyCredentials(apikey);
        }

        if (username && password) {
            return this.createBasicAuthCredentials(username, password);
        }
        throw new Error("Decision runtime credentials are missing: please provide either an API key, a username and a Zen API key, or a username and a password");
    }

    static createDiApiKeyCredentials(apikey: string) {
        this.checkNonEmptyString(apikey, 'The DI decision runtime API key cannot be empty');
        return new Credentials({apikey}, CredentialKinds.DI_API_KEY);
    }

    static createZenApiKeyCredentials(username: string, apikey: string) {
        this.checkNonEmptyString(username, 'The decision runtime username cannot be empty');
        this.checkNonEmptyString(apikey, 'The decision runtime Zen PI key cannot be empty');
        return new Credentials({username, apikey}, CredentialKinds.ZEN_API_KEY);
    }

    static createBasicAuthCredentials(username: string, password: string) {
        this.checkNonEmptyString(username, 'The decision runtime username cannot be empty');
        this.checkNonEmptyString(password, 'The decision runtime password cannot be empty');
        return new Credentials({ username, password }, CredentialKinds.BASIC_AUTH);
    }

    private static checkNonEmptyString(apikey:string, error: string) {
        if (apikey.trim().length === 0) {
            throw new Error(error);
        }
    }

    toString() {
        switch (this.kind) {
            case CredentialKinds.DI_API_KEY: {
                return `DI API Key(API key: ***)`;
            }
            case CredentialKinds.ZEN_API_KEY: {
                return `Zen API Key(username: ${this.username}, API key: ***)`;
            }
            case CredentialKinds.BASIC_AUTH:
            default: {
                return `Basic Authentication(username: ${this.username}, password: ***)`;
            }
        }
    }

    getAuthorizationHeaderValue(): string {
        switch (this.kind) {
            case CredentialKinds.DI_API_KEY: {
                return this.apikey!;
            }
            case CredentialKinds.ZEN_API_KEY: {
                const encoded = Buffer.from(`${this.username}:${this.apikey}`).toString('base64');
                return `ZenApiKey ${encoded}`;
            }
            case CredentialKinds.BASIC_AUTH:
            default: {
                const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
                return `Basic ${encoded}`;
            }
        }
    }

    getAuthorizationHeaderKey() : string {
        switch (this.kind) {
            case CredentialKinds.DI_API_KEY: {
                return 'apikey';
            }
            case CredentialKinds.BASIC_AUTH:
            case CredentialKinds.ZEN_API_KEY:
            default: {
                return 'authorization';
            }
        }
    }
}
