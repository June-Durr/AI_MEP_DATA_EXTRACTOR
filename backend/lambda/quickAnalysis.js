// backend/lambda/quickAnalysis.js - Updated with CORS headers
const AWS = require("aws-sdk");
const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

exports.handler = async (event) => {
  console.log("=== LAMBDA STARTED ===");
  console.log("Event:", JSON.stringify(event, null, 2));

  // CORS headers for browser requests
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ message: "CORS preflight successful" }),
    };
  }

  try {
    // Parse the request body
    let body;
    if (event.body) {
      body = JSON.parse(event.body);
    } else {
      throw new Error("No request body provided");
    }

    const { imageBase64, equipmentType } = body;
    console.log("Image received, length:", imageBase64?.length || 0);
    console.log("Equipment type:", equipmentType);

    // Use Claude 3 Haiku - supports both text and images
    console.log("Calling Bedrock with model: anthropic.claude-3-haiku");

    // Build content array - handle test case where imageBase64 might just be "test"
    const content = [];

    if (imageBase64 === "test") {
      // Test mode - just send text
      content.push({
        type: "text",
        text: "This is a test message. Please respond with 'Lambda is working with Claude 3 Haiku!'",
      });
    } else {
      // Real image analysis
      content.push({
        type: "text",
        text: `You are an expert MEP engineer analyzing equipment nameplates. 
        Extract the following information from this image:
        1. Manufacturer
        2. Model Number
        3. Serial Number
        4. Manufacturing Date/Year
        5. Electrical Specifications (Voltage, Phase, Amps, HP)
        6. Capacity (BTU, Tons, GPM, etc.)
        7. Any safety warnings or certifications
        
        For Lennox equipment, decode the serial number to determine the age.
        Format: First 4 digits often indicate year and week (YYWW).
        
        Provide a clear, structured response.`,
      });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: imageBase64,
        },
      });
    }

    const response = await bedrock
      .invokeModel({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 500,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: content,
            },
          ],
        }),
      })
      .promise();

    console.log("✓ Bedrock responded successfully");
    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log("Result:", result);

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: "Analysis complete!",
        data: result.content?.[0]?.text || "No response",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("❌ Lambda error:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorCode: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
