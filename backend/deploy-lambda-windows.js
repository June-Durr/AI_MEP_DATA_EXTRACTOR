const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

AWS.config.update({ region: "us-east-1" });

async function deployLambda() {
  try {
    // Get account ID
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;

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

    console.log("Deployment package created");

    // Read the zip file
    const zipBuffer = fs.readFileSync("function.zip");

    // Create Lambda function
    const lambda = new AWS.Lambda();

    const params = {
      FunctionName: "mep-survey-analyzer",
      Runtime: "nodejs18.x",
      Role: `arn:aws:iam::${accountId}:role/mep-survey-lambda-role`,
      Handler: "quickAnalysis.handler",
      Code: {
        ZipFile: zipBuffer,
      },
      Timeout: 30,
      MemorySize: 512,
    };

    const result = await lambda.createFunction(params).promise();
    console.log("Lambda function created:", result.FunctionArn);
  } catch (error) {
    console.error("Error:", error);
  }
}

deployLambda();
