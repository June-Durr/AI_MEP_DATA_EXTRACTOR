// infrastructure/create-dynamodb-tables.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" }); // ADD THIS LINE
const dynamodb = new AWS.DynamoDB();

async function createTables() {
  const tables = [
    {
      TableName: "mep-survey-projects",
      KeySchema: [{ AttributeName: "projectId", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "projectId", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    },
    {
      TableName: "mep-survey-equipment",
      KeySchema: [
        { AttributeName: "projectId", KeyType: "HASH" },
        { AttributeName: "equipmentId", KeyType: "RANGE" },
      ],
      AttributeDefinitions: [
        { AttributeName: "projectId", AttributeType: "S" },
        { AttributeName: "equipmentId", AttributeType: "S" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    },
  ];

  for (const table of tables) {
    try {
      await dynamodb.createTable(table).promise();
      console.log(`Table created: ${table.TableName}`);
    } catch (error) {
      if (error.code === "ResourceInUseException") {
        console.log(`Table already exists: ${table.TableName}`);
      } else {
        console.error(`Error creating table ${table.TableName}:`, error);
      }
    }
  }
}

createTables();
