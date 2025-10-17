// backend/lambda/quickAnalysis.js - COMPREHENSIVE VERSION WITH NOT LEGIBLE HANDLING
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

    // COMPREHENSIVE PROMPT FOR HVAC EQUIPMENT WITH NOT LEGIBLE HANDLING
    const comprehensivePrompt = `You are an expert MEP engineer analyzing an HVAC equipment nameplate. Extract ALL visible information and return it in the exact JSON format below.

CRITICAL INSTRUCTIONS:
1. Extract EVERY field you can see on the nameplate
2. If text is worn, faded, or illegible, return "Not Legible" for that field
3. If a field/label is not present on the nameplate at all, return "Not Available"
4. If you can see a label (like "COMPRESSOR") but the values are worn off, return "Not Legible"
5. For Lennox serial numbers (format YYWWXXXXXX): YY = year, WW = week
   - Decode the year: if YY = 56, that's 2006; if YY = 08, that's 2008; if YY = 17, that's 2017
   - Calculate age: 2025 - manufacturing year
6. Return confidence level for each major section based on legibility
7. Add warnings for any illegible critical fields

RETURN THIS EXACT JSON STRUCTURE (ALL FIELDS MUST BE INCLUDED):
{
  "systemType": {
    "category": "Packaged Roof Top Unit" or "Split System" or "Other" or "Not Available",
    "configuration": "Electric Cooling / Gas Heat" or "Electric Cooling / Electric Heat" or "Electric Cooling / Heat Pump" or "Electric Cooling / No Heat" or "Not Available",
    "confidence": "high" or "medium" or "low"
  },
  "basicInfo": {
    "manufacturer": "string or 'Not Legible' or 'Not Available'",
    "model": "string or 'Not Legible' or 'Not Available'",
    "serialNumber": "string or 'Not Legible' or 'Not Available'",
    "manufacturingYear": number or null,
    "currentAge": number or null,
    "condition": "Good" or "Fair" or "Poor" (based on nameplate legibility),
    "confidence": "high" or "medium" or "low"
  },
  "electrical": {
    "disconnectSize": "string or 'Not Legible' or 'Not Available'",
    "fuseSize": "string or 'Not Legible' or 'Not Available'",
    "voltage": "string or 'Not Legible' or 'Not Available'",
    "phase": "1" or "3" or "Not Legible" or "Not Available",
    "kw": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "compressor1": {
    "quantity": number or "Not Legible" or "Not Available",
    "volts": "string or 'Not Legible' or 'Not Available'",
    "phase": "1" or "3" or "Not Legible" or "Not Available",
    "rla": "string or 'Not Legible' or 'Not Available'",
    "lra": "string or 'Not Legible' or 'Not Available'",
    "mca": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "compressor2": {
    "quantity": number or "Not Legible" or "Not Available",
    "volts": "string or 'Not Legible' or 'Not Available'",
    "phase": "1" or "3" or "Not Legible" or "Not Available",
    "rla": "string or 'Not Legible' or 'Not Available'",
    "lra": "string or 'Not Legible' or 'Not Available'",
    "mocp": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "condenserFanMotor": {
    "quantity": number or "Not Legible" or "Not Available",
    "volts": "string or 'Not Legible' or 'Not Available'",
    "phase": "1" or "3" or "Not Legible" or "Not Available",
    "fla": "string or 'Not Legible' or 'Not Available'",
    "hp": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "indoorFanMotor": {
    "quantity": number or "Not Legible" or "Not Available",
    "volts": "string or 'Not Legible' or 'Not Available'",
    "phase": "1" or "3" or "Not Legible" or "Not Available",
    "fla": "string or 'Not Legible' or 'Not Available'",
    "hp": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "gasInformation": {
    "gasType": "Natural Gas" or "Propane" or "Not Legible" or "Not Available",
    "inputMinBTU": "string or 'Not Legible' or 'Not Available'",
    "inputMaxBTU": "string or 'Not Legible' or 'Not Available'",
    "outputCapacityBTU": "string or 'Not Legible' or 'Not Available'",
    "gasPipeSize": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "cooling": {
    "tonnage": "string or 'Not Legible' or 'Not Available' (calculate from model if possible)",
    "refrigerant": "string or 'Not Legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "serviceLife": {
    "assessment": "Within service life (0-15 years)" or "BEYOND SERVICE LIFE (15+ years)" or "Unable to determine",
    "recommendation": "Reuse" or "Replace" or "Further evaluation needed",
    "ashrae_standard": "ASHRAE median service life for RTU: 15 years"
  },
  "warnings": [
    "list any safety concerns, illegible critical fields, or issues"
  ],
  "overallConfidence": "high" or "medium" or "low"
}

IMPORTANT EXAMPLES:
- If you see "COMPRESSOR" label but the RLA/LRA values are worn: return "Not Legible" for those values
- If the entire electrical section is missing from nameplate: return "Not Available" for all electrical fields
- If manufacturer name is partially visible like "LEN___": still try to identify as "Lennox" if reasonable
- Add warnings like: "Compressor values not legible - manual inspection required"

Extract all visible information now, using "Not Legible" for worn/faded text and "Not Available" for missing fields.`;

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
          max_tokens: 3000, // INCREASED for comprehensive response
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

      // Try to extract JSON from the response if it's wrapped in other text
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : textContent;

      parsedData = JSON.parse(jsonText);

      // Ensure all required fields exist even if Claude missed some
      parsedData = ensureAllFields(parsedData);
    } catch (e) {
      console.log("JSON parse error, returning structured error:", e);
      parsedData = getDefaultStructure();
      parsedData.warnings = [
        "Could not parse AI response - manual inspection required",
      ];
      parsedData.overallConfidence = "low";
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

// Helper function to ensure all fields exist
function ensureAllFields(data) {
  const defaultStructure = getDefaultStructure();

  // Merge the extracted data with default structure
  const mergedData = {
    systemType: { ...defaultStructure.systemType, ...data.systemType },
    basicInfo: { ...defaultStructure.basicInfo, ...data.basicInfo },
    electrical: { ...defaultStructure.electrical, ...data.electrical },
    compressor1: { ...defaultStructure.compressor1, ...data.compressor1 },
    compressor2: { ...defaultStructure.compressor2, ...data.compressor2 },
    condenserFanMotor: {
      ...defaultStructure.condenserFanMotor,
      ...data.condenserFanMotor,
    },
    indoorFanMotor: {
      ...defaultStructure.indoorFanMotor,
      ...data.indoorFanMotor,
    },
    gasInformation: {
      ...defaultStructure.gasInformation,
      ...data.gasInformation,
    },
    cooling: { ...defaultStructure.cooling, ...data.cooling },
    serviceLife: { ...defaultStructure.serviceLife, ...data.serviceLife },
    warnings: data.warnings || defaultStructure.warnings,
    overallConfidence: data.overallConfidence || "low",
  };

  return mergedData;
}

// Helper function to get default structure
function getDefaultStructure() {
  return {
    systemType: {
      category: "Not Available",
      configuration: "Not Available",
      confidence: "low",
    },
    basicInfo: {
      manufacturer: "Not Available",
      model: "Not Available",
      serialNumber: "Not Available",
      manufacturingYear: null,
      currentAge: null,
      condition: "Poor",
      confidence: "low",
    },
    electrical: {
      disconnectSize: "Not Available",
      fuseSize: "Not Available",
      voltage: "Not Available",
      phase: "Not Available",
      kw: "Not Available",
      confidence: "low",
    },
    compressor1: {
      quantity: "Not Available",
      volts: "Not Available",
      phase: "Not Available",
      rla: "Not Available",
      lra: "Not Available",
      mca: "Not Available",
      confidence: "low",
    },
    compressor2: {
      quantity: "Not Available",
      volts: "Not Available",
      phase: "Not Available",
      rla: "Not Available",
      lra: "Not Available",
      mocp: "Not Available",
      confidence: "low",
    },
    condenserFanMotor: {
      quantity: "Not Available",
      volts: "Not Available",
      phase: "Not Available",
      fla: "Not Available",
      hp: "Not Available",
      confidence: "low",
    },
    indoorFanMotor: {
      quantity: "Not Available",
      volts: "Not Available",
      phase: "Not Available",
      fla: "Not Available",
      hp: "Not Available",
      confidence: "low",
    },
    gasInformation: {
      gasType: "Not Available",
      inputMinBTU: "Not Available",
      inputMaxBTU: "Not Available",
      outputCapacityBTU: "Not Available",
      gasPipeSize: "Not Available",
      confidence: "low",
    },
    cooling: {
      tonnage: "Not Available",
      refrigerant: "Not Available",
      confidence: "low",
    },
    serviceLife: {
      assessment: "Unable to determine",
      recommendation: "Further evaluation needed",
      ashrae_standard: "ASHRAE median service life for RTU: 15 years",
    },
    warnings: ["Complete nameplate analysis not possible"],
    overallConfidence: "low",
  };
}
