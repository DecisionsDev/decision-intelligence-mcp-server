import axios from 'axios';
import { OpenAPIV3_1 } from "openapi-types";
import {Configuration} from "./command-line.js";

export function executeDecision(configuration :Configuration, decisionId:string, operation:string, input:object|undefined) {
    const url = configuration.url + "/deploymentSpaces/development/decisions/"
        + encodeURIComponent(decisionId) 
        + "/operations/" 
        + encodeURIComponent(operation)
        +"/execute";

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


export function executeLastDeployedDecisionService(configuration: Configuration, serviceId:string, operation:string, input: object) {
    const url = configuration.url + "/selectors/lastDeployedDecisionService/deploymentSpaces/development/operations/"
      + encodeURIComponent(operation)
      + "/execute?decisionServiceId=" + encodeURIComponent(serviceId);

    return axios.post(url, input, { headers: getJsonContentTypeHeaders(configuration) })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}

export async function getDecisionMetadata(configuration: Configuration, deploymentSpace: string, decisionId: string) {
    const url = configuration.url + `/deploymentSpaces/${encodeURIComponent(deploymentSpace)}/decisions/${encodeURIComponent(decisionId)}/metadata`;

    const response = await axios.get(url, {headers: getHeaders(configuration)});
    return response.data;
}

export function getMetadata(configuration: Configuration, deploymentSpace:string) {
    const url = configuration.url + "/deploymentSpaces"
        + "/" + deploymentSpace
        + "/metadata?names=decisionServiceId";

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return response.data;
        }
    );
}

type MetadataType = {decisionServiceId: {value: string}};
export function getDecisionServiceIds(metadata: MetadataType[]): string[] {
    const ids: string[] = [];

    metadata.forEach((m: MetadataType) => {
        const id = m.decisionServiceId.value;
        if (!ids.includes(id))
            ids.push(id);
    });

    return ids;
}

export function getDecisionOpenapi(configuration: Configuration, decisionId:string) {
    const url = configuration.url + "/deploymentSpaces/development/decisions/"
        + encodeURIComponent(decisionId) 
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
        "accept": "application/json",
        [authorizationHeaderKey] : authorizationHeaderValue
    };
}

export function getDecisionServiceOpenAPI(configuration: Configuration, decisionServiceId:string) {
    const url = configuration.url + "/selectors/lastDeployedDecisionService/deploymentSpaces/development"
        + "/openapi?decisionServiceId="
        + encodeURIComponent(decisionServiceId) + "&outputFormat=JSON"
        + "/openapi";

    return axios.get(url, { headers: getHeaders(configuration) })
        .then(function (response) {          
            return (response.data as OpenAPIV3_1.Document);
    });
}
