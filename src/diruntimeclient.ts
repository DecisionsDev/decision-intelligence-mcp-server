import axios from 'axios';
import { OpenAPIV3_1 } from "openapi-types";
import {Configuration} from "./command-line.js";
import { debug } from './debug.js';

export function executeDecision(configuration: Configuration, deploymentSpace: string, decisionId: string, operation: string, input: object|undefined) {
    const url = configuration.url + "/deploymentSpaces/" + deploymentSpace + "/decisions/"
        + encodeURIComponent(decisionId)
        + "/operations/"
        + encodeURIComponent(operation)
        + "/execute";

    return axios.post(url, input, { headers: getJsonContentTypeHeaders(configuration) })
        .then(function (response) {
            return JSON.stringify(response.data);
      });
}

function getJsonContentTypeHeaders(configuration: Configuration) {
    return {
        ["Content-Type"]: "application/json",
        ...getHeaders(configuration)
    };
}

export function executeLastDeployedDecisionService(configuration: Configuration, deploymentSpace: string, serviceId: string, operation: string, input: object) {
    const url = configuration.url + "/selectors/lastDeployedDecisionService/deploymentSpaces/" + deploymentSpace
      + "/operations/" + encodeURIComponent(operation)
      + "/execute?decisionServiceId=" + encodeURIComponent(serviceId);

    return axios.post(url, input, { headers: getJsonContentTypeHeaders(configuration) })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}

export async function getDecisionMetadata(configuration: Configuration, deploymentSpace: string, decisionId: string) {
    const url = configuration.url + `/deploymentSpaces/${deploymentSpace}/decisions/${encodeURIComponent(decisionId)}/metadata`;

    const response = await axios.get(url, {headers: getHeaders(configuration)});
    return response.data;
}

export function setDecisionMetadata(configuration: Configuration, deploymentSpace: string, decisionId: string, metadata: {[key: string]: object}) {
    const url = configuration.url + "/deploymentSpaces/" + deploymentSpace
      + "/decisions/" + encodeURIComponent(decisionId)
      + "/metadata";

    return axios.put(url, {map: metadata}, { headers: getJsonContentTypeHeaders(configuration) })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}


export function getDeploymentSpaceMetadata(configuration: Configuration, deploymentSpace:string) {
    const url = configuration.url + "/deploymentSpaces"
        + "/" + deploymentSpace
        + "/metadata?names=decisionServiceId,decisionServiceName,decisionServiceVersion,deploymentTime,decisionId";

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return response.data;
        }
    );
}

export async function getDecisionServices(configuration: Configuration, deploymentSpaceId: string) {

    return getDeploymentSpaceMetadata(configuration, deploymentSpaceId)
        .then(metadata =>  {
            const ids: object[] = [];

            metadata.forEach((m: MetadataType) => {
            const id = m.decisionServiceId.value;
            if (!ids.includes({
                    decisionServiceId: id,
                    decisionServiceName: m.decisionServiceName.value,
                    decisionServiceVersion: m.decisionServiceVersion.value,
                    deploymentTime: m.deploymentTime.value,
                    decisionId: m.decisionId.value
                }))
                ids.push({
                    decisionServiceId: id,
                    decisionServiceName: m.decisionServiceName,
                    decisionServiceVersion: m.decisionServiceVersion,
                    deploymentTime: m.deploymentTime,
                    decisionId: m.decisionId
                });
            });

            return ids;
        });
}

type MetadataType = {
    decisionServiceId: {value: string},
    decisionServiceName: {value: string},
    decisionServiceVersion: {value: string},
    deploymentTime: {value: string},
    decisionId: {value: string}
};
export function getDecisionServiceIds(metadata: MetadataType[]): string[] {
    const ids: string[] = [];

    metadata.forEach((m: MetadataType) => {
        const id = m.decisionServiceId.value;
        if (!ids.includes(id))
            ids.push(id);
    });

    return ids;
}

export function getDecisionRuntimeOpenAPI(configuration: Configuration) {
    const url = configuration.url + "/openapi.yaml";
    
    debug("getDecisionRuntimeOpenAPI");

    const authorizationHeaderValue = configuration.credentials.getAuthorizationHeaderValue();
    const authorizationHeaderKey = configuration.credentials.getAuthorizationHeaderKey()
    const headers = {
        ["User-Agent"]: `IBM-DI-MCP-Server/${configuration.version}`,
        [authorizationHeaderKey] : authorizationHeaderValue
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {        
            debug("openapi runtime: ", response.data);
            return response.data;
    });
}

export function getDecisionServiceOperations(configuration: Configuration, deploymentSpace: string, decisionServiceId: string) {
    const url = configuration.url + "/selectors/lastDeployedDecisionService/deploymentSpaces/" + deploymentSpace
        + "/operations?decisionServiceId=" + encodeURIComponent(decisionServiceId);

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return response.data;
    });
}

export function getDecisionServiceOperationSchema(configuration: Configuration, deploymentSpace: string, decisionServiceId: string, operationId: string) {
    const url = configuration.url + "/selectors/lastDeployedDecisionService/deploymentSpaces/" + deploymentSpace
        + "/operations/" + operationId
        + "/schemas?decisionServiceId=" + decisionServiceId + "&format=OPEN_API";

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return response.data;
    });
}

export function getDecisionOpenapi(configuration: Configuration, deploymentSpace: string, decisionId: string) {
    const url = configuration.url + "/deploymentSpaces/" + deploymentSpace
        + "/decisions/" + encodeURIComponent(decisionId)
        + "/openapi";

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return response.data;
    });
}

function getHeaders(configuration: Configuration) {
    const authorizationHeaderValue = configuration.credentials.getAuthorizationHeaderValue();
    const authorizationHeaderKey = configuration.credentials.getAuthorizationHeaderKey()
    return {
        ["User-Agent"]: `IBM-DI-MCP-Server/${configuration.version}`,
        "accept": "application/json",
        [authorizationHeaderKey] : authorizationHeaderValue
    };
}

export function getDecisionServiceOpenAPI(configuration: Configuration, deploymentSpace: string, decisionServiceId: string) {
    const url = configuration.url + "/selectors/lastDeployedDecisionService/deploymentSpaces/"  + deploymentSpace
        + "/openapi?decisionServiceId="
        + encodeURIComponent(decisionServiceId) + "&outputFormat=JSON"
        + "/openapi";

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return (response.data as OpenAPIV3_1.Document);
    });
}
