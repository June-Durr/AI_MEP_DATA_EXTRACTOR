// backend/check-permissions.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

async function checkPermissions() {
  try {
    const iam = new AWS.IAM();

    console.log("Checking IAM role permissions...");

    // Get role policies
    const attachedPolicies = await iam
      .listAttachedRolePolicies({
        RoleName: "mep-survey-lambda-role",
      })
      .promise();

    console.log("\nAttached policies:");
    attachedPolicies.AttachedPolicies.forEach((policy) => {
      console.log(`- ${policy.PolicyName} (${policy.PolicyArn})`);
    });

    // Check if Bedrock policy is attached
    const hasBedrockAccess = attachedPolicies.AttachedPolicies.some(
      (policy) =>
        policy.PolicyArn.includes("Bedrock") ||
        policy.PolicyName.includes("Bedrock")
    );

    if (!hasBedrockAccess) {
      console.log("\n❌ No Bedrock policy found! Adding it...");

      await iam
        .attachRolePolicy({
          RoleName: "mep-survey-lambda-role",
          PolicyArn: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
        })
        .promise();

      console.log("✅ Bedrock policy attached!");
    } else {
      console.log("\n✅ Bedrock access policy found!");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkPermissions();
