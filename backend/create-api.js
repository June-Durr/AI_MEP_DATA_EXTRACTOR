// backend/create-api.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" }); // ADD THIS LINE
const apigateway = new AWS.APIGateway();
const lambda = new AWS.Lambda();

async function createAPI() {
  try {
    // Get your account ID
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;

    // Create REST API
    const api = await apigateway
      .createRestApi({
        name: "mep-survey-api",
        description: "MEP Survey AI API",
      })
      .promise();

    console.log("API created:", api.id);

    // Get root resource
    const resources = await apigateway
      .getResources({
        restApiId: api.id,
      })
      .promise();

    const rootId = resources.items[0].id;

    // Create /analyze resource
    const analyzeResource = await apigateway
      .createResource({
        restApiId: api.id,
        parentId: rootId,
        pathPart: "analyze",
      })
      .promise();

    // Create POST method
    await apigateway
      .putMethod({
        restApiId: api.id,
        resourceId: analyzeResource.id,
        httpMethod: "POST",
        authorizationType: "NONE",
      })
      .promise();

    // Create Lambda integration
    await apigateway
      .putIntegration({
        restApiId: api.id,
        resourceId: analyzeResource.id,
        httpMethod: "POST",
        type: "AWS_PROXY",
        integrationHttpMethod: "POST",
        uri: `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:${accountId}:function:mep-survey-analyzer/invocations`,
      })
      .promise();

    // Add Lambda permission
    await lambda
      .addPermission({
        FunctionName: "mep-survey-analyzer",
        StatementId: "apigateway-invoke",
        Action: "lambda:InvokeFunction",
        Principal: "apigateway.amazonaws.com",
        SourceArn: `arn:aws:execute-api:us-east-1:${accountId}:${api.id}/*/*`,
      })
      .promise();

    // Enable CORS
    await apigateway
      .putMethodResponse({
        restApiId: api.id,
        resourceId: analyzeResource.id,
        httpMethod: "POST",
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": false,
        },
      })
      .promise();

    // Deploy API
    await apigateway
      .createDeployment({
        restApiId: api.id,
        stageName: "prod",
      })
      .promise();

    console.log(
      `API URL: https://${api.id}.execute-api.us-east-1.amazonaws.com/prod`
    );

    // Save API URL
    const fs = require("fs");
    fs.writeFileSync(
      "../api-url.txt",
      `https://${api.id}.execute-api.us-east-1.amazonaws.com/prod`
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

createAPI();
