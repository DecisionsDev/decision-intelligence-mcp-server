import axios from 'axios';

export function executeDecision(apikey:string, baseURL:string, decisionId:string, operation:string, input:any) {
  var url = baseURL + "/deploymentSpaces/development/decisions/" 
      + encodeURIComponent(decisionId) 
      + "/operations/" 
      + encodeURIComponent(operation)
      +"/execute";

    var headers = {
        "Content-Type": "application/json",
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.post(url, input, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}

export function executeLastDeployedDecisionService(apikey:string, baseURL:string, serviceId:string, operation:string, input:any) {
    var url = baseURL + "/selectors/lastDeployedDecisionService/deploymentSpaces/development/operations/"
      + encodeURIComponent(operation)
      + "/execute?decisionServiceId=" + encodeURIComponent(serviceId);

    var headers = {
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
    var url = baseURL + "/deploymentSpaces"
        + "/" + deploymentSpace
        + "/metadata?names=decisionServiceId";

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return response.data;
        }
    );
}

export function getDecisionServiceIds(metadata:any): string[] {
    var ids: string[] = [];

    metadata.forEach((m:any) => {
        var id = m.decisionServiceId.value;
        if (!ids.includes(id))
            ids.push(id);
    });

    return ids;
}

export function getDecisionOpenapi(apikey:string, baseURL:string, decisionId:string) {
  var url = baseURL + "/deploymentSpaces/development/decisions/" 
      + encodeURIComponent(decisionId) 
      + "/openapi";

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return response.data;
        });
}

export function getDecisionServiceOpenAPI(apikey:string, baseURL:string, decisionServiceId:string) {
    var url = baseURL + "/selectors/lastDeployedDecisionService/deploymentSpaces/development"
      + "/openapi?decisionServiceId="
      + encodeURIComponent(decisionServiceId) + "&outputFormat=JSON"
      + "/openapi";

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return response.data;
        });
}

export function getDecisionOperationJsonSchema(apikey:string, baseURL:string, decisionId:string, operation:string) {
    var url = baseURL + "/deploymentSpaces/development/decisions/"
      + encodeURIComponent(decisionId)
      + "/operations/"
      + encodeURIComponent(operation)
      + "/schemas?format=JSON_SCHEMA";

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}
