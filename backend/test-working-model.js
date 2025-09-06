// Test with models we know work from your earlier check
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

async function testWorkingModel() {
  try {
    console.log("Testing anthropic.claude-3-5-sonnet-20240620-v1:0...");
    
    const response = await bedrock.invokeModel({
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
      contentType: "application/json", 
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 50,
        messages: [{
          role: "user",
          content: "Hello! Please respond with 'Working!'"
        }]
      })
    }).promise();
    
    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log("✅ SUCCESS! Response:", result.content[0].text);
    return "anthropic.claude-3-5-sonnet-20240620-v1:0";
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    
    // Try Claude Sonnet 4 as backup
    try {
      console.log("\nTrying anthropic.claude-sonnet-4-20250514-v1:0...");
      
      const response = await bedrock.invokeModel({
        modelId: "anthropic.claude-sonnet-4-20250514-v1:0",
        contentType: "application/json", 
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 50,
          messages: [{
            role: "user",
            content: "Hello! Please respond with 'Working!'"
          }]
        })
      }).promise();
      
      const result = JSON.parse(new TextDecoder().decode(response.body));
      console.log("✅ SUCCESS! Response:", result.content[0].text);
      return "anthropic.claude-sonnet-4-20250514-v1:0";
    } catch (error2) {
      console.log(`❌ Also failed: ${error2.message}`);
      return null;
    }
  }
}

testWorkingModel();