const axios = require("axios");
const fs = require("fs");

async function testLambda() {
  try {
    // Read your API URL
    const apiUrl = fs.readFileSync("../api-url.txt", "utf8").trim();

    // Use one of your Lennox photos - copy it to backend folder first
    console.log("Copy one of your Lennox photos to backend/test-image.jpg");
    console.log("Then press Enter to continue...");

    await new Promise((resolve) => process.stdin.once("data", resolve));

    const imageBuffer = fs.readFileSync("test-image.jpg");
    const imageBase64 = imageBuffer.toString("base64");

    console.log("Sending request to:", apiUrl + "/analyze");

    const response = await axios.post(`${apiUrl}/analyze`, {
      imageBase64: imageBase64,
      equipmentType: "hvac",
    });

    console.log(
      "Success! Extracted data:",
      JSON.stringify(response.data, null, 2)
    );
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

// Install axios first
console.log("Installing axios...");
require("child_process").execSync("npm install axios", { stdio: "inherit" });

testLambda();
