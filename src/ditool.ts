import {debug} from "./debug.js";
import {getDecisionMetadata} from './diruntimeclient.js';
import {Constants} from "./constants.js";
import {Configuration} from "./command-line.js";

export async function getToolName(configuration: Configuration, info: Record<string, string>, operationId: string, decisionServiceId: string, toolNames: string[]): Promise<string> {
    const serviceName = info["x-ibm-ads-decision-service-name"];
    debug("decisionServiceName", serviceName);
    const decisionId = info["x-ibm-ads-decision-id"];
    debug("decisionId", decisionId);

    type MetadataEntry = {
        name: string;
        kind: string;
        readOnly: boolean;
        value: string;
    };

    type MetadataMap = {
        [key: string]: MetadataEntry;
    };

    const metadata: { map: MetadataMap } = await getDecisionMetadata(configuration, Constants.DEVELOPMENT_DEPLOYMENT_SPACE, decisionId)
    debug("metadata", JSON.stringify(metadata, null, " "));

    const metadataName = `mcpToolName.${operationId}`;
    return metadata.map[metadataName]?.value || generateToolName(operationId, serviceName, decisionServiceId, toolNames);
}

/**
 * Generates a unique tool name for an operation of a decision service.
 *
 * @param operationId - The operation identifier.
 * @param decisionServiceName - The name of the decision service.
 * @param decisionServiceId - The unique ID of the decision service.
 * @param toolNames - Array of existing tool names.
 * @returns A unique tool name string.
 */
export function generateToolName(operationId: string, decisionServiceName: string, decisionServiceId: string, toolNames: string[]): string {
    // WO does not support white spaces for tool names
    // Claude does not support /
    let toolName = (decisionServiceName + " " + operationId).replaceAll(" ", "_").replaceAll("/", "_");
            
    if (toolNames.includes(toolName)) {
        toolName = (decisionServiceId + " " + operationId).replaceAll(" ", "_").replaceAll("/", "_");
        if (toolNames.includes(toolName))
            throw new Error("Tool name " + toolName  + " already exist");
    }

    return toolName;
}