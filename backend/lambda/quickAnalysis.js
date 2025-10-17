// backend/lambda/quickAnalysis.js - COMPLETE FIXED VERSION
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

    // COMPREHENSIVE PROMPT WITH JSON-ONLY ENFORCEMENT
    const comprehensivePrompt = `You are an expert MEP engineer analyzing an HVAC equipment nameplate. Extract ALL visible information and return it in the exact JSON format below.

CRITICAL: Your response must be ONLY valid JSON with no additional text before or after. Do not include explanations, markdown code blocks, or any other text. Start your response with { and end with }.

CRITICAL INSTRUCTIONS:
1. Extract EVERY field you can see on the nameplate
2. For Lennox serial numbers (format YYWWXXXXXX): YY = year, WW = week
   - Decode the year: if YY = 56, that's 2006; if YY = 08, that's 2008
   - Calculate age: 2025 - manufacturing year
3. Leave fields as null if not visible
4. For electrical specs, look for MCA, MOCP, RLA, LRA labels
5. Return confidence level for each major section
6. **COOLING TONNAGE - CRITICAL**: This is the COOLING CAPACITY, NOT the unit weight:
   - Look for labels: "COOLING CAPACITY", "TONS", "TON", "BTU/H", "MBH"
   - Common conversions: 
     * 60,000 BTU/hr = 5 tons
     * 120,000 BTU/hr (or 120 MBH) = 10 tons
     * 180,000 BTU/hr (or 180 MBH) = 15 tons
   - Model number clues:
     * ZCA060xxx = 5 tons (060 = 60,000 BTU/hr)
     * LGA180xxx = 15 tons (180 = 180,000 BTU/hr)
     * LCA120xxx = 10 tons (120 = 120,000 BTU/hr)
   - NEVER report shipping weight (e.g., "5 LBS 6 OZ") as tonnage
   - NEVER report refrigerant charge weight as tonnage
   - Format output as: "5 tons", "10 tons", "15 tons"

RETURN THIS EXACT JSON STRUCTURE (NO OTHER TEXT):
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
    "tonnage": "string - COOLING CAPACITY ONLY (e.g. '5 tons', '10 tons', '15 tons'). Calculate from BTU/hr or model number. NEVER use unit weight.",
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

EXAMPLE FOR LENNOX ZCA06054BN1Y, Serial 0608xxxxx:
- Serial 0608 = Year 2006, week 8
- Age = 2025 - 2006 = 19 years  
- Model ZCA060 = 5 tons (060 = 60,000 BTU/hr / 12,000 = 5 tons)
- Status: BEYOND SERVICE LIFE

Extract all visible information now. RETURN ONLY JSON, NO OTHER TEXT.`;

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
          max_tokens: 2000,
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

      // Try to find JSON in the response (handle extra text before/after)
      let jsonStr = textContent;

      // Look for JSON object boundaries
      const jsonStart = textContent.indexOf("{");
      const jsonEnd = textContent.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = textContent.substring(jsonStart, jsonEnd + 1);
      }

      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.log("JSON parse error, attempting to clean response:", e);

      // Try one more time with more aggressive cleaning
      try {
        const textContent = result.content?.[0]?.text || "{}";

        // Remove markdown code blocks if present
        let cleaned = textContent
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");

        // Find the first { and last }
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
          parsedData = JSON.parse(cleaned);
        } else {
          throw new Error("No valid JSON found");
        }
      } catch (e2) {
        console.log("Still failed to parse, returning error:", e2);
        parsedData = {
          error: "Could not parse AI response",
          rawResponse: result.content?.[0]?.text,
          parseError: e2.message,
        };
      }
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
