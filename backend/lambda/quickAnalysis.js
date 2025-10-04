// backend/lambda/quickAnalysis.js - COMPREHENSIVE VERSION
const AWS = require("aws-sdk");
const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

exports.handler = async (event) => {
  console.log("=== LAMBDA STARTED ===");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS OK" }),
    };
  }

  try {
    let body = JSON.parse(event.body);
    const { imageBase64, equipmentType } = body;

    // COMPREHENSIVE PROMPT FOR HVAC EQUIPMENT
    const comprehensivePrompt = `You are an expert MEP engineer analyzing an HVAC equipment nameplate. Extract ALL visible information and return it in the exact JSON format below.

CRITICAL INSTRUCTIONS:
1. Extract EVERY field you can see on the nameplate
2. For Lennox serial numbers (format YYWWXXXXXX): YY = year, WW = week
   - Decode the year: if YY = 56, that's 2006; if YY = 08, that's 2008
   - Calculate age: 2025 - manufacturing year
3. Leave fields as null if not visible
4. For electrical specs, look for MCA, MOCP, RLA, LRA labels
5. Return confidence level for each major section

RETURN THIS EXACT JSON STRUCTURE:
{
  "systemType": {
    "category": "Packaged Roof Top Unit" or "Split System" or "Other",
    "configuration": "Electric Cooling / Gas Heat" or "Electric Cooling / Electric Heat" or "Electric Cooling / Heat Pump" or "Electric Cooling / No Heat",
    "confidence": "high" or "medium" or "low"
  },
  "basicInfo": {
    "manufacturer": "string or null",
    "model": "string or null",
    "serialNumber": "string or null",
    "manufacturingYear": number or null,
    "currentAge": number or null,
    "condition": "based on nameplate condition - Good/Fair/Poor",
    "confidence": "high" or "medium" or "low"
  },
  "electrical": {
    "disconnectSize": "string or null",
    "fuseSize": "string or null",
    "voltage": "string or null",
    "phase": "1" or "3" or null,
    "kw": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "compressor1": {
    "quantity": number or null,
    "volts": "string or null",
    "phase": "1" or "3" or null,
    "rla": "string or null",
    "lra": "string or null",
    "mca": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "compressor2": {
    "quantity": number or null,
    "volts": "string or null",
    "phase": "1" or "3" or null,
    "rla": "string or null",
    "lra": "string or null",
    "mocp": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "condenserFanMotor": {
    "quantity": number or null,
    "volts": "string or null",
    "phase": "1" or "3" or null,
    "fla": "string or null",
    "hp": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "indoorFanMotor": {
    "quantity": number or null,
    "volts": "string or null",
    "phase": "1" or "3" or null,
    "fla": "string or null",
    "hp": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "gasInformation": {
    "gasType": "Natural Gas" or "Propane" or null,
    "inputMinBTU": "string or null",
    "inputMaxBTU": "string or null",
    "outputCapacityBTU": "string or null",
    "gasPipeSize": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "cooling": {
    "tonnage": "string or null (calculate from model if possible)",
    "refrigerant": "string or null",
    "confidence": "high" or "medium" or "low"
  },
  "serviceLife": {
    "assessment": "Within service life (0-15 years)" or "BEYOND SERVICE LIFE (15+ years)" or "Unable to determine",
    "recommendation": "Reuse" or "Replace" or "Further evaluation needed",
    "ashrae_standard": "ASHRAE median service life for RTU: 15 years"
  },
  "warnings": [
    "list any safety concerns, illegible fields, or critical issues"
  ],
  "overallConfidence": "high" or "medium" or "low"
}

EXAMPLE FOR LENNOX LCA120H2RN1Y, Serial 5608D05236:
- Serial 5608 = Year 2006 (56 = 06, 08 = week 8)
- Age = 2025 - 2006 = 19 years
- Model LCA120 = 10 tons (120 MBH / 12 = 10 tons)
- Status: BEYOND SERVICE LIFE

Extract all visible information now.`;

    console.log("Calling Claude with comprehensive prompt...");

    const content = [];

    if (imageBase64 === "test") {
      content.push({
        type: "text",
        text: "This is a test. Respond with 'Lambda is working!'",
      });
    } else {
      content.push({
        type: "text",
        text: comprehensivePrompt,
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
          max_tokens: 2000, // INCREASED for comprehensive response
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

    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log("✓ Bedrock responded");

    let parsedData;
    try {
      // Extract JSON from Claude's response
      const textContent = result.content?.[0]?.text || "{}";
      parsedData = JSON.parse(textContent);
    } catch (e) {
      console.log("JSON parse error, returning raw:", e);
      parsedData = {
        error: "Could not parse AI response",
        rawResponse: result.content?.[0]?.text,
      };
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        success: true,
        message: "Complete analysis finished",
        data: parsedData,
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
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
