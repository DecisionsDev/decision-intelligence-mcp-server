export enum DecisionRuntime {
    DI = "DI",
    ADS = "ADS",
}

export function parseDecisionRuntime(runtime: string): DecisionRuntime | undefined {
    return Object.values(DecisionRuntime).includes(runtime as DecisionRuntime) ? (runtime as DecisionRuntime) : undefined;
}

