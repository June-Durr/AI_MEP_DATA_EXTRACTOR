// backend/check-models.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

async function checkModels() {
  try {
    const bedrock = new AWS.Bedrock({ region: "us-east-1" });
    
    console.log("Checking available Bedrock models...");
    
    const models = await bedrock.listFoundationModels().promise();
    
    console.log("\n=== Available Models ===");
    models.modelSummaries
      .filter(model => model.modelId.includes("claude") || model.modelId.includes("anthropic"))
      .forEach(model => {
        console.log(`✓ ${model.modelId} - ${model.modelName}`);
        console.log(`  Provider: ${model.providerName}`);
        console.log(`  Input modalities: ${model.inputModalities.join(", ")}`);
        console.log(`  Output modalities: ${model.outputModalities.join(", ")}`);
        console.log("");
      });
      
    // Also show all models
    console.log("\n=== All Available Models ===");
    models.modelSummaries.forEach(model => {
      console.log(`- ${model.modelId}`);
    });
      
  } catch (error) {
    console.error("❌ Error checking models:", error.message);
  }
}

checkModels();
