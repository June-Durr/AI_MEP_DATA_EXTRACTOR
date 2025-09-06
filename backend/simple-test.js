// backend/simple-test.js
const axios = require("axios");
const fs = require("fs");

async function simpleTest() {
  try {
    const apiUrl = fs.readFileSync("../api-url.txt", "utf8").trim();

    console.log("Testing basic Lambda/API access...");
    console.log("API URL:", apiUrl + "/analyze");

    const response = await axios.post(`${apiUrl}/analyze`, {
      imageBase64: "test", // Just a simple string
      equipmentType: "hvac",
    });

    console.log("✅ SUCCESS!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("❌ Error:", error.response?.data || error.message);
  }
}

simpleTest();
