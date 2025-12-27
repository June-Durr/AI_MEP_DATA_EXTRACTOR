// backend/lambda/quickAnalysis.js - COMPLETE FIXED VERSION
const AWS = require("aws-sdk");
const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });
const fs = require("fs");
const path = require("path");

// Try to load sharp, but don't fail if it's not available
let sharp = null;
try {
  sharp = require("sharp");
  console.log("✓ Sharp library loaded successfully");
} catch (error) {
  console.warn("⚠ Sharp library not available, image enhancement will be skipped:", error.message);
}

/**
 * Preprocesses an image to improve OCR accuracy
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Enhanced base64 image
 */
async function enhanceImageForOCR(base64Image) {
  // If sharp is not available, return original image
  if (!sharp) {
    console.log("Sharp not available, skipping image enhancement");
    return base64Image;
  }

  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Apply image enhancements:
    // 1. Resize if too small (upscale to at least 1500px width for better OCR)
    // 2. Increase sharpness
    // 3. Increase contrast
    // 4. Normalize (auto-levels)
    const enhanced = await sharp(imageBuffer)
      .resize(2000, null, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false, // Allow upscaling
        fit: 'inside'
      })
      .sharpen({ sigma: 1.5 }) // Sharpen edges
      .normalize() // Auto-adjust levels
      .modulate({
        brightness: 1.1, // Slightly increase brightness
        contrast: 1.2    // Increase contrast
      })
      .jpeg({ quality: 95 }) // High quality output
      .toBuffer();

    // Convert back to base64
    return enhanced.toString('base64');
  } catch (error) {
    console.error("Image enhancement failed, using original:", error.message);
    // If enhancement fails, return original image
    return base64Image;
  }
}

/**
 * Load reference images for few-shot learning
 * These are the marked-up images that show Claude exactly where to find information
 */
