// frontend/src/utils/electricalValidation.js
// Electrical validation utilities for wire sizing, conduit fill, and NEC compliance

// NEC Table 310.16 - Ampacity of Insulated Conductors (75°C Copper)
// Based on 2020 NEC standards
export const wireSizeAmpacityTable = {
  '14 AWG': 15,
  '12 AWG': 20,
  '10 AWG': 30,
  '8 AWG': 50,
  '6 AWG': 65,
  '4 AWG': 85,
  '3 AWG': 100,
  '2 AWG': 115,
  '1 AWG': 130,
  '1/0 AWG': 150,
  '2/0 AWG': 175,
  '3/0 AWG': 200,
  '4/0 AWG': 230,
  '250 kcmil': 255,
  '300 kcmil': 285,
  '350 kcmil': 310,
  '400 kcmil': 335,
  '500 kcmil': 380,
  '600 kcmil': 420,
  '750 kcmil': 475,
};

// Wire size options for dropdowns
export const wireSizeOptions = [
  '14 AWG',
  '12 AWG',
  '10 AWG',
  '8 AWG',
  '6 AWG',
  '4 AWG',
  '3 AWG',
  '2 AWG',
  '1 AWG',
  '1/0 AWG',
  '2/0 AWG',
  '3/0 AWG',
  '4/0 AWG',
  '250 kcmil',
  '300 kcmil',
  '350 kcmil',
  '400 kcmil',
  '500 kcmil',
  '600 kcmil',
  '750 kcmil',
];

// Conduit size options for dropdowns
export const conduitSizeOptions = [
  '1/2"',
  '3/4"',
  '1"',
  '1-1/4"',
  '1-1/2"',
  '2"',
  '2-1/2"',
  '3"',
  '3-1/2"',
  '4"',
  '5"',
  '6"',
];

// Conduit fill area (square inches) - NEC Table 4
// Based on 40% fill for 3+ conductors
export const conduitFillTable = {
  '1/2"': 0.12,   // 40% of 0.30 total area
  '3/4"': 0.21,   // 40% of 0.53 total area
  '1"': 0.34,     // 40% of 0.86 total area
  '1-1/4"': 0.61, // 40% of 1.50 total area
  '1-1/2"': 0.81, // 40% of 2.04 total area
  '2"': 1.34,     // 40% of 3.36 total area
  '2-1/2"': 2.34, // 40% of 5.86 total area
  '3"': 3.54,     // 40% of 8.85 total area
  '3-1/2"': 4.62, // 40% of 11.55 total area
  '4"': 6.30,     // 40% of 15.76 total area
  '5"': 10.14,    // 40% of 25.35 total area
  '6"': 14.60,    // 40% of 36.50 total area
};

// Wire cross-sectional area (square inches) - NEC Chapter 9, Table 5
// For THHN/THWN conductors
export const wireCrossSectionTable = {
  '14 AWG': 0.0097,
  '12 AWG': 0.0133,
  '10 AWG': 0.0211,
  '8 AWG': 0.0366,
  '6 AWG': 0.0507,
  '4 AWG': 0.0824,
  '3 AWG': 0.0973,
  '2 AWG': 0.1158,
  '1 AWG': 0.1562,
  '1/0 AWG': 0.1855,
  '2/0 AWG': 0.2223,
  '3/0 AWG': 0.2679,
  '4/0 AWG': 0.3197,
  '250 kcmil': 0.3970,
  '300 kcmil': 0.4536,
  '350 kcmil': 0.5113,
  '400 kcmil': 0.5651,
  '500 kcmil': 0.6818,
  '600 kcmil': 0.8316,
  '750 kcmil': 1.0141,
};

/**
 * Validate wire size against amperage rating
 * Applies NEC 210.20(A) 125% rule for continuous loads
 *
 * @param {string} wireSize - Wire size (e.g., "3/0 AWG")
 * @param {number} amperage - Load amperage
 * @param {boolean} continuousLoad - True if load runs for 3+ hours
 * @returns {Object} { valid: boolean, error?: string, suggestedSize?: string }
 */
