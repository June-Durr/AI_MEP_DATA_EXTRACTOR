// backend/lambda/quickAnalysis.js - Enhanced with accurate age calculation
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
      // Real image analysis with enhanced prompt for age calculation
      content.push({
        type: "text",
        text: `You are an expert MEP engineer analyzing equipment nameplates. 
        Extract the following information from this nameplate image and CALCULATE the actual age:

        1. Manufacturer
        2. Model Number  
        3. Serial Number
        4. Manufacturing Year (calculate from serial number if Lennox)
        5. Current Age in Years (2025 minus manufacturing year)
        6. Electrical Specifications (Voltage, Phase, Amps, HP)
        7. Capacity (BTU, Tons, GPM, etc.)
        8. Safety warnings or certifications

        FOR LENNOX EQUIPMENT SERIAL NUMBER DECODING:
        - Format is typically YYWWXXXXXXX where:
        - YY = Last two digits of year (56 = 2006, 08 = 2008, 15 = 2015, etc.)
        - WW = Week of manufacture
        - If year appears to be in 1900s but equipment looks newer, add 100 years
        - Calculate actual age: 2025 - manufacturing year
        
        CRITICAL: Always provide the ACTUAL calculated age in years, not just the method.
        
        Example: Serial "5608D05236" = Year 2006, Age = 19 years (2025-2006=19)
        
        Provide response in this JSON format:
        {
          "manufacturer": "extracted manufacturer",
          "model": "extracted model", 
          "serialNumber": "extracted serial",
          "manufacturingYear": actual_year_number,
          "currentAge": actual_age_number,
          "voltage": "voltage if visible",
          "tonnage": "cooling capacity",
          "serviceLifeAssessment": "Within service life" or "BEYOND SERVICE LIFE (15+ years)",
          "confidence": "high/medium/low"
        }`,
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
          max_tokens: 1000,
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
    console.log("AI Result:", result);

    // Parse the JSON response from Claude
    let parsedData;
    try {
      parsedData = JSON.parse(result.content?.[0]?.text || "{}");
    } catch (e) {
      // If JSON parsing fails, return the raw text
      parsedData = { rawResponse: result.content?.[0]?.text || "No response" };
    }

    // Add cost tracking
    const estimatedCost = calculateRequestCost(imageBase64?.length || 0);

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: "Analysis complete!",
        data: parsedData,
        estimatedCost: estimatedCost,
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

// Cost calculation function
function calculateRequestCost(imageSize) {
  // Claude 3 Haiku pricing (as of 2024):
  // Input: $0.25 per 1M tokens
  // Output: $1.25 per 1M tokens

  // Estimate tokens (rough approximation)
  const inputTokens = 1000 + imageSize / 4; // Base prompt + image tokens
  const outputTokens = 500; // Estimated output

  const inputCost = (inputTokens / 1000000) * 0.25;
  const outputCost = (outputTokens / 1000000) * 1.25;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: Math.round(inputTokens),
    outputTokens: outputTokens,
    estimatedCostUSD: totalCost.toFixed(4),
    note: "Approximate cost per request",
  };
}
