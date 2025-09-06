// backend/setup-lambda-complete.js
const AWS = require("aws-sdk");
const fs = require("fs");
const archiver = require("archiver");

AWS.config.update({ region: "us-east-1" });

async function setupLambdaComplete() {
  try {
    // Get account ID
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;

    console.log("Account ID:", accountId);

    // Check if IAM role exists
    const iam = new AWS.IAM();
    let roleArn;

    try {
      const role = await iam
        .getRole({ RoleName: "mep-survey-lambda-role" })
        .promise();
      roleArn = role.Role.Arn;
      console.log("✓ IAM Role exists:", roleArn);
    } catch (error) {
      if (error.code === "NoSuchEntity") {
        console.log("Creating IAM role...");

        // Create IAM role
        const roleDoc = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "lambda.amazonaws.com" },
              Action: "sts:AssumeRole",
            },
          ],
        };

        const role = await iam
          .createRole({
            RoleName: "mep-survey-lambda-role",
            AssumeRolePolicyDocument: JSON.stringify(roleDoc),
            Description: "Role for MEP Survey Lambda function",
          })
          .promise();

        roleArn = role.Role.Arn;
        console.log("✓ IAM Role created:", roleArn);

        // Attach policies
        await iam
          .attachRolePolicy({
            RoleName: "mep-survey-lambda-role",
            PolicyArn:
              "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          })
          .promise();

        await iam
          .attachRolePolicy({
            RoleName: "mep-survey-lambda-role",
            PolicyArn: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
          })
          .promise();

        console.log("✓ Policies attached");

        // Wait for role to propagate
        console.log("Waiting 10 seconds for role to propagate...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        throw error;
      }
    }

    console.log("Creating deployment package...");

    // Create a zip file
    const output = fs.createWriteStream("function.zip");
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    // Add Lambda function
    archive.file("lambda/quickAnalysis.js", { name: "quickAnalysis.js" });

    // Add node_modules
    archive.directory("node_modules/", "node_modules");

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    console.log("✓ Deployment package created");

    // Read the zip file
    const zipBuffer = fs.readFileSync("function.zip");

    // Check if Lambda function exists
    const lambda = new AWS.Lambda();
    let functionExists = false;

    try {
      await lambda
        .getFunction({ FunctionName: "mep-survey-analyzer" })
        .promise();
      functionExists = true;
      console.log("Lambda function already exists, updating...");
    } catch (error) {
      if (error.code !== "ResourceNotFoundException") {
        throw error;
      }
      console.log("Creating new Lambda function...");
    }

    if (functionExists) {
      // Update existing function
      const result = await lambda
        .updateFunctionCode({
          FunctionName: "mep-survey-analyzer",
          ZipFile: zipBuffer,
        })
        .promise();
      console.log("✓ Lambda function updated:", result.FunctionArn);
    } else {
      // Create new function
      const params = {
        FunctionName: "mep-survey-analyzer",
        Runtime: "nodejs18.x",
        Role: roleArn,
        Handler: "quickAnalysis.handler",
        Code: {
          ZipFile: zipBuffer,
        },
        Timeout: 30,
        MemorySize: 512,
        Description: "MEP Survey AI Agent for equipment nameplate analysis",
      };

      const result = await lambda.createFunction(params).promise();
      console.log("✓ Lambda function created:", result.FunctionArn);
    }

    console.log("\n🎉 Lambda function is ready!");
    console.log("You can now test with: node test-lambda.js");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
  }
}

setupLambdaComplete();
