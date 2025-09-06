// backend/debug-lambda-real.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

async function debugLambda() {
  try {
    const lambda = new AWS.Lambda();

    // List all functions
    console.log("Listing all Lambda functions...");
    const functions = await lambda.listFunctions().promise();

    console.log(`Found ${functions.Functions.length} functions:`);
    functions.Functions.forEach((func) => {
      console.log(`- ${func.FunctionName} (${func.Runtime})`);
    });

    // Try to get our specific function
    console.log("\nChecking mep-survey-analyzer specifically...");
    try {
      const result = await lambda
        .getFunction({
          FunctionName: "mep-survey-analyzer",
        })
        .promise();

      console.log("✓ Function exists!");
      console.log("- Runtime:", result.Configuration.Runtime);
      console.log("- Handler:", result.Configuration.Handler);
      console.log("- Memory:", result.Configuration.MemorySize);
      console.log("- Timeout:", result.Configuration.Timeout);
      console.log("- Last Modified:", result.Configuration.LastModified);

      // Get the actual code
      console.log("\nGetting function code...");
      const code = await lambda
        .getFunctionConfiguration({
          FunctionName: "mep-survey-analyzer",
        })
        .promise();

      console.log("- Code SHA256:", code.CodeSha256);
      console.log(
        "- Environment vars:",
        Object.keys(code.Environment?.Variables || {})
      );
    } catch (funcError) {
      console.log("❌ Function does not exist:", funcError.message);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugLambda();