export const validateWireSize = (wireSize, amperage, continuousLoad = true) => {
  if (!wireSize || !amperage) {
    return { valid: false, error: 'Wire size and amperage are required' };
  }

  const wireAmps = wireSizeAmpacityTable[wireSize];
  if (!wireAmps) {
    return { valid: false, error: `Unknown wire size: ${wireSize}` };
  }

  // Apply 125% rule for continuous loads (NEC 210.20(A))
  const requiredAmps = continuousLoad ? amperage * 1.25 : amperage;

  if (wireAmps < requiredAmps) {
    // Find suggested wire size
    const suggestedSize = findMinimumWireSize(requiredAmps);

    return {
      valid: false,
      error: `Wire size ${wireSize} (${wireAmps}A) is undersized for ${amperage}A load` +
             (continuousLoad ? ` (requires ${requiredAmps.toFixed(0)}A capacity for continuous load)` : ''),
      suggestedSize: suggestedSize,
      requiredAmps: Math.ceil(requiredAmps),
    };
  }

  return {
    valid: true,
    actualAmps: wireAmps,
    requiredAmps: Math.ceil(requiredAmps),
    margin: wireAmps - requiredAmps,
  };
};

/**
 * Find minimum wire size for given amperage
 *
 * @param {number} requiredAmps - Required ampacity
 * @returns {string} Wire size that meets or exceeds requirement
 */
export const findMinimumWireSize = (requiredAmps) => {
  for (const [size, amps] of Object.entries(wireSizeAmpacityTable)) {
    if (amps >= requiredAmps) {
      return size;
    }
  }
  return '750 kcmil'; // Largest size available
};

/**
 * Validate conduit fill percentage
 * NEC 300.17 - Max 40% fill for 3+ conductors
 *
 * @param {string} conduitSize - Conduit size (e.g., "2\"")
 * @param {Array<{wireSize: string, count: number}>} conductors - Array of conductor objects
 * @returns {Object} { valid: boolean, fillPercentage: number, warning?: string }
 */
export const validateConduitFill = (conduitSize, conductors) => {
  if (!conduitSize || !conductors || conductors.length === 0) {
    return { valid: false, error: 'Conduit size and conductors are required' };
  }

  const conduitArea = conduitFillTable[conduitSize];
  if (!conduitArea) {
    return { valid: false, error: `Unknown conduit size: ${conduitSize}` };
  }

  // Calculate total wire area
  let totalWireArea = 0;
  for (const conductor of conductors) {
    const wireArea = wireCrossSectionTable[conductor.wireSize];
    if (!wireArea) {
      return { valid: false, error: `Unknown wire size: ${conductor.wireSize}` };
    }
    totalWireArea += wireArea * (conductor.count || 1);
  }

  const fillPercentage = (totalWireArea / conduitArea) * 100;

  // NEC allows 40% fill for 3+ conductors
  const totalConductors = conductors.reduce((sum, c) => sum + (c.count || 1), 0);
  const maxFillPercentage = totalConductors >= 3 ? 40 : (totalConductors === 2 ? 31 : 53);

  if (fillPercentage > maxFillPercentage) {
    // Suggest larger conduit size
    const suggestedSize = findMinimumConduitSize(conductors);

    return {
      valid: false,
      fillPercentage: fillPercentage.toFixed(1),
      maxFillPercentage,
      error: `Conduit fill ${fillPercentage.toFixed(1)}% exceeds ${maxFillPercentage}% NEC limit`,
      suggestedSize,
    };
  }

  // Warn if fill is over 30% (good practice, not code violation)
  if (fillPercentage > 30 && fillPercentage <= maxFillPercentage) {
    return {
      valid: true,
      fillPercentage: fillPercentage.toFixed(1),
      maxFillPercentage,
      warning: `Conduit fill ${fillPercentage.toFixed(1)}% is acceptable but consider larger size for easier wire pulling`,
    };
  }

  return {
    valid: true,
    fillPercentage: fillPercentage.toFixed(1),
    maxFillPercentage,
  };
};

/**
 * Find minimum conduit size for given conductors
 *
 * @param {Array<{wireSize: string, count: number}>} conductors - Array of conductor objects
 * @returns {string} Conduit size that meets NEC fill requirements
 */
