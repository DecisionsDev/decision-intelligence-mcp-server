export enum AuthenticationMode {
    DI_API_KEY = "DiApiKey",
    ZEN_API_KEY = "ZenApiKey",
    BASIC = "Basic",
}

export function parseAuthenticationMode(runtime: string): AuthenticationMode | undefined {
    const normalizedInput = runtime.toLowerCase();
    return Object.values(AuthenticationMode).find(
        mode => mode.toLowerCase() === normalizedInput
    );
}

export function defaultAuthenticationMode(): AuthenticationMode {
    return AuthenticationMode.DI_API_KEY;
}
