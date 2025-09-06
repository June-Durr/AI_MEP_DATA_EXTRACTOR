// Test inference profile formats
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

const profilesToTest = [
  "us.anthropic.claude-3-haiku-20240307-v1:0",
  "arn:aws:bedrock:us-east-1:489335433947:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0",
  "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
  "arn:aws:bedrock:us-east-1:489335433947:inference-profile/us.anthropic.claude-3-5-sonnet-20240620-v1:0"
];

async function testProfile(profileId) {
  try {
    console.log(`Testing ${profileId}...`);
    
    const response = await bedrock.invokeModel({
      modelId: profileId,
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
    console.log(`✅ SUCCESS! ${profileId} - Response: ${result.content[0].text}`);
    return profileId;
  } catch (error) {
    console.log(`❌ ${profileId} - ${error.code}: ${error.message}`);
    return null;
  }
}

async function testAllProfiles() {
  console.log("Testing inference profile formats...\n");
  
  for (const profileId of profilesToTest) {
    const working = await testProfile(profileId);
    if (working) {
      console.log(`\n🎉 FOUND WORKING PROFILE: ${working}`);
      break;
    }
  }
}

testAllProfiles();