export const findMinimumConduitSize = (conductors) => {
  const totalConductors = conductors.reduce((sum, c) => sum + (c.count || 1), 0);
  const maxFillPercentage = totalConductors >= 3 ? 40 : (totalConductors === 2 ? 31 : 53);

  for (const size of conduitSizeOptions) {
    const result = validateConduitFill(size, conductors);
    if (result.valid && parseFloat(result.fillPercentage) <= maxFillPercentage) {
      return size;
    }
  }

  return '6"'; // Largest size available
};

/**
 * Validate voltage step-down in electrical hierarchy
 * Voltage should step down or stay the same, never step up
 *
 * @param {number} parentVoltage - Upstream equipment voltage
 * @param {number} childVoltage - Downstream equipment voltage
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateVoltageStep = (parentVoltage, childVoltage) => {
  if (!parentVoltage || !childVoltage) {
    return { valid: true, warning: 'Missing voltage information' };
  }

  // Allow tolerance of +5% for transformer secondary voltage variations
  const tolerance = 1.05;

  if (childVoltage > parentVoltage * tolerance) {
    return {
      valid: false,
      error: `Voltage step-up detected: ${childVoltage}V downstream from ${parentVoltage}V upstream`,
      violationType: 'voltage_step_up',
    };
  }

  return { valid: true };
};

/**
 * Validate amperage step-down in electrical hierarchy
 * Downstream amperage should be less than upstream (with tolerance for diversity)
 *
 * @param {number} parentAmps - Upstream equipment amperage rating
 * @param {number} childAmps - Downstream equipment amperage rating
 * @returns {Object} { valid: boolean, warning?: string }
 */
export const validateAmperageStep = (parentAmps, childAmps) => {
  if (!parentAmps || !childAmps) {
    return { valid: true, warning: 'Missing amperage information' };
  }

  // Allow 125% tolerance for sizing (NEC allows oversizing of feeder protection)
  const tolerance = 1.25;

  if (childAmps > parentAmps * tolerance) {
    return {
      valid: false,
      error: `Downstream amperage (${childAmps}A) exceeds upstream capacity (${parentAmps}A) by more than 25%`,
      warning: 'Verify feeder sizing and overcurrent protection coordination',
      violationType: 'amperage_mismatch',
    };
  }

  return { valid: true };
};

/**
 * Parse voltage string to numeric value
 * Handles formats like: "120/240V", "208Y/120V", "480V", "277/480V"
 *
 * @param {string} voltageStr - Voltage string from equipment
 * @returns {number} Highest voltage in the string
 */
export const parseVoltage = (voltageStr) => {
  if (!voltageStr || voltageStr === 'Unknown' || voltageStr === 'Not Available') {
    return 0;
  }

  // Extract all numbers from voltage string
  const matches = voltageStr.match(/\d+/g);
  if (!matches || matches.length === 0) {
    return 0;
  }

  // Return the highest voltage (line-to-line)
  return Math.max(...matches.map(n => parseInt(n)));
};

/**
 * Parse amperage string to numeric value
 * Handles formats like: "400A", "200 A", "225-Amp"
 *
 * @param {string} ampStr - Amperage string from equipment
 * @returns {number} Amperage value
 */
