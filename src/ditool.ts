/**
 * Generates a unique tool name for an operation of a decision service.
 * 
 * @param operationId - The operation identifier.
 * @param decisionServiceName - The name of the decision service.
 * @param decisionServiceId - The unique ID of the decision service.
 * @param toolNames - Array of existing tool names.
 * @returns A unique tool name string.
 */
export function getToolName(operationId: string, 
                            decisionServiceName: string,
                            decisionServiceId: string,
                            toolNames: string[]): string {
    // WO does not support white spaces for tool names
    // Claude does not support /
    const toolName = (decisionServiceName + " " + operationId).replaceAll(" ", "_").replaceAll("/", "_");
            
    if (toolNames.includes(toolName))
        return (decisionServiceId + " " + operationId).replaceAll(" ", "_").replaceAll("/", "_");

    return toolName;
}