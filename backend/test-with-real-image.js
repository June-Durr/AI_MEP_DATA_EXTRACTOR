// Test with a minimal real base64 image (1x1 pixel PNG)
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

// Minimal 1x1 pixel PNG image in base64
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const params = {
  FunctionName: 'mep-survey-analyzer',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({
    httpMethod: 'POST',
    body: JSON.stringify({
      images: [testImageBase64],
      imageBase64: testImageBase64,
      equipmentType: 'hvac'
    })
  })
};

console.log('Testing Lambda with real image data...\n');

lambda.invoke(params, (err, data) => {
  if (err) {
    console.error('Error invoking Lambda:', err);
  } else {
    console.log('Status Code:', data.StatusCode);

    if (data.FunctionError) {
      console.error('\n❌ Function Error:', data.FunctionError);
      const payload = JSON.parse(data.Payload);
      console.error('Error Type:', payload.errorType);
      console.error('Error Message:', payload.errorMessage);
      console.error('\nStack Trace:');
      if (payload.trace) {
        payload.trace.forEach(line => console.error('  ', line));
      }
    } else {
      const response = JSON.parse(data.Payload);
      console.log('\n✅ Response:', JSON.stringify(response, null, 2));
    }
  }
});
