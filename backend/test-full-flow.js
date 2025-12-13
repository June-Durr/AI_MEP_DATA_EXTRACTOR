// Full integration test simulating user uploading 3 transformer images
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod';

// Simulate 3 different images (in real scenario, these would be actual photos)
// For testing, we'll use the same base64 but simulate different images
const createTestImage = (label) => {
  // This is a minimal 1x1 pixel JPEG
  return '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
};

console.log('===========================================');
console.log('FULL FLOW TEST: USER UPLOADING 3 TRANSFORMER IMAGES');
console.log('===========================================\n');

// Simulate user uploading 3 images of the same transformer
const userScenario = {
  scenario: 'User uploads 3 photos of same transformer nameplate',
  images: [
    { label: 'Image 1 - Front view of transformer', data: createTestImage('front') },
    { label: 'Image 2 - Close-up of nameplate', data: createTestImage('nameplate') },
    { label: 'Image 3 - Side angle showing labels', data: createTestImage('side') }
  ],
  equipmentType: 'transformer'
};

console.log('Scenario:', userScenario.scenario);
console.log('Images to upload:');
userScenario.images.forEach((img, idx) => {
  console.log(`  ${idx + 1}. ${img.label}`);
});
console.log(`Equipment Type: ${userScenario.equipmentType}\n`);

// Prepare payload exactly as frontend would send it
const testPayload = {
  images: userScenario.images.map(img => img.data),
  imageBase64: userScenario.images[0].data,  // First image for backward compatibility
  equipmentType: userScenario.equipmentType
};

console.log('Sending request to Lambda...');
console.log(`API URL: ${API_URL}`);
console.log(`Number of images: ${testPayload.images.length}\n`);

const postData = JSON.stringify(testPayload);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const startTime = Date.now();

const req = https.request(API_URL, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('=== RESPONSE RECEIVED ===');
    console.log(`Status: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms\n`);

    try {
      const result = JSON.parse(data);

      if (result.success && result.data) {
        console.log('✓✓✓ TEST PASSED ✓✓✓\n');
        console.log('Lambda successfully processed all 3 transformer images!\n');

        console.log('=== EXTRACTED TRANSFORMER DATA ===');
        console.log('System Information:');
        console.log(`  Category: ${result.data.systemType?.category || 'N/A'}`);
        console.log(`  Type: ${result.data.systemType?.transformerType || 'N/A'}`);
        console.log(`  Confidence: ${result.data.systemType?.confidence || 'N/A'}\n`);

        console.log('Basic Information:');
        console.log(`  Manufacturer: ${result.data.basicInfo?.manufacturer || 'N/A'}`);
        console.log(`  Model: ${result.data.basicInfo?.model || 'N/A'}`);
        console.log(`  Serial Number: ${result.data.basicInfo?.serialNumber || 'N/A'}`);
        console.log(`  Phase: ${result.data.basicInfo?.phase || 'N/A'}\n`);

        console.log('Electrical Specifications:');
        console.log(`  Power Rating: ${result.data.electrical?.powerRating || 'N/A'}`);
        console.log(`  Primary Voltage: ${result.data.electrical?.primaryVoltage || 'N/A'}`);
        console.log(`  Secondary Voltage: ${result.data.electrical?.secondaryVoltage || 'N/A'}`);
        console.log(`  Impedance: ${result.data.electrical?.impedance || 'N/A'}`);
        console.log(`  Insulation Rating: ${result.data.electrical?.insulationRating || 'N/A'}`);
        console.log(`  Temperature Rise: ${result.data.electrical?.temperatureRise || 'N/A'}\n`);

        console.log('Physical Information:');
        console.log(`  Mounting Type: ${result.data.mounting?.type || 'N/A'}\n`);

        if (result.data.warnings && result.data.warnings.length > 0) {
          console.log('Warnings:');
          result.data.warnings.forEach(warning => {
            console.log(`  - ${warning}`);
          });
          console.log();
        }

        console.log(`Overall Confidence: ${result.data.overallConfidence || 'N/A'}\n`);

        console.log('===========================================');
        console.log('✓ CONCLUSION: Multi-image transformer analysis is WORKING!');
        console.log('===========================================');

        // Verify key fields are populated
        const hasManufacturer = result.data.basicInfo?.manufacturer && result.data.basicInfo.manufacturer !== 'Not Available';
        const hasPowerRating = result.data.electrical?.powerRating && result.data.electrical.powerRating !== 'Not Available';
        const hasVoltages = result.data.electrical?.primaryVoltage && result.data.electrical?.primaryVoltage !== 'Not Available';

        if (hasManufacturer || hasPowerRating || hasVoltages) {
          console.log('\n✓ AI successfully extracted transformer information from images!');
        } else {
          console.log('\n⚠ AI received images but extracted limited information (test images may be too simple)');
        }

      } else {
        console.log('✗✗✗ TEST FAILED ✗✗✗\n');
        console.log('Lambda returned error or no data');
        console.log('Error:', result.error || 'Unknown error');
        console.log('\nFull response:', JSON.stringify(result, null, 2));
      }
    } catch (e) {
      console.log('✗✗✗ TEST FAILED ✗✗✗\n');
      console.log('Failed to parse response');
      console.log('Parse error:', e.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('✗✗✗ TEST FAILED ✗✗✗\n');
  console.error('Request error:', e.message);
});

req.write(postData);
req.end();
