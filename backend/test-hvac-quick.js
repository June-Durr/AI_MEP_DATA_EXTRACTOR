// Quick HVAC test
const https = require("https");

const apiUrl = "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod";

console.log("Testing HVAC extraction with test payload...\n");

const testData = JSON.stringify({
  imageBase64: "test",
  equipmentType: "hvac"
});

const options = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": testData.length,
  },
};

const req = https.request(apiUrl, options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response:`, data);

    if (res.statusCode === 200) {
      console.log("\n✅ Lambda is responding correctly!");
      console.log("You can now test uploading HVAC nameplate images from the frontend.");
    } else {
      console.log("\n❌ Lambda returned an error");
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Request failed:", error.message);
});

req.write(testData);
req.end();
