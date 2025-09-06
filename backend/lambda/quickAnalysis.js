const AWS = require("aws-sdk");
const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

exports.handler = async (event) => {
  console.log("=== LAMBDA STARTED ===");
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    const { imageBase64, equipmentType } = JSON.parse(event.body);
    console.log("Image received, length:", imageBase64.length);
    console.log("Equipment type:", equipmentType);

    // Use Claude 3 Haiku - supports both text and images
    console.log("Calling Bedrock with model: anthropic.claude-3-haiku");

    // Build content array - handle test case where imageBase64 might just be "test"
    const content = [];
    
    if (imageBase64 === "test") {
      // Test mode - just send text
      content.push({
        type: "text",
        text: "This is a test message. Please respond with 'Lambda is working with Claude 3 Haiku!'"
      });
    } else {
      // Real image analysis
      content.push({
        type: "text",
        text: "Please analyze this image and tell me what you see. Focus on any text, labels, or equipment information."
      });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await bedrock
      .invokeModel({
        modelId: "anthropic.claude-3-haiku",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 500,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: content
            }
          ]
        }),
      })
      .promise();

    console.log("✓ Bedrock responded successfully");
    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log("Result:", result);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message: "Lambda is working!",
        data: result.content?.[0]?.text || "No response",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("❌ Lambda error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
