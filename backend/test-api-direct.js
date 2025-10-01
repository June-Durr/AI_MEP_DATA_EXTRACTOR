// backend/test-api-direct.js - Test the exact API call
const axios = require("axios");

async function testAPI() {
  try {
    const apiUrl =
      "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod";

    console.log("🔗 Testing API URL:", apiUrl);

    // Test with minimal data first
    const response = await axios.post(
      apiUrl,
      {
        imageBase64: "test",
        equipmentType: "hvac",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("✅ API Response Status:", response.status);
    console.log("✅ API Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ API Error Details:");
    console.error("Status:", error.response?.status);
    console.error("Status Text:", error.response?.statusText);
    console.error("Data:", error.response?.data);
    console.error("Headers:", error.response?.headers);
    console.error("Full Error:", error.message);
  }
}

testAPI();
