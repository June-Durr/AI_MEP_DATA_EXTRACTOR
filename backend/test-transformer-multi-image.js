// Test transformer analysis with multiple images
const https = require('https');

const API_URL = 'https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod';

// Create a minimal test image (1x1 pixel)
const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

const testPayload = {
  images: [testImageBase64, testImageBase64, testImageBase64], // 3 identical test images
  equipmentType: 'transformer'  // TESTING TRANSFORMER
};

console.log('=== TESTING TRANSFORMER ANALYSIS WITH MULTIPLE IMAGES ===');
console.log(`Sending ${testPayload.images.length} images to: ${API_URL}`);
console.log(`Equipment type: ${testPayload.equipmentType}`);

const postData = JSON.stringify(testPayload);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(API_URL, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);

    try {
      const result = JSON.parse(data);
      console.log('\n=== TRANSFORMER ANALYSIS RESULT ===');
      console.log(JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        console.log('\n✓ SUCCESS: Lambda accepted and processed multiple transformer images!');
        console.log('\nExtracted Data Summary:');
        console.log('- System Type:', result.data.systemType?.transformerType || 'N/A');
        console.log('- Manufacturer:', result.data.basicInfo?.manufacturer || 'N/A');
        console.log('- Model:', result.data.basicInfo?.model || 'N/A');
        console.log('- Power Rating:', result.data.electrical?.powerRating || 'N/A');
        console.log('- Primary Voltage:', result.data.electrical?.primaryVoltage || 'N/A');
        console.log('- Secondary Voltage:', result.data.electrical?.secondaryVoltage || 'N/A');
        console.log('- Overall Confidence:', result.data.overallConfidence || 'N/A');
      } else {
        console.log('\n✗ FAILURE: Lambda returned error or no data');
        console.log('Error:', result.error || 'Unknown error');
      }
    } catch (e) {
      console.log('\n✗ PARSE ERROR');
      console.log('Raw Response:', data);
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('\n✗ REQUEST ERROR:', e);
});

req.write(postData);
req.end();
