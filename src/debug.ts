export const DEBUG=true

export function debug(...data: any[]): void {
    console.error
    if (DEBUG)
        console.error.apply(null, data);
}
