let DEBUG = false;

export function setDebug(value: boolean): void {
    DEBUG = value;
}

export function debug(...data: (object|string)[]): void {
    if (DEBUG)
        console.error.apply(null, data);
}

export function isDebug(): boolean {
    return DEBUG;
}
