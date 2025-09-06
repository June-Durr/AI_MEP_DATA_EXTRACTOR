// backend/debug-lambda.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

async function checkLambdaCode() {
  try {
    const lambda = new AWS.Lambda();

    const result = await lambda
      .getFunction({
        FunctionName: "mep-survey-analyzer",
      })
      .promise();

    console.log("Current Lambda configuration:");
    console.log("- Runtime:", result.Configuration.Runtime);
    console.log("- Handler:", result.Configuration.Handler);
    console.log("- Code SHA:", result.Configuration.CodeSha256);
    console.log("- Last Modified:", result.Configuration.LastModified);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkLambdaCode();
