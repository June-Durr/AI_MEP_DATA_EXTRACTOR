# MEP Survey AI Agent - Project Overview

## What This Project Does
This is an AI-powered MEP (Mechanical, Electrical, Plumbing) equipment survey analyzer that uses AWS Lambda, API Gateway, and Claude 3 Haiku to analyze equipment images and extract technical specifications.

## Current Architecture

### AWS Infrastructure
- **API Gateway**: `jqyt5l9x73` in `us-east-1` region
  - Stage: `prod`
  - URL: `https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod`
  - POST method on root resource (`/`)
- **Lambda Function**: `mep-survey-analyzer` in `us-east-1` region
  - ARN: `arn:aws:lambda:us-east-1:489335433947:function:mep-survey-analyzer`
- **Bedrock**: Uses `anthropic.claude-3-haiku-20240307-v1:0` model in `us-east-1`

### Current Status: ✅ WORKING
- API Gateway successfully connects to Lambda
- Lambda successfully calls Claude 3 Haiku via Bedrock
- Basic test passes: returns "Lambda is working with Claude 3 Haiku!"

## Key Files

### `/simple-test.js`
Basic test script that:
- Reads API URL from `../api-url.txt`
- Sends POST request with test data
- Validates the complete pipeline works

### `/lambda/quickAnalysis.js`
AWS Lambda function that:
- Receives image (base64) and equipment type
- Calls Claude 3 Haiku via AWS Bedrock
- Analyzes MEP equipment images for technical specifications
- Returns structured response with analysis results

### `/check-permissions.js`
Permission checking utility (currently in IDE)

## How It Works
1. User uploads equipment image to frontend
2. Image converted to base64 and sent to API Gateway
3. API Gateway triggers Lambda function
4. Lambda sends image to Claude 3 Haiku via Bedrock
5. Claude analyzes image and extracts:
   - Model numbers
   - Serial numbers  
   - Capacity ratings
   - Voltage specifications
   - Manufacturer details
   - Technical data from nameplates/labels
6. Results returned to user

## Next Steps
- Test with real equipment images
- Enhance analysis prompts for better data extraction
- Add structured JSON output format
- Build proper frontend interface
- Implement data storage/database
- Add error handling and validation

## Development Notes
- All AWS resources are in `us-east-1` region
- Bedrock model access is configured for all Anthropic models
- API Gateway uses POST method on root resource (not `/analyze` endpoint)
- Lambda function successfully handles both test and real image data