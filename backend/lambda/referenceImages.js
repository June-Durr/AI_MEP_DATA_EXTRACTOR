// Reference images encoded as base64 for Lambda deployment
// These are the marked-up training images that show Claude exactly where to find information

const fs = require('fs');
const path = require('path');

// Load reference images at module initialization (only once)
let electricRtuReference = null;
let gasRtuReference = null;
let fuseDisconnectReference = null;

try {
  // Try to load from reference-images folder (for local testing)
  const refPath = path.join(__dirname, '..', 'reference-images');

  if (fs.existsSync(path.join(refPath, 'electric-rtu-reference.jpg.png'))) {
    electricRtuReference = fs.readFileSync(
      path.join(refPath, 'electric-rtu-reference.jpg.png')
    ).toString('base64');
  }

  if (fs.existsSync(path.join(refPath, 'gas-rtu-reference.jpg.png'))) {
    gasRtuReference = fs.readFileSync(
      path.join(refPath, 'gas-rtu-reference.jpg.png')
    ).toString('base64');
  }

  if (fs.existsSync(path.join(refPath, 'fuse-disconnect-reference.jpg.png'))) {
    fuseDisconnectReference = fs.readFileSync(
      path.join(refPath, 'fuse-disconnect-reference.jpg.png')
    ).toString('base64');
  }
} catch (error) {
  console.log('Reference images not found locally, will use embedded versions');
}

// If not loaded from files, they'll be embedded during build
// For now, export what we have
module.exports = {
  getElectricRtuReference: () => electricRtuReference,
  getGasRtuReference: () => gasRtuReference,
  getFuseDisconnectReference: () => fuseDisconnectReference,
  hasReferences: () => electricRtuReference && gasRtuReference && fuseDisconnectReference
};