export const parseAmperage = (ampStr) => {
  if (!ampStr || ampStr === 'Unknown' || ampStr === 'Not Available') {
    return 0;
  }

  const match = ampStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

/**
 * Get wire size recommendations based on amperage and distance
 * Includes voltage drop calculations per NEC 210.19(A)
 *
 * @param {number} amperage - Load amperage
 * @param {number} distanceFeet - One-way distance in feet
 * @param {number} voltage - System voltage
 * @param {number} maxVoltageDrop - Max acceptable voltage drop percentage (default 3%)
 * @returns {Object} Recommendations and calculations
 */
export const getWireSizeRecommendation = (amperage, distanceFeet = 100, voltage = 240, maxVoltageDrop = 3) => {
  // Find minimum size based on ampacity
  const requiredAmps = amperage * 1.25; // 125% rule
  const minSizeByAmpacity = findMinimumWireSize(requiredAmps);

  // Calculate voltage drop for recommended size
  // Formula: VD% = (2 * K * I * D) / (CM * V) * 100
  // K = 12.9 for copper at 75°C
  // I = current in amps
  // D = one-way distance in feet
  // CM = circular mils
  // V = voltage

  const recommendations = {
    minSizeByAmpacity,
    requiredAmps: Math.ceil(requiredAmps),
    distanceFeet,
    voltage,
    maxVoltageDrop,
    notes: [],
  };

  // Add distance-based recommendation if needed
  if (distanceFeet > 100) {
    recommendations.notes.push(
      `Long run (${distanceFeet}ft) - consider voltage drop calculations`,
      'May require larger wire size than ampacity alone suggests'
    );
  }

  return recommendations;
};

/**
 * Validate electrical equipment hierarchy
 * Check for proper voltage stepping, amperage coordination, and expected flow
 *
 * @param {Array} equipment - Array of equipment objects with hierarchy info
 * @returns {Object} Validation results with errors and warnings
 */
export const validateElectricalHierarchy = (equipment) => {
  const issues = {
    errors: [],
    warnings: [],
    info: [],
  };

  if (!equipment || equipment.length === 0) {
    return issues;
  }

  equipment.forEach((item) => {
    // Find parent equipment
    if (item.parentId) {
      const parent = equipment.find(e => e.id === item.parentId);

      if (!parent) {
        issues.warnings.push({
          equipmentId: item.id,
          type: 'missing_parent',
          message: `Cannot find parent equipment (${item.parentId}) for ${item.type}`,
          suggestedAction: 'Verify electrical hierarchy relationships',
        });
        return;
      }

      // Validate voltage step
      const parentVoltage = parseVoltage(parent.aiExtractedData?.electrical?.voltage);
      const childVoltage = parseVoltage(item.aiExtractedData?.electrical?.voltage);

      const voltageValidation = validateVoltageStep(parentVoltage, childVoltage);
      if (!voltageValidation.valid) {
        issues.errors.push({
          equipmentId: item.id,
          parentId: parent.id,
          type: 'voltage_step_up',
          message: voltageValidation.error,
          suggestedAction: 'Verify voltage ratings or parent-child relationship',
        });
      }

      // Validate amperage step
      const parentAmps = parseAmperage(parent.aiExtractedData?.electrical?.busRating || parent.aiExtractedData?.electrical?.ampRating);
      const childAmps = parseAmperage(item.aiExtractedData?.electrical?.busRating || item.aiExtractedData?.electrical?.ampRating);

      const amperageValidation = validateAmperageStep(parentAmps, childAmps);
      if (!amperageValidation.valid) {
        issues.warnings.push({
          equipmentId: item.id,
          parentId: parent.id,
          type: 'amperage_mismatch',
          message: amperageValidation.error,
          suggestedAction: amperageValidation.warning,
        });
      }
    }

    // Check for missing equipment in typical hierarchy
    if (item.type === 'panel' && item.hierarchyLevel > 0) {
      // Panels should have a disconnect in their ancestry
      const hasDisconnectAncestor = hasAncestorOfType(item, equipment, 'service_disconnect');
      if (!hasDisconnectAncestor) {
        issues.info.push({
          equipmentId: item.id,
          type: 'missing_disconnect',
          message: `Panel "${item.userInputs?.designation}" has no service disconnect in hierarchy`,
          suggestedAction: 'Add service disconnect photo or verify if panel is fed from utility directly',
        });
      }
    }
  });

  return issues;
};

/**
 * Check if equipment has an ancestor of a specific type
 *
 * @param {Object} equipment - Equipment to check
 * @param {Array} allEquipment - All equipment in project
 * @param {string} ancestorType - Type to search for (e.g., 'service_disconnect')
 * @returns {boolean} True if ancestor of type exists
 */
const hasAncestorOfType = (equipment, allEquipment, ancestorType) => {
  if (!equipment.parentId) {
    return false;
  }

  const parent = allEquipment.find(e => e.id === equipment.parentId);
  if (!parent) {
    return false;
  }

  if (parent.type === ancestorType) {
    return true;
  }

  return hasAncestorOfType(parent, allEquipment, ancestorType);
};

const electricalValidation = {
  wireSizeAmpacityTable,
  wireSizeOptions,
  conduitSizeOptions,
  conduitFillTable,
  wireCrossSectionTable,
  validateWireSize,
  findMinimumWireSize,
  validateConduitFill,
  findMinimumConduitSize,
  validateVoltageStep,
  validateAmperageStep,
  parseVoltage,
  parseAmperage,
  getWireSizeRecommendation,
  validateElectricalHierarchy,
};

export default electricalValidation;
