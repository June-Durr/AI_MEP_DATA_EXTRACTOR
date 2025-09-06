// Test which Claude model IDs actually work
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

const modelsToTest = [
  "anthropic.claude-3-haiku-20240307-v1:0",
  "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "anthropic.claude-3-haiku",
  "anthropic.claude-3-5-sonnet",
  "us.anthropic.claude-3-haiku-20240307-v1:0"
];

async function testModel(modelId) {
  try {
    console.log(`Testing ${modelId}...`);
    
    const response = await bedrock.invokeModel({
      modelId: modelId,
      contentType: "application/json", 
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 50,
        messages: [{
          role: "user",
          content: "Hello"
        }]
      })
    }).promise();
    
    console.log(`✅ ${modelId} - SUCCESS`);
    return true;
  } catch (error) {
    console.log(`❌ ${modelId} - ${error.code}: ${error.message}`);
    return false;
  }
}

async function testAllModels() {
  console.log("Testing model access...\n");
  
  for (const modelId of modelsToTest) {
    await testModel(modelId);
  }
}

testAllModels();