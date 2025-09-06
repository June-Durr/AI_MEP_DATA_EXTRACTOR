// Fix Lambda role permissions for Bedrock access
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

async function fixLambdaRole() {
  try {
    const iam = new AWS.IAM();
    const roleName = "mep-survey-lambda-role";
    
    console.log(`Checking permissions for ${roleName}...`);
    
    // Check current attached policies
    const attachedPolicies = await iam.listAttachedRolePolicies({
      RoleName: roleName
    }).promise();
    
    console.log("\nCurrently attached policies:");
    attachedPolicies.AttachedPolicies.forEach(policy => {
      console.log(`- ${policy.PolicyName} (${policy.PolicyArn})`);
    });
    
    // Check if Bedrock policy is already attached
    const hasBedrockAccess = attachedPolicies.AttachedPolicies.some(
      policy => policy.PolicyArn.includes("Bedrock") || policy.PolicyName.includes("Bedrock")
    );
    
    if (hasBedrockAccess) {
      console.log("\n✅ Bedrock policy already attached!");
      
      // Check if we need cross-region inference permissions
      console.log("Checking if cross-region inference permissions are needed...");
      
      const customPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "bedrock:InvokeModel",
              "bedrock:InvokeModelWithResponseStream"
            ],
            Resource: [
              "arn:aws:bedrock:*:*:inference-profile/*",
              "arn:aws:bedrock:*::foundation-model/*"
            ]
          }
        ]
      };
      
      try {
        await iam.putRolePolicy({
          RoleName: roleName,
          PolicyName: "BedrockCrossRegionAccess",
          PolicyDocument: JSON.stringify(customPolicy)
        }).promise();
        console.log("✅ Added cross-region inference permissions!");
      } catch (error) {
        console.log("Note: Cross-region policy may already exist or not be needed");
      }
      
    } else {
      console.log("\n❌ No Bedrock policy found! Adding AmazonBedrockFullAccess...");
      
      await iam.attachRolePolicy({
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
      }).promise();
      
      console.log("✅ AmazonBedrockFullAccess attached to Lambda role!");
    }
    
    console.log("\n🎉 Lambda role permissions updated!");
    console.log("Run 'node simple-test.js' to test your Lambda function now.");
    
  } catch (error) {
    console.error("❌ Error fixing Lambda role:", error.message);
    
    if (error.code === "NoSuchEntity") {
      console.log("The role 'mep-survey-lambda-role' doesn't exist. Check your role name.");
    } else if (error.code === "AccessDenied") {
      console.log("You don't have permission to modify IAM roles. Check your AWS credentials.");
    }
  }
}

fixLambdaRole();