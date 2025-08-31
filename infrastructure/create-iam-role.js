// infrastructure/create-iam-role.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" }); // ADD THIS LINE
const iam = new AWS.IAM();

async function createLambdaRole() {
  const trustPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "lambda.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  };

  try {
    // Create the role
    const role = await iam
      .createRole({
        RoleName: "mep-survey-lambda-role",
        AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
        Description: "Role for MEP Survey Lambda functions",
      })
      .promise();

    console.log("Role created:", role.Role.Arn);

    // Attach basic Lambda execution policy
    await iam
      .attachRolePolicy({
        RoleName: "mep-survey-lambda-role",
        PolicyArn:
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      })
      .promise();

    // Create and attach custom policy
    const customPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
          Resource: "arn:aws:s3:::mep-survey-*/*",
        },
        {
          Effect: "Allow",
          Action: [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:Query",
            "dynamodb:Scan",
          ],
          Resource: "arn:aws:dynamodb:*:*:table/mep-survey-*",
        },
        {
          Effect: "Allow",
          Action: ["bedrock:InvokeModel"],
          Resource: "*",
        },
      ],
    };

    const policyResponse = await iam
      .createPolicy({
        PolicyName: "mep-survey-lambda-policy",
        PolicyDocument: JSON.stringify(customPolicy),
      })
      .promise();

    await iam
      .attachRolePolicy({
        RoleName: "mep-survey-lambda-role",
        PolicyArn: policyResponse.Policy.Arn,
      })
      .promise();

    console.log("Policies attached successfully");
    return role.Role.Arn;
  } catch (error) {
    console.error("Error creating role:", error);
  }
}

createLambdaRole();
