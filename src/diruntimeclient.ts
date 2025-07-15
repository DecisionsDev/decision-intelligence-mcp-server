import axios from 'axios';

export function executeDecision(apikey:string, baseURL:string, decisionId:string, operation:string, input:any) {
  var url = baseURL + "/deploymentSpaces/development/decisions/" 
      + encodeURIComponent(decisionId) 
      + "/operations/" 
      + encodeURIComponent(operation)
      +"/execute";

    console.error("URL=" + url);

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

export function getDecisionOperationJsonSchema(apikey:string, baseURL:string, decisionId:string, operation:string) {
    var url = baseURL + "/deploymentSpaces/development/decisions/"
      + encodeURIComponent(decisionId)
      + "/operations/"
      + encodeURIComponent(operation)
      + "/schemas?format=JSON_SCHEMA";

    console.error("URL=" + url);

    var headers = {
        "accept": "application/json",
        "apikey": apikey
    };

    return axios.get(url, { headers: headers })
        .then(function (response) {          
            return JSON.stringify(response.data);
      });
}
