const AWS = require("aws-sdk");
const bedrock = new AWS.BedrockRuntime({ region: "us-east-1" });

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  try {
    const { imageBase64, equipmentType } = JSON.parse(event.body);

    // Equipment-specific prompts
    const prompts = {
      hvac: `You are an MEP engineer. Analyze this HVAC equipment nameplate and extract:
        - Manufacturer
        - Model number
        - Serial number (decode age if Lennox: first 2 digits = year)
        - Voltage and phase
        - Tonnage/capacity
        - Estimated age
        - Condition assessment
        
        For Lennox: Serial 5608xxxxx = 2006, Week 08
        
        Return ONLY a JSON object with these exact fields. No additional text.`,

      electrical: `Analyze this electrical panel and extract:
        - Panel designation
        - Manufacturer (CRITICAL: Flag if FPE or Zinsco)
        - Voltage configuration
        - Main breaker size
        - Available spaces
        
        Return ONLY a JSON object.`,
    };

    // Use Claude 3 Haiku which supports direct invocation
    const response = await bedrock
      .invokeModel({
        modelId: "anthropic.claude-instant-v1",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: imageBase64,
                  },
                },
                {
                  type: "text",
                  text: prompts[equipmentType] || prompts["hvac"],
                },
              ],
            },
          ],
        }),
      })
      .promise();

    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log("Bedrock response:", result);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        data: JSON.parse(result.content[0].text),
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
    };
  }
};