function loadReferenceImages() {
  const references = {
    electricRtu: null,
    gasRtu: null,
    fuseDisconnect: null
  };

  try {
    // Try two locations: Lambda deployment directory and local development directory
    const refPaths = [
      __dirname, // Lambda deployment (images in same dir as function)
      path.join(__dirname, '..', 'reference-images') // Local development
    ];

    for (const refPath of refPaths) {
      const electricPath = path.join(refPath, 'electric-rtu-reference.jpg.png');
      const gasPath = path.join(refPath, 'gas-rtu-reference.jpg.png');
      const fusePath = path.join(refPath, 'fuse-disconnect-reference.jpg.png');

      if (fs.existsSync(electricPath) && !references.electricRtu) {
        references.electricRtu = fs.readFileSync(electricPath).toString('base64');
        console.log('✓ Loaded electric RTU reference image from', refPath);
      }

      if (fs.existsSync(gasPath) && !references.gasRtu) {
        references.gasRtu = fs.readFileSync(gasPath).toString('base64');
        console.log('✓ Loaded gas RTU reference image from', refPath);
      }

      if (fs.existsSync(fusePath) && !references.fuseDisconnect) {
        references.fuseDisconnect = fs.readFileSync(fusePath).toString('base64');
        console.log('✓ Loaded fuse disconnect reference image from', refPath);
      }

      // If all loaded, break early
      if (references.electricRtu && references.gasRtu && references.fuseDisconnect) {
        break;
      }
    }

    if (!references.electricRtu || !references.gasRtu || !references.fuseDisconnect) {
      console.warn('⚠ Some reference images not loaded - extraction accuracy may be reduced');
    }
  } catch (error) {
    console.error('Error loading reference images:', error.message);
  }

  return references;
}

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
    const { imageBase64, images, equipmentType } = body;

    // Support both single image (imageBase64) and multiple images (images array)
    const imagesToAnalyze = images && images.length > 0 ? images : [imageBase64];

    console.log(`Equipment type: ${equipmentType}`);
    console.log(`Number of images to analyze: ${imagesToAnalyze.length}`);

    // Initialize variables
    let referenceImages = { electricRtu: null, gasRtu: null, fuseDisconnect: null };
    let enhancedImages = imagesToAnalyze;

    // Skip processing if this is a test request
    if (imagesToAnalyze[0] === "test") {
      // Test mode - return success immediately without calling Bedrock
      console.log('Test mode detected - returning test response');
      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
          success: true,
          message: "Test mode - Lambda is functioning correctly",
          test: true,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Load reference images for training (optional, non-blocking)
    try {
      console.log('Loading reference images...');
      referenceImages = loadReferenceImages();
      console.log('✓ Reference images loaded');
    } catch (error) {
      console.error('Failed to load reference images, continuing without them:', error.message);
    }

    // Enhance all images for better OCR
    console.log('Enhancing images for better OCR...');
    enhancedImages = await Promise.all(
      imagesToAnalyze.map(img => enhanceImageForOCR(img))
    );
    console.log('✓ Image enhancement completed');

    // COMPREHENSIVE PROMPT WITH VISUAL REFERENCE TRAINING
    const comprehensivePrompt = `You are an expert MEP engineer analyzing an HVAC equipment nameplate. You have been trained on reference images that show EXACTLY where each field is located on RTU nameplates.

CRITICAL: Your response must be ONLY valid JSON with no additional text before or after. Do not include explanations, markdown code blocks, or any other text. Start your response with { and end with }.

IMPORTANT: The images you receive have been preprocessed and enhanced (sharpened, contrast-adjusted, upscaled) to improve readability.

**VISUAL REFERENCE TRAINING - YOU HAVE BEEN SHOWN THESE LABELED EXAMPLES:**

Before this nameplate image, you were shown marked-up reference images with colored clouds/boxes showing:

**ELECTRIC RTU REFERENCE (Cloud Labels):**
- Cloud #1 - Compressor Section (TOP ROW): Extract Compressor #1 data from top row #1 (COMP A): Voltage, Phase, RLA, LRA
- Cloud #2 - Compressor #2 (COMP B): Extract from bottom row #2: Voltage, Phase, RLA, LRA
- Cloud #3 - Outdoor Fan Motor (row labeled "FAN MTR OUTDOOR" or "OUTDOOR FAN"): Extract Quantity, Volts, Phase, FLA, HP (if visible)
- Cloud #4 - Electrical Information: Extract Voltage, Phase, Fuse Size from MCA/MOCP section
- NOTE: Electric RTU has NO gas heating, so leave all gas fields as "Not Available"

**GAS RTU REFERENCE (Cloud Labels):**
- Cloud #1 - Compressor Section: Same as electric RTU
- Cloud #2 - Compressor #2: Same as electric RTU
- Cloud #3 - Outdoor Fan Motor (row = "FAN MTR OUTDOOR" or "OUTDOOR"): Extract Quantity, Volts, Phase, FLA, HP (if visible) → condenserFanMotor
- Cloud #4 - Gas Information (GAS HEATING section): Extract Gas Input Min, Gas Input Max, Output Capacity from gas heating section
- Cloud #5 - Combustion Fan Motor (row = "COMBUST" or "COMBUSTION FAN"): Extract Quantity, Volts, Phase, FLA, HP (if visible) → combustionFanMotor (ONLY for Gas RTUs)
- NOTE: Gas RTU has THREE fan motors: OUTDOOR (condenser), INDOOR (blower), and COMBUST (combustion)
- Cloud #6 - Indoor Fan Motor (row = "INDOOR" or "FAN MTR INDOOR"): Extract Quantity, Volts, Phase, FLA, HP (if visible) → indoorFanMotor
- Cloud #7 - Electrical Information: Extract Voltage, Phase, Fuse Size from MCA/MOCP section
- NOTE: Gas RTU has gas heating information - MUST extract all gas fields AND combustion fan motor data

**FUSE SIZE EXTRACTION RULE - CRITICAL:**
- If user provides a photo of fuses in disconnect box, READ THE FUSE LABELS directly
- Fuse format: Single fuse = just rating (e.g., "35"), Multiple fuses = rating/quantity (e.g., "35/3")
- The fuse photo overrides any fuse size on the nameplate
- Always use actual fuse amperage from disconnect, NOT the MOCP value on nameplate

FEW-SHOT EXAMPLES based on reference images:

EXAMPLE 1 - Carrier Packaged Unit:
If you see a nameplate with:
- Large logo "CARRIER"
- Model: 50TCA06A2A5A0A0A0
- Serial: 1315A12345
- A table with rows labeled "COMP A", "FAN MTR OUTDOOR", etc.
- Voltage line showing "208/230" and "3" for phase
- Bottom text: "MCA: 31.0  MOCP: 40"

You should extract:
- manufacturer: "Carrier"
- model: "50TCA06A2A5A0A0A0"
- serialNumber: "1315A12345"
- manufacturingYear: "2013" (13 from serial = 2013)
- currentAge: "12" (2025 - 2013)
- cooling.tonnage: "5 tons" (Model contains 06 = 60,000 BTU = 5 tons)
- electrical.phase: "3"
- compressor1.rla: Read from COMP A row, RLA column
- compressor1.lra: Read from COMP A row, LRA column

EXAMPLE 2 - Lennox with worn nameplate:
If you see:
- Faded "LENNOX" text
- Model starts with "LCA" but rest is illegible: "LCA1__H___"
- Serial clearly shows: "5608D05236"
- Some table rows are worn/unreadable

You should extract:
- manufacturer: "Lennox"
- model: "Not legible" (because you can't read full model)
- serialNumber: "5608D05236"
- manufacturingYear: "2006" (56 in Lennox format = 2006)
- currentAge: "19"
- For any worn table cells: "Not legible"

EXAMPLE 3 - Character confusion prevention:
Common OCR errors to AVOID:
- "0" (zero) vs "O" (letter) vs "D":
  * "5D10" should be "5010" if it's a serial number (zeros not letter D)
  * "MODE1" should be "MODEL" (letter O not zero)
- "8" vs "6" vs "B":
  * "RLA: 1B.0" should be "RLA: 18.0" (number 8 not letter B)
  * Look for the double loop in "8"
- "1" vs "7" vs "I":
  * Serial "7315" not "1315" - check for the horizontal top on "7"

When you see these ambiguous characters, use context:
- In numeric fields (RLA, LRA, voltage): use numbers not letters
- In model numbers: could be either - verify with surrounding characters
- In serial numbers: check manufacturer format (some use letters, some don't)

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

6. **CARRIER/BRYANT NAMEPLATE TABLE STRUCTURE - CRITICAL FOR ACCURATE EXTRACTION**:
   Most HVAC nameplates have a TABLE with rows. Read each row carefully:

   **ROW 1: COMP A** (Compressor A):
   - Columns: QTY | VOLTS AC | PH | HZ | RLA | LRA | REF SYSTEM
   - Example: "1 | 208/230 | 3 | 60 | 16.0 | 110 | R-410A"
   - Extract RLA (Rated Load Amps) → compressor1.rla
   - Extract LRA (Locked Rotor Amps) → compressor1.lra
   - Extract VOLTS → compressor1.volts
   - Extract PH (Phase) → compressor1.phase

   **ROW 2: COMP B** (Compressor B - if dual compressor):
   - Same structure as COMP A
   - Extract to compressor2 fields
   - If row is empty/absent, use "Not Available" for all compressor2 fields

   **ROW 3-5: FAN MOTORS - CRITICAL - EXTRACT ALL FIELDS**:
   - "FAN MTR OUTDOOR" or "OUTDOOR" → condenserFanMotor object (present on ALL RTUs)
   - "FAN MTR INDOOR" or "INDOOR" → indoorFanMotor object (present on ALL RTUs)
   - "COMBUST" or "COMBUSTION FAN" → combustionFanMotor object (ONLY on GAS RTUs - leave as "Not Available" for electric RTUs)
   - MUST extract: Quantity (QTY), Volts, Phase (PH), FLA (Full Load Amps), HP (if visible)
   - ALL of these fields should be visible on the nameplate - extract every one
   - NOTE: Gas RTUs have 3 fan motors (OUTDOOR, INDOOR, COMBUST). Electric RTUs have only 2 (OUTDOOR, INDOOR)

   **IMPORTANT - PHASE EXTRACTION**:
   - Unit phase comes from "POWER SUPPLY" row (typically 3-phase)
   - Compressor phase comes from COMP A/B row (usually 3-phase)
   - Fan motor phase comes from FAN MTR rows (often 1-phase)
   - Do NOT mix these up - each component has its own phase

7. **OCR ACCURACY - CHARACTER RECOGNITION**:
   Common character confusions to avoid:
   - '0' (ZERO) vs 'D': Zero is round, D has a straight left edge
   - '0' (ZERO) vs 'O' (letter): Zero is narrower
   - '6' vs '8': 8 has TWO loops (figure-eight), 6 has ONE loop
   - '1' vs '4' vs '7': Verify the shape carefully
   If ANY character is unclear, mark the ENTIRE field as "Not legible"

8. For electrical specs, look for MCA, MOCP labels below the main table
9. Return confidence level for each major section
10. **COOLING TONNAGE - CRITICAL**: This is the COOLING CAPACITY, NOT the unit weight:
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
  "combustionFanMotor": {
    "quantity": "string or 'Not legible' or 'Not Available'",
    "volts": "string or 'Not legible' or 'Not Available'",
    "phase": "1" or "3" or "Not legible" or 'Not Available'",
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

    // ELECTRICAL PANEL PROMPT - REALISTIC NAMEPLATE EXTRACTION ONLY
    const electricalPanelPrompt = `You are an expert electrical engineer analyzing an electrical panel nameplate. Extract ONLY what is clearly visible on the nameplate - be realistic about what can be read from a photo.

CRITICAL: Your response must be ONLY valid JSON with no additional text before or after. Do not include explanations, markdown code blocks, or any other text. Start your response with { and end with }.

IMPORTANT: The images you receive have been preprocessed and enhanced (sharpened, contrast-adjusted, upscaled) to improve readability. Text should be clearer than typical nameplate photos.

FEW-SHOT EXAMPLES - Learn from these real panel nameplate extractions:

EXAMPLE 1 - Square D Panel (clear nameplate):
If you see:
- Large "Square D" logo
- Model clearly visible: "NQOD442L225G"
- Text: "120/208V 3Ø 4W"
- "BUS: 400A"
- "42 CIRCUITS"

You should extract:
- manufacturer: "Square D"
- model: "NQOD442L225G"
- voltage: "120/208V"
- phase: "3-phase"
- wireConfig: "4-wire"
- busRating: "400A"
- poleSpaces: "42"

EXAMPLE 2 - Federal Pacific (HAZARD):
If you see:
- "FEDERAL PACIFIC" or "FPE" or "Stab-Lok" text
- Any condition (even if looks fine)

You should extract:
- manufacturer: "Federal Pacific Electric"
- safetyWarnings.isFPE: true
- condition: "Hazardous"
- warnings: ["FEDERAL PACIFIC ELECTRIC PANEL - IMMEDIATE REPLACEMENT REQUIRED", ...]

EXAMPLE 3 - Worn General Electric panel:
If you see:
- Faded "GE" logo
- Model partially visible: "TQ___12"
- Voltage visible: "120/240"
- Can count visible breaker spaces but unclear total

You should extract:
- manufacturer: "General Electric"
- model: "Not legible" (because you can't read full model)
- voltage: "120/240V"
- phase: "1-phase" (from 120/240V configuration)
- poleSpaces: "Not Available" (if you can't count accurately)

CRITICAL INSTRUCTIONS:
1. Extract ONLY information visible on the nameplate - most panels show limited information
2. For fields not visible on nameplate: use "Not Available"
3. For fields that are worn/damaged/illegible: use "Not legible"
4. NEVER leave any field as null - always use either the actual value, "Not legible", or "Not Available"
5. Be realistic - most panel nameplates only show: manufacturer, model, voltage, bus rating, and sometimes main breaker size
6. Physical dimensions (width, depth, height) typically require field measurement - use "Not Available" unless clearly labeled
7. Pole spaces require counting and are often not visible - use "Not Available" unless clearly visible
8. Advanced ratings (fault current, series rating, AIC) are rarely on nameplates - use "Not Available" unless clearly visible

SAFETY WARNINGS - CRITICAL:
- Federal Pacific Electric (FPE): Known fire hazard, IMMEDIATE REPLACEMENT REQUIRED
- Zinsco / GTE-Sylvania: Known fire hazard, IMMEDIATE REPLACEMENT REQUIRED
- Challenger: Fire safety concerns, recommend replacement
- Set appropriate warning flags if these manufacturers are detected

VOLTAGE CONFIGURATION IDENTIFICATION:
Common formats you may see:
- "208Y/120V 3Ø 4W" = 208Y/120V 3-phase 4-wire
- "480Y/277V 3Ø 4W" = 480Y/277V 3-phase 4-wire
- "120/240V 1Ø 3W" = 120/240V 1-phase 3-wire
- "240Δ/120V 3Ø 4W" = 240D/120V 3-phase 4-wire

REALISTICALLY EXTRACTABLE FROM NAMEPLATE PHOTO:
✓ Manufacturer name
✓ Model number
✓ Serial number (sometimes)
✓ Voltage configuration (e.g., 120/208V)
✓ Phase (1-phase or 3-phase)
✓ Bus rating (e.g., 400A)
✓ Main breaker size if visible
✗ Physical dimensions (need measurement)
✗ Exact pole space count (need counting, often illegible)
✗ Fault current ratings (rarely on nameplate)
✗ Panel schedule details (too small to read)
✗ Individual circuit information

RETURN THIS EXACT JSON STRUCTURE (NO OTHER TEXT):
{
  "systemType": {
    "category": "Electrical Distribution Panel",
    "panelType": "Load Center" or "Panelboard" or "Main Distribution Panel" or "Switchboard" or "Not Available",
    "confidence": "high" or "medium" or "low"
  },
  "basicInfo": {
    "manufacturer": "string or 'Not legible' or 'Not Available'",
    "model": "string or 'Not legible' or 'Not Available'",
    "serialNumber": "string or 'Not legible' or 'Not Available'",
    "poleSpaces": "number as string or 'Not Available' - only if clearly visible",
    "condition": "based on panel condition - Good/Fair/Poor/Hazardous or 'Not Available'",
    "confidence": "high" or "medium" or "low"
  },
  "electrical": {
    "voltage": "string (e.g., '120/208V', '480Y/277V') or 'Not legible' or 'Not Available'",
    "phase": "1-phase" or "3-phase" or "Not legible" or "Not Available'",
    "wireConfig": "4-wire" or "3-wire" or "Not legible" or "Not Available'",
    "busRating": "string with A (e.g., '400A', '225A') or 'Not legible' or 'Not Available'",
    "availableFaultCurrent": "string or 'Not Available' - rarely visible on nameplate",
    "seriesRatedCombination": "string or 'Not Available' - rarely visible",
    "lowestBreakerAIC": "string or 'Not Available' - rarely visible",
    "confidence": "high" or "medium" or "low"
  },
  "incomingTermination": {
    "type": "Breaker Main" or "Main Lug Only" or "Not Available",
    "mainBreakerSize": "string with A (e.g., '400A') or 'Not Available' - only if main breaker visible",
    "mainBreakerPoles": "1" or "2" or "3" or "Not Available",
    "confidence": "high" or "medium" or "low"
  },
  "mounting": {
    "type": "Surface" or "Flush" or "Semi-Flush" or "Within Switchboard" or "Not Available",
    "confidence": "low" - usually cannot determine from nameplate alone
  },
  "physicalDimensions": {
    "width": "Not Available - requires field measurement",
    "depth": "Not Available - requires field measurement",
    "height": "Not Available - requires field measurement",
    "note": "Physical dimensions typically require field measurement and are not on nameplates"
  },
  "safetyWarnings": {
    "isFPE": true or false,
    "isZinsco": true or false,
    "isChallenger": true or false,
    "warnings": [
      "array of safety warnings - include IMMEDIATE REPLACEMENT REQUIRED for FPE/Zinsco"
    ]
  },
  "warnings": [
    "list any illegible fields, critical issues, or safety concerns"
  ],
  "overallConfidence": "high" or "medium" or "low"
}

EXAMPLE OUTPUT FOR SQUARE D PANEL:
{
  "systemType": {
    "category": "Electrical Distribution Panel",
    "panelType": "Load Center",
    "confidence": "high"
  },
  "basicInfo": {
    "manufacturer": "Square D",
    "model": "NQOD442L225G",
    "serialNumber": "Not legible",
    "poleSpaces": "42",
    "condition": "Good",
    "confidence": "high"
  },
  "electrical": {
    "voltage": "120/208V",
    "phase": "3-phase",
    "wireConfig": "4-wire",
    "busRating": "400A",
    "availableFaultCurrent": "Not Available",
    "seriesRatedCombination": "Not Available",
    "lowestBreakerAIC": "Not Available",
    "confidence": "high"
  },
  "incomingTermination": {
    "type": "Breaker Main",
    "mainBreakerSize": "400A",
    "mainBreakerPoles": "3",
    "confidence": "high"
  },
  "mounting": {
    "type": "Surface",
    "confidence": "low"
  },
  "physicalDimensions": {
    "width": "Not Available - requires field measurement",
    "depth": "Not Available - requires field measurement",
    "height": "Not Available - requires field measurement",
    "note": "Physical dimensions typically require field measurement and are not on nameplates"
  },
  "safetyWarnings": {
    "isFPE": false,
    "isZinsco": false,
    "isChallenger": false,
    "warnings": []
  },
  "warnings": [
    "Serial number not legible due to wear",
    "Advanced electrical ratings not visible on nameplate"
  ],
  "overallConfidence": "medium"
}

EXAMPLE OUTPUT FOR FPE PANEL (HAZARDOUS):
{
  "systemType": {
    "category": "Electrical Distribution Panel",
    "panelType": "Load Center",
    "confidence": "high"
  },
  "basicInfo": {
    "manufacturer": "Federal Pacific Electric",
    "model": "Not legible",
    "serialNumber": "Not legible",
    "poleSpaces": "Not Available",
    "condition": "Hazardous",
    "confidence": "high"
  },
  "electrical": {
    "voltage": "120/240V",
    "phase": "1-phase",
    "wireConfig": "3-wire",
    "busRating": "200A",
    "availableFaultCurrent": "Not Available",
    "seriesRatedCombination": "Not Available",
    "lowestBreakerAIC": "Not Available",
    "confidence": "medium"
  },
  "incomingTermination": {
    "type": "Breaker Main",
    "mainBreakerSize": "200A",
    "mainBreakerPoles": "2",
    "confidence": "medium"
  },
  "mounting": {
    "type": "Not Available",
    "confidence": "low"
  },
  "physicalDimensions": {
    "width": "Not Available - requires field measurement",
    "depth": "Not Available - requires field measurement",
    "height": "Not Available - requires field measurement",
    "note": "Physical dimensions typically require field measurement and are not on nameplates"
  },
  "safetyWarnings": {
    "isFPE": true,
    "isZinsco": false,
    "isChallenger": false,
    "warnings": [
      "FEDERAL PACIFIC ELECTRIC PANEL DETECTED - IMMEDIATE REPLACEMENT REQUIRED",
      "FPE panels have documented fire hazards and breaker failures",
      "This panel poses a serious safety risk and should be replaced immediately"
    ]
  },
  "warnings": [
    "FEDERAL PACIFIC ELECTRIC PANEL - IMMEDIATE REPLACEMENT REQUIRED",
    "Model and serial numbers not legible",
    "This is a known fire hazard"
  ],
  "overallConfidence": "medium"
}

Extract all visible information from the electrical panel nameplate. Be realistic about what can be seen in a photo. RETURN ONLY JSON, NO OTHER TEXT.`;

    // TRANSFORMER PROMPT - REALISTIC NAMEPLATE EXTRACTION ONLY
    const transformerPrompt = `You are an expert electrical engineer analyzing a transformer nameplate. Extract ONLY what is clearly visible on the nameplate - be realistic about what can be read from a photo.

CRITICAL: Your response must be ONLY valid JSON with no additional text before or after. Do not include explanations, markdown code blocks, or any other text. Start your response with { and end with }.

CRITICAL INSTRUCTIONS:
1. Extract ONLY information visible on the nameplate - most transformers show kVA, voltages, and manufacturer
2. For fields not visible on nameplate: use "Not Available"
3. For fields that are worn/damaged/illegible: use "Not legible"
4. NEVER leave any field as null - always use either the actual value, "Not legible", or "Not Available"
5. Be realistic - most transformer nameplates show: manufacturer, model, kVA, primary voltage, secondary voltage, phase
6. Physical dimensions (width, depth, height, weight) typically require field measurement - use "Not Available" unless clearly labeled
7. Detailed ratings (impedance, insulation, temperature rise) are often small print - use "Not Available" unless clearly visible
8. Wiring details require field observation - always use "Not Available"

VOLTAGE CONFIGURATION IDENTIFICATION:
Common transformer voltage formats:
- "208Y/120V" = 208Y/120V (wye configuration)
- "480Y/277V" = 480Y/277V (wye configuration)
- "240D/120V" = 240D/120V (delta configuration)
- "480V" = 480V (primary voltage)
- "600D" = 600D (delta configuration)
- "120/240V" = 120/240V (single phase)

REALISTICALLY EXTRACTABLE FROM TRANSFORMER NAMEPLATE PHOTO:
✓ Manufacturer name
✓ Model number
✓ Serial number (sometimes)
✓ kVA rating (power rating)
✓ Primary voltage (e.g., 480V, 600V)
✓ Secondary voltage (e.g., 208Y/120V, 480Y/277V)
✓ Phase (single phase or three phase)
✓ Transformer type (Dry Type, Oil Filled, Pad Mounted)
✗ Physical dimensions (width, depth, height, weight - need measurement)
✗ Impedance rating (often small print)
✗ Insulation rating (often small print)
✗ Temperature rise (often small print)
✗ Wiring details (need field observation)
✗ Required clearances (need field measurement)

RETURN THIS EXACT JSON STRUCTURE (NO OTHER TEXT):
{
  "systemType": {
    "category": "Electrical Transformer",
    "transformerType": "Dry Type" or "Oil Filled" or "Pad Mounted" or "Cast Coil" or "Not Available",
    "confidence": "high" or "medium" or "low"
  },
  "basicInfo": {
    "manufacturer": "string or 'Not legible' or 'Not Available'",
    "model": "string or 'Not legible' or 'Not Available'",
    "serialNumber": "string or 'Not legible' or 'Not Available'",
    "phase": "Three Phase" or "Single Phase" or "Not legible" or "Not Available",
    "confidence": "high" or "medium" or "low"
  },
  "electrical": {
    "powerRating": "string with kVA (e.g., '75 kVA', '150 kVA') or 'Not legible' or 'Not Available'",
    "primaryVoltage": "string (e.g., '480V', '600V', '240V') or 'Not legible' or 'Not Available'",
    "secondaryVoltage": "string (e.g., '208Y/120V', '480Y/277V', '120/240V') or 'Not legible' or 'Not Available'",
    "impedance": "string with % (e.g., '3.5%') or 'Not Available' - often small print",
    "insulationRating": "string with °C (e.g., '150°C') or 'Not Available' - often small print",
    "temperatureRise": "string with °C (e.g., '80°C') or 'Not Available' - often small print",
    "confidence": "high" or "medium" or "low"
  },
  "mounting": {
    "type": "Floor" or "Suspended" or "Wall" or "Pad" or "Not Available",
    "confidence": "low" - usually cannot determine from nameplate alone
  },
  "physicalDimensions": {
    "width": "Not Available - requires field measurement",
    "depth": "Not Available - requires field measurement",
    "height": "Not Available - requires field measurement",
    "weight": "string with lbs or 'Not Available' - rarely visible",
    "note": "Physical dimensions typically require field measurement and are not always on nameplates"
  },
  "wiringDetails": {
    "note": "Wiring details require field observation and cannot be determined from nameplate photo",
    "primaries": "Not Available - requires field observation",
    "secondaries": "Not Available - requires field observation",
    "wireMaterial": "Not Available - requires field observation",
    "wireSize": "Not Available - requires field observation",
    "conduitSize": "Not Available - requires field observation"
  },
  "warnings": [
    "list any illegible fields or critical issues - no safety warnings needed for transformers unless obvious damage visible"
  ],
  "overallConfidence": "high" or "medium" or "low"
}

EXAMPLE OUTPUT FOR SQUARE D DRY TYPE TRANSFORMER:
{
  "systemType": {
    "category": "Electrical Transformer",
    "transformerType": "Dry Type",
    "confidence": "high"
  },
  "basicInfo": {
    "manufacturer": "Square D",
    "model": "EE75T3H",
    "serialNumber": "1234567890",
    "phase": "Three Phase",
    "confidence": "high"
  },
  "electrical": {
    "powerRating": "75 kVA",
    "primaryVoltage": "480V",
    "secondaryVoltage": "208Y/120V",
    "impedance": "3.5%",
    "insulationRating": "150°C",
    "temperatureRise": "80°C",
    "confidence": "high"
  },
  "mounting": {
    "type": "Floor",
    "confidence": "low"
  },
  "physicalDimensions": {
    "width": "Not Available - requires field measurement",
    "depth": "Not Available - requires field measurement",
    "height": "Not Available - requires field measurement",
    "weight": "850 lbs",
    "note": "Physical dimensions typically require field measurement and are not always on nameplates"
  },
  "wiringDetails": {
    "note": "Wiring details require field observation and cannot be determined from nameplate photo",
    "primaries": "Not Available - requires field observation",
    "secondaries": "Not Available - requires field observation",
    "wireMaterial": "Not Available - requires field observation",
    "wireSize": "Not Available - requires field observation",
    "conduitSize": "Not Available - requires field observation"
  },
  "warnings": [
    "Impedance and temperature ratings are small print - verify in field if needed"
  ],
  "overallConfidence": "high"
}

EXAMPLE OUTPUT FOR GENERAL ELECTRIC TRANSFORMER WITH LIMITED INFO:
{
  "systemType": {
    "category": "Electrical Transformer",
    "transformerType": "Dry Type",
    "confidence": "high"
  },
  "basicInfo": {
    "manufacturer": "General Electric",
    "model": "9T23B3873",
    "serialNumber": "Not legible",
    "phase": "Three Phase",
    "confidence": "high"
  },
  "electrical": {
    "powerRating": "45 kVA",
    "primaryVoltage": "480V",
    "secondaryVoltage": "120/240V",
    "impedance": "Not Available",
    "insulationRating": "Not Available",
    "temperatureRise": "Not Available",
    "confidence": "medium"
  },
  "mounting": {
    "type": "Not Available",
    "confidence": "low"
  },
  "physicalDimensions": {
    "width": "Not Available - requires field measurement",
    "depth": "Not Available - requires field measurement",
    "height": "Not Available - requires field measurement",
    "weight": "Not Available",
    "note": "Physical dimensions typically require field measurement and are not always on nameplates"
  },
  "wiringDetails": {
    "note": "Wiring details require field observation and cannot be determined from nameplate photo",
    "primaries": "Not Available - requires field observation",
    "secondaries": "Not Available - requires field observation",
    "wireMaterial": "Not Available - requires field observation",
    "wireSize": "Not Available - requires field observation",
    "conduitSize": "Not Available - requires field observation"
  },
  "warnings": [
    "Serial number not legible due to wear",
    "Detailed electrical ratings not visible on nameplate - verify in field"
  ],
  "overallConfidence": "medium"
}

Extract all visible information from the transformer nameplate. Be realistic about what can be seen in a photo. Focus on kVA, voltages, and phase - these are the critical specs. RETURN ONLY JSON, NO OTHER TEXT.`;

    // Select the appropriate prompt based on equipment type
    let selectedPrompt;
    if (equipmentType === 'electrical') {
      selectedPrompt = electricalPanelPrompt;
    } else if (equipmentType === 'transformer') {
      selectedPrompt = transformerPrompt;
    } else {
      selectedPrompt = comprehensivePrompt;
    }

    console.log(`Calling Claude with ${equipmentType} analysis prompt...`);

    const content = [];

    if (imagesToAnalyze[0] === "test") {
      content.push({
        type: "text",
        text: "This is a test. Respond with 'Lambda is working!'",
      });
    } else {
      // Add the prompt first
      content.push({
        type: "text",
        text: selectedPrompt,
      });

      // Add reference images for visual training (only for HVAC equipment)
      if ((equipmentType === 'hvac' || !equipmentType) && referenceImages) {
        let hasAnyReference = false;

        // Add electric RTU reference
        if (referenceImages.electricRtu) {
          try {
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: referenceImages.electricRtu,
              },
            });
            content.push({
              type: "text",
              text: "↑ REFERENCE IMAGE 1: Electric RTU nameplate with labeled extraction zones (clouds #1-#4). Study this layout."
            });
            hasAnyReference = true;
          } catch (error) {
            console.error('Error adding electric RTU reference:', error.message);
          }
        }

        // Add gas RTU reference
        if (referenceImages.gasRtu) {
          try {
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: referenceImages.gasRtu,
              },
            });
            content.push({
              type: "text",
              text: "↑ REFERENCE IMAGE 2: Gas RTU nameplate with labeled extraction zones (clouds #1-#6). Study this layout."
            });
            hasAnyReference = true;
          } catch (error) {
            console.error('Error adding gas RTU reference:', error.message);
          }
        }

        // Add fuse disconnect reference
        if (referenceImages.fuseDisconnect) {
          try {
            content.push({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: referenceImages.fuseDisconnect,
              },
            });
            content.push({
              type: "text",
              text: "↑ REFERENCE IMAGE 3: Fuse disconnect box showing how to read fuse amperage ratings. If user provides disconnect photo, use THESE values for fuse size, NOT the nameplate MOCP."
            });
            hasAnyReference = true;
          } catch (error) {
            console.error('Error adding fuse disconnect reference:', error.message);
          }
        }

        if (hasAnyReference) {
          content.push({
            type: "text",
            text: "Now analyze the actual nameplate image(s) below using the same extraction pattern you learned from the reference images:"
          });
        }
      }

      // Add ALL enhanced images to the content array
      // This allows Claude to see all images of the same panel for better analysis
      for (let i = 0; i < enhancedImages.length; i++) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: enhancedImages[i],
          },
        });
      }

      // Add instruction to analyze all images
      if (imagesToAnalyze.length > 1) {
        content.push({
          type: "text",
          text: `You have been provided with ${imagesToAnalyze.length} images of the same equipment. Analyze ALL images to extract information. Use whichever image shows the nameplate most clearly. Combine information from all images if needed. If one of these images shows a disconnect box with fuses, extract the fuse size from the fuse labels (not the nameplate).`,
        });
      } else {
        content.push({
          type: "text",
          text: "Extract all information from this image following the extraction pattern from the reference images above. If this is a disconnect box with fuses, read the fuse amperage directly from the fuse labels."
        });
      }
    }

    const response = await bedrock
      .invokeModel({
        modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
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

    // Log token usage and cost
    const usage = result.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // Claude 3.5 Sonnet pricing (as of 2024):
    // Input: $3.00 per million tokens
    // Output: $15.00 per million tokens
    const inputCost = (inputTokens / 1_000_000) * 3.00;
    const outputCost = (outputTokens / 1_000_000) * 15.00;
    const totalCost = inputCost + outputCost;

    console.log("=== TOKEN USAGE & COST ===");
    console.log(`Input tokens: ${inputTokens.toLocaleString()}`);
    console.log(`Output tokens: ${outputTokens.toLocaleString()}`);
    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`Estimated cost: $${totalCost.toFixed(4)} USD`);
    console.log(`  - Input cost: $${inputCost.toFixed(4)}`);
    console.log(`  - Output cost: $${outputCost.toFixed(4)}`);
    console.log("========================");

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
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost: totalCost,
          model: "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
        },
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
