var DEBUG = false;

export function setDebug(value: boolean): void {
    DEBUG = value;
}

export function debug(...data: any[]): void {
    if (DEBUG)
        console.error.apply(null, data);
}
