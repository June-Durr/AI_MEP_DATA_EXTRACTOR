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

    // COMPREHENSIVE PROMPT WITH JSON-ONLY ENFORCEMENT AND SERIAL NUMBER DECODING
    const comprehensivePrompt = `You are an expert MEP engineer analyzing an HVAC equipment nameplate. Extract ALL visible information and return it in the exact JSON format below.

CRITICAL: Your response must be ONLY valid JSON with no additional text before or after. Do not include explanations, markdown code blocks, or any other text. Start your response with { and end with }.

CRITICAL INSTRUCTIONS:
1. Extract EVERY field you can see on the nameplate
2. For fields that are worn/damaged/illegible: use "Not legible"
3. For fields that are completely missing from the nameplate: use "Not Available"
4. NEVER leave any field as null - always use either the actual value, "Not legible", or "Not Available"
5. **SERIAL NUMBER DECODING - CRITICAL**: Decode the serial number to determine manufacturing year and calculate current age. Each manufacturer has a different format:

   **CARRIER / BRYANT / PAYNE:**
   - Format: 4 digits + letters/numbers (e.g., 5210XXXXXX)
   - First 2 digits = year (52 = 2002, 03 = 2003, 13 = 2013, 21 = 2021)
   - 3rd & 4th digits = week of manufacture
   - If year < 24, add 2000 (e.g., 03 = 2003, 21 = 2021)
   - If year >= 24, could be 1924 (very old) or 2024+ (recent)
   - Examples: "5210" = week 10 of 2002, "1352" = week 52 of 2013

   **LENNOX:**
   - Format: YYWWXXXXXX (10 digits, e.g., 5608D05236)
   - First 2 digits YY = year (56 = 2006, 08 = 2008, 15 = 2015)
   - Next 2 digits WW = week (01-52)
   - If YY < 24, year = 2000 + YY (e.g., 06 = 2006, 15 = 2015)
   - If YY >= 24, year = 1900 + YY (e.g., 56 = 1956) UNLESS recent unit
   - For modern units: 56-99 likely means 1956-1999, 00-24 means 2000-2024
   - Examples: "5608" = week 8 of 2006, "1552" = week 52 of 2015

   **TRANE / AMERICAN STANDARD:**
   - Format varies by age
   - Older units (pre-2002): Serial starts with letter, then numbers
   - Newer units (2002+): 9-10 digit format
   - Post-2010: Often starts with year code (e.g., 3 = 2013, 4 = 2014, 5 = 2015, 6 = 2016)
   - Example: "5082M12345" likely 2015, week 82 is invalid so week 08 year 2015

   **YORK / COLEMAN / LUXAIRE:**
   - Format: ABCDEFGHIJ (letter-based encoding)
   - Year code: A=2004, B=2005, C=2006, D=2007, E=2008, F=2009, G=2010, H=2011, J=2012, K=2013, L=2014, M=2015, N=2016, P=2017, R=2018, S=2019, T=2020, U=2021, V=2022, W=2023, X=2024
   - Example: "MCAH123456" = M=2015

   **GOODMAN / AMANA:**
   - Format: 10 digits (YYMMDXXXXX)
   - First 2 digits YY = year (same rules: < 24 = 2000+, >= 50 = 1900+)
   - Next 2 digits MM = month (01-12)
   - Next 1 digit D = decade code (sometimes)
   - Examples: "1305123456" = May 2013, "2101234567" = January 2021

   **RHEEM / RUUD:**
   - Format varies
   - Often month-year codes in middle of serial
   - Letters can indicate year (A=2002, B=2003, etc.)
   - Example: "M051234567" where M=month code, 05=year 2005

   **GENERAL DECODING RULES:**
   - If serial format doesn't match known patterns: use "Not legible" for year and age
   - Current year for age calculation: 2025
   - Age = 2025 - manufacturing year
   - If you identify year as 2006, age = 19 years
   - If you identify year as 2015, age = 10 years

6. For electrical specs, look for MCA, MOCP, RLA, LRA labels
7. Return confidence level for each major section
8. **COOLING TONNAGE - CRITICAL**: This is the COOLING CAPACITY, NOT the unit weight:
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
   - Format output as: "5 tons", "10 tons", "15 tons", or "Not legible" or "Not Available"

RETURN THIS EXACT JSON STRUCTURE (NO OTHER TEXT):
{
  "systemType": {
    "category": "Packaged Roof Top Unit" or "Split System" or "Other" or "Not Available",
    "configuration": "Electric Cooling / Gas Heat" or "Electric Cooling / Electric Heat" or "Electric Cooling / Heat Pump" or "Electric Cooling / No Heat" or "Not Available",
    "confidence": "high" or "medium" or "low"
  },
  "basicInfo": {
    "manufacturer": "string or 'Not legible' or 'Not Available'",
    "model": "string or 'Not legible' or 'Not Available'",
    "serialNumber": "string or 'Not legible' or 'Not Available'",
    "manufacturingYear": "string or 'Not legible' or 'Not Available'",
    "currentAge": "string or 'Not Available'",
    "condition": "based on nameplate condition - Good/Fair/Poor or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "electrical": {
    "disconnectSize": "string or 'Not legible' or 'Not Available'",
    "fuseSize": "string or 'Not legible' or 'Not Available'",
    "voltage": "string or 'Not legible' or 'Not Available'",
    "phase": "1" or "3" or "Not legible" or "Not Available",
    "kw": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "compressor1": {
    "quantity": "string or 'Not legible' or 'Not Available'",
    "volts": "string or 'Not legible' or 'Not Available'",
    "phase": "1" or "3" or "Not legible" or "Not Available",
    "rla": "string or 'Not legible' or 'Not Available'",
    "lra": "string or 'Not legible' or 'Not Available'",
    "mca": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "compressor2": {
    "quantity": "string or 'Not legible' or 'Not Available'",
    "volts": "string or 'Not legible' or 'Not Available'",
    "phase": "1" or "3" or "Not legible" or "Not Available",
    "rla": "string or 'Not legible' or 'Not Available'",
    "lra": "string or 'Not legible' or 'Not Available'",
    "mocp": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "condenserFanMotor": {
    "quantity": "string or 'Not legible' or 'Not Available'",
    "volts": "string or 'Not legible' or 'Not Available'",
    "phase": "1" or "3" or "Not legible" or "Not Available",
    "fla": "string or 'Not legible' or 'Not Available'",
    "hp": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "indoorFanMotor": {
    "quantity": "string or 'Not legible' or 'Not Available'",
    "volts": "string or 'Not legible' or 'Not Available'",
    "phase": "1" or "3" or "Not legible" or "Not Available",
    "fla": "string or 'Not legible' or 'Not Available'",
    "hp": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "gasInformation": {
    "gasType": "Natural Gas" or "Propane" or "Not legible" or "Not Available",
    "inputMinBTU": "string or 'Not legible' or 'Not Available'",
    "inputMaxBTU": "string or 'Not legible' or 'Not Available'",
    "outputCapacityBTU": "string or 'Not legible' or 'Not Available'",
    "gasPipeSize": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "cooling": {
    "tonnage": "string - COOLING CAPACITY ONLY (e.g. '5 tons', '10 tons', '15 tons') or 'Not legible' or 'Not Available'. Calculate from BTU/hr or model number. NEVER use unit weight.",
    "refrigerant": "string or 'Not legible' or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "serviceLife": {
    "assessment": "Within service life (0-15 years)" or "BEYOND SERVICE LIFE (15+ years)" or "Unable to determine",
    "recommendation": "Reuse" or "Replace" or "Further evaluation needed",
    "ashrae_standard": "ASHRAE median service life for RTU: 15 years"
  },
  "warnings": [
    "list any safety concerns, illegible fields, or critical issues - if the nameplate is worn or damaged, include specific fields that are illegible"
  ],
  "overallConfidence": "high" or "medium" or "low"
}

EXAMPLE FOR LENNOX LCA120H2RN1Y, Serial 5608D05236:
- Manufacturer: Lennox
- Serial 5608 = Year 2006 (56 = 06, 08 = week 8)
- manufacturingYear: "2006"
- currentAge: "19"
- Age = 2025 - 2006 = 19 years
- Model LCA120 = 10 tons (120 MBH / 12 = 10 tons)
- Status: BEYOND SERVICE LIFE

EXAMPLE FOR CARRIER, Serial 5210ABCDEF:
- Manufacturer: Carrier
- Serial 5210 = Year 2002 (52 = 02), week 10
- manufacturingYear: "2002"
- currentAge: "23"
- Age = 2025 - 2002 = 23 years
- Status: BEYOND SERVICE LIFE

EXAMPLE FOR YORK, Serial MCAH123456:
- Manufacturer: York
- Serial MCAH = M = 2015
- manufacturingYear: "2015"
- currentAge: "10"
- Age = 2025 - 2015 = 10 years
- Status: Within service life

EXAMPLE FOR GOODMAN, Serial 1305123456:
- Manufacturer: Goodman
- Serial 1305 = Year 2013 (13), month 05 (May)
- manufacturingYear: "2013"
- currentAge: "12"
- Age = 2025 - 2013 = 12 years
- Status: Within service life

Extract all visible information now. Apply the serial number decoding rules based on the manufacturer you identify. RETURN ONLY JSON, NO OTHER TEXT.`;

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
