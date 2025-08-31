const AWS = require("aws-sdk");
const fs = require("fs");
const archiver = require("archiver");

AWS.config.update({ region: "us-east-1" });

async function updateLambda() {
  try {
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

    // Update Lambda function code
    const lambda = new AWS.Lambda();

    const params = {
      FunctionName: "mep-survey-analyzer",
      ZipFile: zipBuffer,
    };

    const result = await lambda.updateFunctionCode(params).promise();
    console.log("Lambda function updated:", result.FunctionArn);
  } catch (error) {
    console.error("Error:", error);
  }
}

updateLambda();
