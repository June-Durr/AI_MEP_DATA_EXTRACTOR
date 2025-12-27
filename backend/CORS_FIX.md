# CORS Configuration Fix for API Gateway

## Problem
The frontend is getting a CORS error when trying to upload images to the Lambda function:
```
Access to fetch at 'https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod'
from origin 'http://localhost:3000' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
While the Lambda function (`lambda/quickAnalysis.js`) has CORS headers configured correctly (lines 8-13), the API Gateway itself needs to be configured to enable CORS. Without this configuration, API Gateway blocks the requests before they even reach the Lambda function.

## Solution: Configure CORS in AWS API Gateway

### Method 1: Using AWS Console (Recommended)

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com/apigateway
   - Select region: `us-east-1`

2. **Find Your API**
   - Look for the API that has the endpoint: `jqyt5l9x73.execute-api.us-east-1.amazonaws.com`
   - Click on the API name

3. **Enable CORS**
   - Click on the resource path (likely `/` or `/prod`)
   - Click on "Actions" dropdown
   - Select "Enable CORS"

4. **Configure CORS Settings**
   - **Access-Control-Allow-Origin**: Enter `*` (or specific origins like `http://localhost:3000,https://yourdomain.com`)
   - **Access-Control-Allow-Headers**: Enter `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - **Access-Control-Allow-Methods**: Check `POST` and `OPTIONS`
   - Click "Enable CORS and replace existing CORS headers"

5. **Deploy Changes**
   - After enabling CORS, you MUST deploy the API for changes to take effect
   - Click "Actions" dropdown
   - Select "Deploy API"
   - Select deployment stage (likely "prod")
   - Click "Deploy"

6. **Verify the Fix**
   - The API Gateway will now handle OPTIONS preflight requests automatically
   - The Lambda function's CORS headers will be properly returned to the browser
   - Test by uploading images in the frontend

### Method 2: Using AWS CLI

If you prefer using the command line:

```bash
# Get the API ID (replace with your actual API ID)
API_ID="jqyt5l9x73"
REGION="us-east-1"
RESOURCE_ID="<your-resource-id>"  # You need to find this first

# Update the resource to enable CORS
aws apigateway update-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --patch-operations \
    op=replace,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value="'*'"

# Add OPTIONS method for preflight
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE

# Deploy the API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION
```

## Verification Steps

After configuring CORS, test the fix:

1. **Open Browser Developer Tools**
   - Press F12 in your browser
   - Go to Network tab

2. **Try Uploading Images**
   - Upload 4 pictures in the electrical survey
   - Watch the Network tab

3. **Expected Behavior**
   - You should see an OPTIONS request first (preflight)
   - Status: 200 OK
   - Response headers should include:
     - `Access-Control-Allow-Origin: *`
     - `Access-Control-Allow-Methods: POST, OPTIONS`
     - `Access-Control-Allow-Headers: Content-Type`
   - Then you should see a POST request
   - Status: 200 OK
   - Response with analysis data

## Alternative: Test with a CORS Proxy (Temporary)

If you need a quick temporary fix for local testing, you can use a CORS proxy:

1. Update `ElectricalSurvey.js` temporarily:
   ```javascript
   const apiUrl = "https://cors-anywhere.herokuapp.com/" +
     (process.env.REACT_APP_API_URL ||
      "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod");
   ```

**Note**: This is only for testing! Do NOT use CORS proxies in production.

## Additional Notes

- The Lambda function already has the correct CORS headers configured
- This issue only affects API Gateway configuration
- Once CORS is enabled in API Gateway, all requests from `localhost:3000` (and any other origins you specify) will work correctly
- Remember to deploy the API after any changes!

## Troubleshooting

If CORS still doesn't work after configuration:

1. **Check API Gateway Logs**
   - Enable CloudWatch logging for your API Gateway
   - Check for errors in the logs

2. **Verify Deployment**
   - Make sure you deployed the API after enabling CORS
   - Check the deployment stage is correct (prod)

3. **Check Browser Console**
   - Look for specific CORS error messages
   - Verify the request headers and response headers

4. **Test with curl**
   ```bash
   # Test OPTIONS request
   curl -X OPTIONS \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -v \
     https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod

   # Should return 200 with CORS headers
   ```
