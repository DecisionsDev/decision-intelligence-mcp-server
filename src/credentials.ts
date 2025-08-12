import {OptionValues} from "commander";
import {debug} from "./debug.js";

interface CredentialsOptions {
    apikey?: string;
    username?: string;
    password?: string;
}

export class Credentials {
    private readonly apikey?: string;

    private readonly username?: string;

    private readonly password?: string;

    constructor(options: CredentialsOptions = {}) {
        const { apikey, username, password } = options;
        this.apikey = apikey;
        this.username = username;
        this.password = password;
        debug(this.toString());
    }

    static validateCredentials(options: OptionValues) {
        const apikey = options.apikey;
        const username = options.username;
        const password = options.password;

        if (apikey && (username || password)) {
            throw new Error('Decision runtime credentials: cannot define both API key and username/password command line arguments');
        }

        if (apikey) {
            this.validateApiKey(apikey);
            return new Credentials({ apikey });
        }

        if (username && password) {
            this.validateUsernamePassword(username, password);
            return new Credentials({ username, password });
        }
        debug("No credentials provided as command line arguments");
        return Credentials.fromEnvironment();
    }

    private static validateUsernamePassword(username: string, password :string) {
        if (username.trim().length === 0) {
            throw new Error('The decision runtime username cannot be empty');
        }
        if (password.trim().length === 0) {
            throw new Error('The decision runtime password cannot be empty');
        }
    }

    private static validateApiKey(apikey:string) {
        if (apikey.trim().length === 0) {
            throw new Error('The decision runtime API key cannot be empty');
        }
    }

    private static fromEnvironment(environmentVariables = process.env) {
        const apikey = environmentVariables.APIKEY;
        const username = environmentVariables.USERNAME;
        const password = environmentVariables.PASSWORD;

        if (apikey && (username || password)) {
            throw new Error('Decision runtime credentials: cannot define both APIKEY and USERNAME/PASSWORD environment variables');
        }

        if (apikey) {
            this.validateApiKey(apikey);
            return new Credentials({ apikey: apikey });
        }
        if (username && password) {
            this.validateUsernamePassword(username, password);
            return new Credentials({
                username: username,
                password: password
            });
        }

        throw new Error('No decision runtime credentials provide: please set either the APIKEY or both USERNAME and PASSWORD environment variables - or use the corresponding command line arguments');
    }

    private isApiKey() {
        return !!this.apikey;
    }

    toString() {
        if (this.isApiKey()) {
            return `Credentials(apikey: ***)`;
        }
        return `Credentials(username: ${this.username}, password: ***)`;
    }

    getAuthorizationHeaderValue() {
        if (this.isApiKey()) {
            return this.apikey;
        }
        const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        return `Basic ${encoded}`;
    }

    getAuthorizationHeaderKey() : string {
        return this.isApiKey() ? 'apikey' : 'authorization';
    }
}
