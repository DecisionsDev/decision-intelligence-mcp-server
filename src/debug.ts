let isDebuggingEnabled = false;

export function setDebug(value: boolean): void {
    isDebuggingEnabled = value;
}

export function debug(...data: (object|string)[]): void {
    if (isDebuggingEnabled)
        console.error.apply(null, data);
}

export function isDebug(): boolean {
    return isDebuggingEnabled;
}
