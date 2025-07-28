const DEBUG=process.env.DEBUG === "true";

export function debug(...data: any[]): void {
    if (DEBUG)
        console.error.apply(null, data);
}
