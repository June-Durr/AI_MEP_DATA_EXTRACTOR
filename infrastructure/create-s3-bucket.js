// infrastructure/create-s3-bucket.js
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" }); // ADD THIS LINE
const s3 = new AWS.S3();

async function createBucket() {
  const bucketName = `mep-survey-${Date.now()}`; // Unique bucket name

  const bucketParams = {
    Bucket: bucketName,
    ACL: "private",
  };

  try {
    // Create bucket
    await s3.createBucket(bucketParams).promise();
    console.log(`Bucket created: ${bucketName}`);

    // Enable CORS
    const corsParams = {
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE"],
            AllowedOrigins: ["*"], // Update with your domain later
            ExposeHeaders: ["ETag"],
          },
        ],
      },
    };

    await s3.putBucketCors(corsParams).promise();
    console.log("CORS configured");

    // Save bucket name to file for later use
    const fs = require("fs");
    fs.writeFileSync("bucket-name.txt", bucketName);
    console.log(`Bucket name saved to bucket-name.txt: ${bucketName}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

createBucket();
