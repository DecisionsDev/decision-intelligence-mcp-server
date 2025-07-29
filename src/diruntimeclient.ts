import axios from 'axios';

export function executeDecision(apikey:string, baseURL:string, decisionId:string, operation:string, input:object|undefined) {
    const url = baseURL + "/deploymentSpaces/development/decisions/" 
        + encodeURIComponent(decisionId) 
        + "/operations/" 
        + encodeURIComponent(operation)
        +"/execute";

    const headers = {
        "Content-Type": "application/json",
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.post(url, input, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}

export function executeLastDeployedDecisionService(apikey:string, baseURL:string, serviceId:string, operation:string, input: object) {
    const url = baseURL + "/selectors/lastDeployedDecisionService/deploymentSpaces/development/operations/"
      + encodeURIComponent(operation)
      + "/execute?decisionServiceId=" + encodeURIComponent(serviceId);

    const headers = {
        "Content-Type": "application/json",
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.post(url, input, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}


export function getMetadata(apikey:string, baseURL:string, deploymentSpace:string) {
    const url = baseURL + "/deploymentSpaces"
        + "/" + deploymentSpace
        + "/metadata?names=decisionServiceId";

    const headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return response.data;
        }
    );
}

type metadataType = {decisionServiceId: {value: string}};
export function getDecisionServiceIds(metadata: metadataType[]): string[] {
    const ids: string[] = [];

    metadata.forEach((m: metadataType) => {
        const id = m.decisionServiceId.value;
        if (!ids.includes(id))
            ids.push(id);
    });

    return ids;
}

export function getDecisionOpenapi(apikey:string, baseURL:string, decisionId:string) {
    const url = baseURL + "/deploymentSpaces/development/decisions/" 
        + encodeURIComponent(decisionId) 
        + "/openapi";

    const headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return response.data;
    });
}

export function getDecisionServiceOpenAPI(apikey:string, baseURL:string, decisionServiceId:string) {
    const url = baseURL + "/selectors/lastDeployedDecisionService/deploymentSpaces/development"
        + "/openapi?decisionServiceId="
        + encodeURIComponent(decisionServiceId) + "&outputFormat=JSON"
        + "/openapi";

    const headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return response.data;
    });
}
