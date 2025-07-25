export const DEBUG=process.env.DEBUG === "true";

export function debug(...data: any[]): void {
    console.error
    if (DEBUG)
        console.error.apply(null, data);
}
