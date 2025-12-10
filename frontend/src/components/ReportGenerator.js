// frontend/src/components/ReportGenerator.js - Enhanced for Live Preview with Editing
import React, { useState, useEffect } from "react";

const ReportGenerator = ({
  project,
  squareFootage,
  isLivePreview = false,
  currentExtractedData = null,
  currentRTUNumber = null,
  currentPanelNumber = null,
  currentTransformerNumber = null,
  currentUserInputs = null,
  equipmentType = "hvac",
  currentEquipmentSubtype = null,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState("");
  const [editingRTUs, setEditingRTUs] = useState({}); // Track which RTUs are being edited
  const [editedRTUData, setEditedRTUData] = useState({}); // Store edited RTU data
  const [isEditingElectrical, setIsEditingElectrical] = useState(false);
  const [editedElectricalReport, setEditedElectricalReport] = useState("");
  const [editingPanels, setEditingPanels] = useState({}); // Track which panels are being edited
  const [editedPanelData, setEditedPanelData] = useState({}); // Store edited panel data
  const [editingTransformers, setEditingTransformers] = useState({}); // Track which transformers are being edited
  const [editedTransformerData, setEditedTransformerData] = useState({}); // Store edited transformer data

  // Track only when editing state changes
  useEffect(() => {
    if (Object.keys(editingRTUs).length > 0) {
      console.log("=== EDITING STATE ACTIVE ===");
      console.log("Currently editing RTUs:", editingRTUs);
      console.log("Edited data:", editedRTUData);
    }
  }, [editingRTUs, editedRTUData]);

  // Early return must come after all hooks to comply with Rules of Hooks
  // Memoize saved data to prevent unnecessary re-renders
  const savedRTUs = React.useMemo(() => project?.rtus || [], [project?.rtus]);
  const savedPanels = React.useMemo(
    () => project?.electricalPanels || [],
    [project?.electricalPanels]
  );
  const savedTransformers = React.useMemo(
    () => project?.transformers || [],
    [project?.transformers]
  );

  // If we have current extracted data, create a temporary RTU/Panel object and add it to the list
  // Use useMemo to prevent creating new objects on every render
  const rtus = React.useMemo(() => {
    if (equipmentType === "hvac" && currentExtractedData) {
      return [
        ...savedRTUs,
        {
          id: `temp-${currentRTUNumber}`,
          number: currentRTUNumber,
          data: {
            ...currentExtractedData,
            condition: currentUserInputs?.condition || "Good",
            heatType: currentUserInputs?.heatType || "Electric",
            gasPipeSize:
              currentUserInputs?.heatType === "Gas"
                ? currentUserInputs?.gasPipeSize
                : null,
          },
        },
      ];
    }
    return savedRTUs;
  }, [
    savedRTUs,
    currentExtractedData,
    currentRTUNumber,
    currentUserInputs,
    equipmentType,
  ]);

  const panels = React.useMemo(() => {
    if (
      equipmentType === "electrical" &&
      currentEquipmentSubtype === "panel" &&
      currentExtractedData
    ) {
      return [
        ...savedPanels,
        {
          id: `temp-${currentPanelNumber}`,
          number: currentPanelNumber,
          data: {
            ...currentExtractedData,
            panelDesignation: currentUserInputs?.panelDesignation || "",
            panelLocation: currentUserInputs?.panelLocation || "",
            condition: currentUserInputs?.condition || "Good",
          },
        },
      ];
    }
    return savedPanels;
  }, [
    savedPanels,
    currentExtractedData,
    currentPanelNumber,
    currentUserInputs,
    equipmentType,
    currentEquipmentSubtype,
  ]);

  const transformers = React.useMemo(() => {
    if (
      equipmentType === "electrical" &&
      currentEquipmentSubtype === "transformer" &&
      currentExtractedData
    ) {
      return [
        ...savedTransformers,
        {
          id: `temp-${currentTransformerNumber}`,
          number: currentTransformerNumber,
          data: {
            ...currentExtractedData,
            transformerDesignation: currentUserInputs?.panelDesignation || "", // Using panelDesignation field
            transformerLocation: currentUserInputs?.panelLocation || "", // Using panelLocation field
            condition: currentUserInputs?.condition || "Good",
          },
        },
      ];
    }
    return savedTransformers;
  }, [
    savedTransformers,
    currentExtractedData,
    currentTransformerNumber,
    currentUserInputs,
    equipmentType,
    currentEquipmentSubtype,
  ]);

  const rtuCount = rtus.length;
  const panelCount = panels.length;
  const transformerCount = transformers.length;

  // Helper to safely extract data from nested structure
  // If the RTU has been edited, use the edited data
  const extractRTUData = (rtu) => {
    // Check if we have edited data for this RTU
    if (editedRTUData[rtu.id]) {
      return editedRTUData[rtu.id];
    }

    const data = rtu.data || {};

    // Handle both old flat structure and new nested structure
    return {
      manufacturer:
        data.basicInfo?.manufacturer || data.manufacturer || "Unknown",
      model: data.basicInfo?.model || data.model || "Unknown",
      serialNumber: data.basicInfo?.serialNumber || data.serialNumber || "",
      year:
        data.basicInfo?.manufacturingYear ||
        data.manufacturingYear ||
        "Unknown",
      age: data.basicInfo?.currentAge || data.currentAge || 0,
      tonnage: data.cooling?.tonnage || data.tonnage || "Unknown tonnage",
      serviceLifeAssessment:
        data.serviceLife?.assessment || data.serviceLifeAssessment || "",
      recommendation:
        data.serviceLife?.recommendation || data.recommendation || "",
      heatType: data.heatType || "Unknown",
      gasPipeSize: data.gasPipeSize || null,
    };
  };

  // Helper to safely extract data from electrical panel
  const extractPanelData = (panel) => {
    // Check if we have edited data for this panel
    if (editedPanelData[panel.id]) {
      return editedPanelData[panel.id];
    }

    const data = panel.data || {};

    return {
      panelDesignation: data.panelDesignation || "Panel",
      panelLocation: data.panelLocation || "Unknown Location",
      manufacturer: data.basicInfo?.manufacturer || "Unknown",
      model: data.basicInfo?.model || "Unknown",
      voltage: data.electrical?.voltage || "Unknown",
      phase: data.electrical?.phase || "Unknown",
      wireConfig: data.electrical?.wireConfig || "",
      busRating: data.electrical?.busRating || "Unknown",
      mainBreakerSize: data.incomingTermination?.mainBreakerSize || "MLO",
      condition: data.condition || "Unknown",
      isFPE: data.safetyWarnings?.isFPE || false,
      isZinsco: data.safetyWarnings?.isZinsco || false,
      isChallenger: data.safetyWarnings?.isChallenger || false,
    };
  };

  // Helper to safely extract data from transformer
  const extractTransformerData = (transformer) => {
    // Check if we have edited data for this transformer
    if (editedTransformerData[transformer.id]) {
      return editedTransformerData[transformer.id];
    }

    const data = transformer.data || {};

    return {
      transformerDesignation: data.transformerDesignation || "Transformer",
      transformerLocation: data.transformerLocation || "Unknown Location",
      manufacturer: data.basicInfo?.manufacturer || "Unknown",
      model: data.basicInfo?.model || "Unknown",
      phase: data.basicInfo?.phase || "Unknown",
      powerRating: data.electrical?.powerRating || "Unknown",
      primaryVoltage: data.electrical?.primaryVoltage || "Unknown",
      secondaryVoltage: data.electrical?.secondaryVoltage || "Unknown",
      transformerType: data.systemType?.transformerType || "Unknown",
      condition: data.condition || "Unknown",
    };
  };

  // Convert number to word
  const numberToWord = (num) => {
    const words = [
      "",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    return words[num] || num.toString();
  };

  // Calculate total tonnage
  const calculateTotalTonnage = () => {
    let total = 0;
    rtus.forEach((rtu) => {
      const rtuData = extractRTUData(rtu);
      const tonnage = rtuData.tonnage || "";
      const match = tonnage.match(/(\d+\.?\d*)/);
      if (match) {
        total += parseFloat(match[1]);
      }
    });
    return total;
  };

  const totalTonnage = calculateTotalTonnage();

  // Calculate cooling estimate from square footage
  const estimateCooling = () => {
    if (!squareFootage) return null;
    const sqft = parseFloat(squareFootage);
    const lowEstimate = (sqft / 600).toFixed(1);
    const highEstimate = (sqft / 400).toFixed(1);
    return `${lowEstimate} to ${highEstimate}`;
  };

  const coolingEstimate = estimateCooling();

  // Check if any RTU is beyond service life
  const hasOldUnits = rtus.some((rtu) => {
    const rtuData = extractRTUData(rtu);
    return rtuData.age && rtuData.age > 15;
  });

  // Generate RTU descriptions with heat type and gas pipe size
  const generateRTUDescriptions = () => {
    const ordinals = [
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
      "seventh",
      "eighth",
    ];

    return rtus
      .map((rtu, index) => {
        const rtuData = extractRTUData(rtu);
        const ordinal = ordinals[index] || `${index + 1}th`;
        const tonnage = rtuData.tonnage;
        const manufacturer = rtuData.manufacturer;
        const year = rtuData.year;
        const heatType = rtuData.heatType;
        const gasPipeSize = rtuData.gasPipeSize;

        // Build description with proper formatting for illegible data
        let description = `The ${ordinal} unit is ${
          tonnage.match(/\d/) ? "an" : "a"
        } ${tonnage} ${
          heatType === "Electric" ? "electric" : "gas-fired"
        } model manufactured by ${manufacturer}`;

        // Only add year if it's legible and not "Unknown" or "Not Available"
        if (
          year &&
          year !== "Unknown" &&
          year !== "Not legible" &&
          year !== "Not Available"
        ) {
          description += ` in ${year}`;
        } else if (year === "Not legible") {
          description += ` (manufacturing year not legible on nameplate)`;
        }

        // Add gas pipe size if it's a gas unit and we have the size
        if (heatType === "Gas" && gasPipeSize) {
          description += ` with a ${gasPipeSize} gas line`;
        }

        description += ".";

        return description;
      })
      .join(" ");
  };

  // Generate replacement recommendation
  const generateReplacementText = () => {
    if (!hasOldUnits) {
      return "With ASHRAE's estimated median service life of a packaged roof top unit being 15 years, the units are within their expected service life.";
    }

    const oldCount = rtus.filter((rtu) => {
      const rtuData = extractRTUData(rtu);
      return rtuData.age && rtuData.age > 15;
    }).length;

    if (oldCount === rtuCount) {
      return `With ASHRAE's estimated median service life of a packaged roof top unit being 15 years, ${
        rtuCount === 1 ? "this unit" : "both units"
      } would be recommended to be replaced.`;
    } else {
      return `With ASHRAE's estimated median service life of a packaged roof top unit being 15 years, ${
        oldCount === 1 ? "one unit" : `${numberToWord(oldCount)} units`
      } would be recommended to be replaced.`;
    }
  };

  // Count gas units and electric units separately
  const gasUnitsCount = rtus.filter((rtu) => {
    const rtuData = extractRTUData(rtu);
    return rtuData.heatType === "Gas";
  }).length;

  const electricUnitsCount = rtus.filter((rtu) => {
    const rtuData = extractRTUData(rtu);
    return rtuData.heatType === "Electric";
  }).length;

  // Generate opening sentence based on unit types
  const generateOpeningSentence = () => {
    if (gasUnitsCount > 0 && electricUnitsCount > 0) {
      // Mixed units
      return `The proposed space is served by ${numberToWord(
        gasUnitsCount
      )} single packaged gas-fired roof top unit${
        gasUnitsCount > 1 ? "s" : ""
      } and ${numberToWord(electricUnitsCount)} electric roof top unit${
        electricUnitsCount > 1 ? "s" : ""
      }.`;
    } else if (gasUnitsCount > 0) {
      // All gas units
      return `The proposed space is served by ${numberToWord(
        gasUnitsCount
      )} single packaged gas-fired roof top unit${
        gasUnitsCount > 1 ? "s" : ""
      }.`;
    } else if (electricUnitsCount > 0) {
      // All electric units
      return `The proposed space is served by ${numberToWord(
        electricUnitsCount
      )} single packaged electric roof top unit${
        electricUnitsCount > 1 ? "s" : ""
      }.`;
    } else {
      // Unknown type (fallback)
      return `The proposed space is served by ${numberToWord(
        rtuCount
      )} single packaged roof top unit${rtuCount > 1 ? "s" : ""}.`;
    }
  };

  const mechanicalSystemsReport = `${generateOpeningSentence()} ${generateRTUDescriptions()} ${generateReplacementText()}${
    squareFootage
      ? ` With the proposed space being approximately ${parseFloat(
          squareFootage
        ).toLocaleString()}sq.ft., Schnackel Engineers estimates ${coolingEstimate}-tons of cooling will be required, however complete heat gain/loss calculations will be performed to determine the exact amount of cooling required.`
      : ""
  } The majority of ductwork in the space is interior insulated rectangular sheet metal ductwork with insulated flexible diffuser connections.`;

  // Sort electrical equipment by hierarchy using AI-powered detection
  const sortElectricalHierarchy = (panels, transformers) => {
    const sorted = [];

    // Helper: Parse voltage to numeric for comparison
    const parseVoltage = (voltageStr) => {
      if (
        !voltageStr ||
        voltageStr === "Unknown" ||
        voltageStr === "Not Available"
      )
        return 0;
      const matches = voltageStr.match(/\d+/g);
      if (!matches) return 0;
      return Math.max(...matches.map((n) => parseInt(n)));
    };

    // Helper: Parse amp rating
    const parseAmps = (ampStr) => {
      if (!ampStr || ampStr === "Unknown" || ampStr === "Not Available")
        return 0;
      const match = ampStr.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    // Helper: Detect if panel has main breaker (vs MLO)
    const hasMainBreaker = (panel) => {
      const mainBreaker = panel.data?.incomingTermination?.mainBreakerSize;
      return mainBreaker && mainBreaker !== "MLO" && mainBreaker !== "Unknown";
    };

    // STEP 1: Add all transformers first (highest voltage primary = Level 0)
    const sortedTransformers = [...transformers].sort((a, b) => {
      const voltA = parseVoltage(a.data?.electrical?.primaryVoltage);
      const voltB = parseVoltage(b.data?.electrical?.primaryVoltage);
      return voltB - voltA;
    });

    sortedTransformers.forEach((t) => {
      sorted.push({
        type: "transformer",
        level: 0,
        voltage: parseVoltage(t.data?.electrical?.primaryVoltage),
        amps: parseAmps(t.data?.electrical?.powerRating),
        data: t,
      });
    });

    // STEP 2: Group panels by voltage level
    const panelsByVoltage = {};
    panels.forEach((p) => {
      const voltage = parseVoltage(p.data?.electrical?.voltage);
      if (!panelsByVoltage[voltage]) {
        panelsByVoltage[voltage] = [];
      }
      panelsByVoltage[voltage].push(p);
    });

    // STEP 3: Sort voltage groups (highest to lowest)
    const voltageKeys = Object.keys(panelsByVoltage)
      .map((v) => parseInt(v))
      .sort((a, b) => b - a);

    // STEP 4: Process each voltage level (each voltage = new hierarchy level)
    let currentLevel = transformers.length > 0 ? 1 : 0;

    voltageKeys.forEach((voltage, voltageIndex) => {
      const panelsAtVoltage = panelsByVoltage[voltage];

      // Sort panels within this voltage level:
      // 1. By amp rating (highest first)
      // 2. If amps equal, prioritize panel with main breaker
      // 3. If still equal, sort alphabetically by designation
      panelsAtVoltage.sort((a, b) => {
        const ampsA = parseAmps(a.data?.electrical?.busRating);
        const ampsB = parseAmps(b.data?.electrical?.busRating);

        if (ampsA !== ampsB) {
          return ampsB - ampsA; // Highest amps first
        }

        // If amps equal, prioritize main breaker
        const hasMainA = hasMainBreaker(a);
        const hasMainB = hasMainBreaker(b);
        if (hasMainA !== hasMainB) {
          return hasMainB ? 1 : -1;
        }

        // If still equal, sort alphabetically by designation
        const desigA = (a.data?.panelDesignation || "").toLowerCase();
        const desigB = (b.data?.panelDesignation || "").toLowerCase();
        return desigA.localeCompare(desigB);
      });

      // Assign type based on electrical hierarchy rules
      panelsAtVoltage.forEach((panel, panelIndex) => {
        const amps = parseAmps(panel.data?.electrical?.busRating);
        const hasMain = hasMainBreaker(panel);
        const isFirstAtVoltage = panelIndex === 0;
        const isHighestVoltage = voltageIndex === 0;

        let type;

        // RULE: Main panel = highest voltage + highest amps + main breaker
        if (isHighestVoltage && isFirstAtVoltage && hasMain) {
          type = "main";
        }
        // RULE: Distribution = 200A+ with main breaker OR 400A+ regardless
        else if ((amps >= 200 && hasMain) || amps >= 400) {
          type = "distribution";
        }
        // RULE: Branch = everything else
        else {
          type = "branch";
        }

        sorted.push({
          type: type,
          level: currentLevel,
          voltage: voltage,
          amps: amps,
          data: panel,
        });
      });

      currentLevel++; // Each voltage level gets its own hierarchy level
    });

    return sorted;
  };

  // Generate electrical systems report with hierarchy sorting
  const generateElectricalReport = () => {
  if (panels.length === 0 && transformers.length === 0) {
    return "No electrical equipment has been surveyed.";
  }

  const sortedEquipment = sortElectricalHierarchy(panels, transformers);

  let narrative = "Electrical Systems:\n\n";

  // Find the main panel (first panel in hierarchy with type='main')
  const mainEquipment = sortedEquipment.find(e => e.type === 'main');

  if (mainEquipment) {
    const mainData = extractPanelData(mainEquipment.data);
    narrative += `[USER MUST EDIT: The proposed space is served by a separately metered ${mainData.busRating}, ${mainData.voltage}, ${mainData.phase}, ${mainData.wireConfig || '4-wire'} [fused switch/breaker/disconnect] located in [LOCATION]. The service runs [overhead/underground] in a [SIZE]" conduit to Panelboard "${mainData.panelDesignation}".]\n\n`;
  }

  // Generate descriptions for all equipment in hierarchy order
  sortedEquipment.forEach((equipment, index) => {
    const data = equipment.data;

    if (equipment.type === 'transformer') {
      const transformerData = extractTransformerData(data);
      narrative += `Power is supplied by a ${transformerData.powerRating} ${transformerData.primaryVoltage}/${transformerData.secondaryVoltage} transformer (${transformerData.transformerDesignation}) manufactured by ${transformerData.manufacturer} located in ${transformerData.transformerLocation}. The transformer is in ${transformerData.condition.toLowerCase()} condition.`;

      // Check if next item is a panel - add connection language
      const nextItem = sortedEquipment[index + 1];
      if (nextItem && nextItem.type !== 'transformer') {
        const nextPanel = extractPanelData(nextItem.data);
        narrative += ` The secondary feeds Panelboard "${nextPanel.panelDesignation}".`;
      }

      narrative += `\n\n`;
    }

    if (equipment.type === 'main' || equipment.type === 'distribution' || equipment.type === 'branch') {
      const panelData = extractPanelData(data);

      narrative += `Panelboard "${panelData.panelDesignation}" is a ${panelData.busRating} ${panelData.voltage} ${panelData.phase} ${panelData.wireConfig || ''} panel`;

      if (panelData.mainBreakerSize !== "MLO" && panelData.mainBreakerSize !== "Unknown") {
        narrative += ` with a ${panelData.mainBreakerSize} main breaker`;
      } else if (panelData.mainBreakerSize === "MLO") {
        narrative += ` with main lug only (MLO)`;
      }

      // Look ahead: does this panel feed the next one?
      const nextItem = sortedEquipment[index + 1];
      if (nextItem && nextItem.type !== 'transformer') {
        // Panel feeds next if: different voltage OR same voltage but lower amps
        if (nextItem.voltage < equipment.voltage ||
            (nextItem.voltage === equipment.voltage && nextItem.amps < equipment.amps)) {
          const nextPanel = extractPanelData(nextItem.data);
          narrative += ` and has a subfeed breaker serving Panelboard "${nextPanel.panelDesignation}"`;
        }
      }

      narrative += `.`;

      if (panelData.panelLocation && panelData.panelLocation !== "Unknown Location") {
        narrative += ` Located in ${panelData.panelLocation}.`;
      }

      narrative += `\n\n`;
    }
  });

  // Condition assessment
  const allGood = panels.every(p => {
    const pd = extractPanelData(p);
    return pd.condition === "Good" && !pd.isFPE && !pd.isZinsco && !pd.isChallenger;
  });

  const hasHazardous = panels.some(p => {
    const pd = extractPanelData(p);
    return pd.isFPE || pd.isZinsco || pd.isChallenger || pd.condition === "Hazardous";
  });

  if (hasHazardous) {
    narrative += "CRITICAL: One or more panels present serious safety hazards and require IMMEDIATE REPLACEMENT.\n\n";
  } else if (allGood) {
    narrative += "All electrical equipment is in good condition and should be reused.\n\n";
  } else {
    narrative += "Some electrical equipment shows signs of wear and may require replacement or upgrade.\n\n";
  }

  narrative += "[USER ADDS: Telephone service information if applicable]";

  return narrative;
};

  const electricalSystemsReport = generateElectricalReport();

  // Update edited report when mechanicalSystemsReport changes (new RTUs added or edited)
  useEffect(() => {
    setEditedReport(mechanicalSystemsReport);
  }, [mechanicalSystemsReport, editedRTUData]);

  // Update edited electrical report when electricalSystemsReport changes
  useEffect(() => {
    setEditedElectricalReport(electricalSystemsReport);
  }, [electricalSystemsReport, editedPanelData]);

  // Handle RTU editing
  const startEditingRTU = (rtuId) => {
    const rtu = rtus.find((r) => r.id === rtuId);
    if (rtu) {
      const rtuData = extractRTUData(rtu);
      console.log("Starting edit for RTU:", rtuId, "with data:", rtuData);

      // Use functional updates to ensure state is set correctly
      setEditedRTUData((prev) => ({ ...prev, [rtuId]: rtuData }));
      setEditingRTUs((prev) => ({ ...prev, [rtuId]: true }));
    }
  };

  const updateRTUField = (rtuId, field, value) => {
    console.log("=== UPDATE RTU FIELD ===");
    console.log("RTU ID:", rtuId);
    console.log("Field:", field);
    console.log("New value:", value);

    setEditedRTUData((prev) => {
      console.log("Previous editedRTUData:", prev);
      const updated = {
        ...prev,
        [rtuId]: {
          ...(prev[rtuId] || {}),
          [field]: value,
        },
      };
      console.log("Updated editedRTUData:", updated);
      return updated;
    });
  };

  const saveRTUEdit = (rtuId) => {
    // Handle temp RTUs (live preview) - just update local state, will be saved when user clicks "Save & Add RTU"
    if (rtuId.startsWith("temp-")) {
      setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));
      // The edited data stays in editedRTUData and will be used in display
      return;
    }

    try {
      const savedProjects = localStorage.getItem("mep-survey-projects");
      if (!savedProjects) {
        alert("Error: No projects found in storage");
        return;
      }

      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === project.id);

      if (projectIndex === -1) {
        alert("Error: Project not found");
        return;
      }

      const rtuIndex = projects[projectIndex].rtus.findIndex(
        (r) => r.id === rtuId
      );
      if (rtuIndex === -1) {
        alert("Error: RTU not found");
        return;
      }

      // Update the RTU data with edited values
      const updatedData = editedRTUData[rtuId];

      // Validate that we have edited data
      if (!updatedData) {
        alert(
          "Error: No edited data found for this RTU. Please try editing again."
        );
        console.error("Missing edited data for RTU:", rtuId);
        console.error("Current editedRTUData:", editedRTUData);
        setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));
        return;
      }
      const originalRTU = projects[projectIndex].rtus[rtuIndex];

      console.log("=== SAVE RTU EDIT DEBUG ===");
      console.log(
        "Before save - Total RTU count:",
        projects[projectIndex].rtus.length
      );
      console.log("Updating RTU ID:", rtuId);
      console.log("Updating RTU at index:", rtuIndex);
      console.log("Updated data:", updatedData);

      // IMPORTANT: Preserve ALL original data, only update the specific fields
      const updatedRTU = {
        ...originalRTU,
        data: {
          ...originalRTU.data,
          basicInfo: {
            ...(originalRTU.data?.basicInfo || {}),
            manufacturer: updatedData.manufacturer,
            model: updatedData.model,
            manufacturingYear: updatedData.year,
            currentAge: parseInt(updatedData.age) || 0,
          },
          cooling: {
            ...(originalRTU.data?.cooling || {}),
            tonnage: updatedData.tonnage,
          },
        },
      };

      // Replace only the specific RTU, keeping all others intact
      projects[projectIndex].rtus[rtuIndex] = updatedRTU;
      projects[projectIndex].lastModified = new Date().toISOString();

      console.log(
        "After update - Total RTU count:",
        projects[projectIndex].rtus.length
      );
      console.log(
        "All RTU IDs:",
        projects[projectIndex].rtus.map((r) => ({ id: r.id, number: r.number }))
      );

      // Save to localStorage
      localStorage.setItem("mep-survey-projects", JSON.stringify(projects));
      console.log("Saved to localStorage successfully");

      // Verify the save
      const verification = JSON.parse(
        localStorage.getItem("mep-survey-projects")
      );
      const verifiedProject = verification.find((p) => p.id === project.id);
      console.log(
        "Verification - RTU count after save:",
        verifiedProject.rtus.length
      );
      console.log("=== END DEBUG ===");

      // Exit edit mode
      setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));

      alert(
        `RTU saved successfully! RTU count: ${verifiedProject.rtus.length}\n\nThe page will now reload to show your changes.`
      );

      // Reload after user clicks OK
      window.location.reload();
    } catch (error) {
      console.error("Error saving RTU edit:", error);
      alert(`Error saving RTU: ${error.message}\n\nCheck console for details.`);
    }
  };

  const cancelRTUEdit = (rtuId) => {
    setEditingRTUs((prev) => ({ ...prev, [rtuId]: false }));
    setEditedRTUData((prev) => {
      const newData = { ...prev };
      delete newData[rtuId];
      return newData;
    });
  };

  // Handle Panel editing
  const startEditingPanel = (panelId) => {
    const panel = panels.find((p) => p.id === panelId);
    if (panel) {
      const panelData = extractPanelData(panel);
      setEditedPanelData((prev) => ({ ...prev, [panelId]: panelData }));
      setEditingPanels((prev) => ({ ...prev, [panelId]: true }));
    }
  };

  const updatePanelField = (panelId, field, value) => {
    setEditedPanelData((prev) => ({
      ...prev,
      [panelId]: {
        ...(prev[panelId] || {}),
        [field]: value,
      },
    }));
  };

  const savePanelEdit = (panelId) => {
    // Handle temp panels (live preview) - just update local state
    if (panelId.startsWith("temp-")) {
      setEditingPanels((prev) => ({ ...prev, [panelId]: false }));
      return;
    }

    try {
      const savedProjects = localStorage.getItem("mep-survey-projects");
      if (!savedProjects) {
        alert("Error: No projects found in storage");
        return;
      }

      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === project.id);

      if (projectIndex === -1) {
        alert("Error: Project not found");
        return;
      }

      const panelIndex = projects[projectIndex].electricalPanels.findIndex(
        (p) => p.id === panelId
      );
      if (panelIndex === -1) {
        alert("Error: Panel not found");
        return;
      }

      const updatedData = editedPanelData[panelId];
      if (!updatedData) {
        alert("Error: No edited data found for this panel");
        setEditingPanels((prev) => ({ ...prev, [panelId]: false }));
        return;
      }

      const originalPanel = projects[projectIndex].electricalPanels[panelIndex];

      // Preserve ALL original data, only update specific fields
      const updatedPanel = {
        ...originalPanel,
        data: {
          ...originalPanel.data,
          panelDesignation: updatedData.panelDesignation,
          panelLocation: updatedData.panelLocation,
          condition: updatedData.condition,
          basicInfo: {
            ...(originalPanel.data?.basicInfo || {}),
            manufacturer: updatedData.manufacturer,
            model: updatedData.model,
          },
          electrical: {
            ...(originalPanel.data?.electrical || {}),
            voltage: updatedData.voltage,
            busRating: updatedData.busRating,
          },
          incomingTermination: {
            ...(originalPanel.data?.incomingTermination || {}),
            mainBreakerSize: updatedData.mainBreakerSize,
          },
        },
      };

      projects[projectIndex].electricalPanels[panelIndex] = updatedPanel;
      projects[projectIndex].lastModified = new Date().toISOString();

      localStorage.setItem("mep-survey-projects", JSON.stringify(projects));

      setEditingPanels((prev) => ({ ...prev, [panelId]: false }));

      alert(
        "Panel saved successfully! The page will now reload to show your changes."
      );
      window.location.reload();
    } catch (error) {
      console.error("Error saving panel edit:", error);
      alert(`Error saving panel: ${error.message}`);
    }
  };

  const cancelPanelEdit = (panelId) => {
    setEditingPanels((prev) => ({ ...prev, [panelId]: false }));
    setEditedPanelData((prev) => {
      const newData = { ...prev };
      delete newData[panelId];
      return newData;
    });
  };

  // Handle Transformer editing
  const startEditingTransformer = (transformerId) => {
    const transformer = transformers.find((t) => t.id === transformerId);
    if (transformer) {
      const transformerData = extractTransformerData(transformer);
      setEditedTransformerData((prev) => ({
        ...prev,
        [transformerId]: transformerData,
      }));
      setEditingTransformers((prev) => ({ ...prev, [transformerId]: true }));
    }
  };

  const updateTransformerField = (transformerId, field, value) => {
    setEditedTransformerData((prev) => ({
      ...prev,
      [transformerId]: {
        ...(prev[transformerId] || {}),
        [field]: value,
      },
    }));
  };

  const saveTransformerEdit = (transformerId) => {
    // Handle temp transformers (live preview) - just update local state
    if (transformerId.startsWith("temp-")) {
      setEditingTransformers((prev) => ({ ...prev, [transformerId]: false }));
      return;
    }

    try {
      const savedProjects = localStorage.getItem("mep-survey-projects");
      if (!savedProjects) {
        alert("Error: No projects found in storage");
        return;
      }

      const projects = JSON.parse(savedProjects);
      const projectIndex = projects.findIndex((p) => p.id === project.id);

      if (projectIndex === -1) {
        alert("Error: Project not found");
        return;
      }

      const transformerIndex = projects[projectIndex].transformers.findIndex(
        (t) => t.id === transformerId
      );
      if (transformerIndex === -1) {
        alert("Error: Transformer not found");
        return;
      }

      const updatedData = editedTransformerData[transformerId];
      if (!updatedData) {
        alert("Error: No edited data found for this transformer");
        setEditingTransformers((prev) => ({ ...prev, [transformerId]: false }));
        return;
      }

      const originalTransformer =
        projects[projectIndex].transformers[transformerIndex];

      // Preserve ALL original data, only update specific fields
      const updatedTransformer = {
        ...originalTransformer,
        data: {
          ...originalTransformer.data,
          transformerDesignation: updatedData.transformerDesignation,
          transformerLocation: updatedData.transformerLocation,
          condition: updatedData.condition,
          basicInfo: {
            ...(originalTransformer.data?.basicInfo || {}),
            manufacturer: updatedData.manufacturer,
            model: updatedData.model,
            phase: updatedData.phase,
          },
          electrical: {
            ...(originalTransformer.data?.electrical || {}),
            powerRating: updatedData.powerRating,
            primaryVoltage: updatedData.primaryVoltage,
            secondaryVoltage: updatedData.secondaryVoltage,
          },
        },
      };

      projects[projectIndex].transformers[transformerIndex] =
        updatedTransformer;
      projects[projectIndex].lastModified = new Date().toISOString();

      localStorage.setItem("mep-survey-projects", JSON.stringify(projects));

      setEditingTransformers((prev) => ({ ...prev, [transformerId]: false }));

      alert(
        "Transformer saved successfully! The page will now reload to show your changes."
      );
      window.location.reload();
    } catch (error) {
      console.error("Error saving transformer edit:", error);
      alert(`Error saving transformer: ${error.message}`);
    }
  };

  const cancelTransformerEdit = (transformerId) => {
    setEditingTransformers((prev) => ({ ...prev, [transformerId]: false }));
    setEditedTransformerData((prev) => {
      const newData = { ...prev };
      delete newData[transformerId];
      return newData;
    });
  };

  // Early return after all hooks to comply with Rules of Hooks
  if (
    !project ||
    (rtus.length === 0 &&
      panels.length === 0 &&
      transformers.length === 0 &&
      !currentExtractedData)
  ) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <h3>No Equipment to Report</h3>
        <p>Capture equipment nameplates to generate the report.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Live Preview Badge */}
      {isLivePreview && (
        <div
          style={{
            backgroundColor:
              equipmentType === "electrical" ? "#28a745" : "#007bff",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          🔴 LIVE REPORT PREVIEW •{" "}
          {equipmentType === "electrical"
            ? `${panelCount} Panel${
                panelCount > 1 ? "s" : ""
              }, ${transformerCount} Transformer${
                transformerCount > 1 ? "s" : ""
              } Captured`
            : `${rtuCount} RTU${rtuCount > 1 ? "s" : ""} Captured`}
        </div>
      )}

      {/* Schnackel Header */}
      <div
        style={{
          borderBottom: "2px solid #333",
          paddingBottom: "20px",
          marginBottom: "30px",
        }}
      >
        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "#007bff",
            marginBottom: "5px",
          }}
        >
          SCHNACKEL ENGINEERS
        </div>
        <div style={{ fontSize: "14px", color: "#666" }}>MEP Survey Report</div>
      </div>

      {/* Date and Project Info */}
      <div style={{ marginBottom: "30px", fontSize: "14px" }}>
        <p>
          <strong>DATE:</strong> {new Date().toLocaleDateString()}
        </p>
        <p>
          <strong>Client Name:</strong> {project.clientName || "[Client Name]"}
        </p>
        <p>
          <strong>Company Address:</strong> {project.address || "[Address]"}
        </p>
        <p>
          <strong>RE: Project Name:</strong> {project.name}
        </p>
        <p>
          <strong>Schnackel Project No.:</strong> {project.projectNumber}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <p>Dear {project.clientName || "Client"}:</p>
        <p>
          I visited the proposed {project.name} on{" "}
          {new Date(project.surveyDate).toLocaleDateString()}. The following is
          summary of the mechanical, electrical, and plumbing systems at this
          location. The proposed space consisted of a single space which was
          vacant at the time of my visit.
        </p>
      </div>

      {/* Investigation Performed By */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "10px",
            textDecoration: "underline",
          }}
        >
          Survey Performed by:
        </h3>
        <p>{project.surveyorName || "Surveyor Name"}</p>
        <p>Schnackel Engineers</p>
        <p>Telephone No. 402-391-7680, Fax No. 402-391-7488</p>
      </div>

      {/* Site Address */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "10px",
            textDecoration: "underline",
          }}
        >
          Site Address:
        </h3>
        <p>{project.address || "[Site Address]"}</p>
        {squareFootage && (
          <p>
            Approximate Area: {parseFloat(squareFootage).toLocaleString()}{" "}
            sq.ft.
          </p>
        )}
      </div>

      {/* Mechanical Systems - THE MAIN CONTENT WITH EDITING */}
      <div style={{ marginBottom: "30px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              margin: 0,
              textDecoration: "underline",
            }}
          >
            Mechanical Systems:
          </h3>
          {isLivePreview && (
            <button
              onClick={() => {
                if (isEditing) {
                  // Save edit
                  setIsEditing(false);
                } else {
                  // Start editing
                  setIsEditing(true);
                }
              }}
              className="btn"
              style={{
                padding: "5px 15px",
                fontSize: "12px",
                backgroundColor: isEditing ? "#28a745" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {isEditing ? "✓ Save" : "✏️ Edit"}
            </button>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editedReport}
            onChange={(e) => setEditedReport(e.target.value)}
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "10px",
              fontSize: "14px",
              lineHeight: "1.6",
              border: "2px solid #007bff",
              borderRadius: "4px",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        ) : (
          <p
            style={{
              textAlign: "justify",
              lineHeight: "1.6",
              fontSize: "14px",
            }}
          >
            {editedReport}
          </p>
        )}
      </div>

      {/* RTU Summary Table */}
      <div style={{ marginTop: "30px" }}>
        <h4 style={{ marginBottom: "15px" }}>Equipment Summary:</h4>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                RTU #
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Manufacturer
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Model
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Capacity
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Year
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Age
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "left",
                }}
              >
                Status
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rtus.map((rtu, index) => {
              const rtuData = extractRTUData(rtu);
              const isEditingThisRTU = editingRTUs[rtu.id];

              // For temp RTUs (live preview), always use edited data if it exists
              // For saved RTUs, only use edited data when actively editing
              const isTempRTU = rtu.id.startsWith("temp-");
              const displayData =
                (isTempRTU && editedRTUData[rtu.id]) ||
                (isEditingThisRTU && editedRTUData[rtu.id])
                  ? editedRTUData[rtu.id]
                  : rtuData;

              return (
                <tr key={rtu.id}>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    #{rtu.number}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.manufacturer}
                        onChange={(e) =>
                          updateRTUField(rtu.id, "manufacturer", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "4px",
                          fontSize: "13px",
                        }}
                      />
                    ) : (
                      rtuData.manufacturer
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.model}
                        onChange={(e) =>
                          updateRTUField(rtu.id, "model", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "4px",
                          fontSize: "13px",
                        }}
                      />
                    ) : (
                      rtuData.model
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.tonnage}
                        onChange={(e) =>
                          updateRTUField(rtu.id, "tonnage", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "4px",
                          fontSize: "13px",
                        }}
                      />
                    ) : (
                      rtuData.tonnage
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="text"
                        value={displayData.year}
                        onChange={(e) =>
                          updateRTUField(rtu.id, "year", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "4px",
                          fontSize: "13px",
                        }}
                      />
                    ) : (
                      rtuData.year
                    )}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {isEditingThisRTU ? (
                      <input
                        type="number"
                        value={displayData.age}
                        onChange={(e) =>
                          updateRTUField(rtu.id, "age", e.target.value)
                        }
                        style={{
                          width: "60px",
                          padding: "4px",
                          fontSize: "13px",
                        }}
                      />
                    ) : (
                      `${rtuData.age} years`
                    )}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "10px",
                      color: rtuData.age > 15 ? "#d32f2f" : "#388e3c",
                      fontWeight: "bold",
                    }}
                  >
                    {rtuData.age > 15 ? "Replace" : "OK"}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "10px",
                      textAlign: "center",
                    }}
                  >
                    {isEditingThisRTU ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          onClick={() => saveRTUEdit(rtu.id)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✓ Save
                        </button>
                        <button
                          onClick={() => cancelRTUEdit(rtu.id)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "12px",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditingRTU(rtu.id)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        title="Edit RTU"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr style={{ backgroundColor: "#f0f0f0", fontWeight: "bold" }}>
              <td
                colSpan="3"
                style={{ border: "1px solid #ddd", padding: "10px" }}
              >
                Total Cooling Capacity
              </td>
              <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                {totalTonnage.toFixed(1)} tons
              </td>
              <td
                colSpan="4"
                style={{ border: "1px solid #ddd", padding: "10px" }}
              >
                {coolingEstimate && `Estimated Need: ${coolingEstimate} tons`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Electrical Systems Section - Only show if there are panels */}
      {panels.length > 0 && (
        <div style={{ marginBottom: "30px", marginTop: "40px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                margin: 0,
                textDecoration: "underline",
              }}
            >
              Electrical Systems:
            </h3>
            {isLivePreview && (
              <button
                onClick={() => {
                  if (isEditingElectrical) {
                    setIsEditingElectrical(false);
                  } else {
                    setIsEditingElectrical(true);
                  }
                }}
                className="btn"
                style={{
                  padding: "5px 15px",
                  fontSize: "12px",
                  backgroundColor: isEditingElectrical ? "#28a745" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {isEditingElectrical ? "✓ Save" : "✏️ Edit"}
              </button>
            )}
          </div>
          {isEditingElectrical ? (
            <textarea
              value={editedElectricalReport}
              onChange={(e) => setEditedElectricalReport(e.target.value)}
              style={{
                width: "100%",
                minHeight: "150px",
                padding: "10px",
                fontSize: "14px",
                lineHeight: "1.6",
                border: "2px solid #28a745",
                borderRadius: "4px",
                fontFamily: "inherit",
                resize: "vertical",
                whiteSpace: "pre-wrap",
              }}
            />
          ) : (
            <p
              style={{
                textAlign: "justify",
                lineHeight: "1.6",
                fontSize: "14px",
                whiteSpace: "pre-wrap",
              }}
            >
              {editedElectricalReport}
            </p>
          )}

          {/* Transformer Summary Table - BEFORE Panel Table */}
          {transformers.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h4 style={{ marginBottom: "15px" }}>Transformer Summary:</h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Transformer
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Manufacturer
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      kVA
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Primary
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Secondary
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Location
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Condition
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Recommendation
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transformers.map((transformer) => {
                    const transformerData = extractTransformerData(transformer);
                    const isEditingThisTransformer =
                      editingTransformers[transformer.id];
                    const isTempTransformer =
                      transformer.id.startsWith("temp-");
                    const displayData =
                      (isTempTransformer &&
                        editedTransformerData[transformer.id]) ||
                      (isEditingThisTransformer &&
                        editedTransformerData[transformer.id])
                        ? editedTransformerData[transformer.id]
                        : transformerData;

                    return (
                      <tr key={transformer.id}>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <input
                              type="text"
                              value={displayData.transformerDesignation}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "transformerDesignation",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            />
                          ) : (
                            transformerData.transformerDesignation
                          )}
                        </td>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <input
                              type="text"
                              value={displayData.manufacturer}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "manufacturer",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            />
                          ) : (
                            transformerData.manufacturer
                          )}
                        </td>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <input
                              type="text"
                              value={displayData.powerRating}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "powerRating",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            />
                          ) : (
                            transformerData.powerRating
                          )}
                        </td>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <input
                              type="text"
                              value={displayData.primaryVoltage}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "primaryVoltage",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            />
                          ) : (
                            transformerData.primaryVoltage
                          )}
                        </td>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <input
                              type="text"
                              value={displayData.secondaryVoltage}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "secondaryVoltage",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            />
                          ) : (
                            transformerData.secondaryVoltage
                          )}
                        </td>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <input
                              type="text"
                              value={displayData.transformerLocation}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "transformerLocation",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            />
                          ) : (
                            transformerData.transformerLocation
                          )}
                        </td>
                        <td
                          style={{ border: "1px solid #ddd", padding: "10px" }}
                        >
                          {isEditingThisTransformer ? (
                            <select
                              value={displayData.condition}
                              onChange={(e) =>
                                updateTransformerField(
                                  transformer.id,
                                  "condition",
                                  e.target.value
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px",
                                fontSize: "13px",
                              }}
                            >
                              <option value="Good">Good</option>
                              <option value="Fair">Fair</option>
                              <option value="Poor">Poor</option>
                            </select>
                          ) : (
                            transformerData.condition
                          )}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "10px",
                            color:
                              transformerData.condition === "Poor"
                                ? "#d32f2f"
                                : "#388e3c",
                            fontWeight: "bold",
                          }}
                        >
                          {transformerData.condition === "Poor"
                            ? "Monitor"
                            : "Reuse"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "10px",
                            textAlign: "center",
                          }}
                        >
                          {isEditingThisTransformer ? (
                            <div
                              style={{
                                display: "flex",
                                gap: "5px",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                onClick={() =>
                                  saveTransformerEdit(transformer.id)
                                }
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  backgroundColor: "#28a745",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                ✓ Save
                              </button>
                              <button
                                onClick={() =>
                                  cancelTransformerEdit(transformer.id)
                                }
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  backgroundColor: "#6c757d",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                startEditingTransformer(transformer.id)
                              }
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                              title="Edit Transformer"
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Panel Summary Table */}
          {panels.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h4 style={{ marginBottom: "15px" }}>Panel Summary:</h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Panel
                    </th>
                    <th style={{ border: "1px solid #ddd", padding: "10px", textAlign: "left" }}>
  Hierarchy
</th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Manufacturer
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Bus Rating
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Voltage
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Main Breaker
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Condition
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      Recommendation
                    </th>
                    <th
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortElectricalHierarchy(panels, transformers)
                    .filter((e) => e.type !== "transformer") // Transformers have separate table
                    .map((equipment, index) => {
                      const panel = equipment.data;
                      const panelData = extractPanelData(panel);
                      const isEditingThisPanel = editingPanels[panel.id];
                      const isTempPanel = panel.id.startsWith("temp-");
                      const displayData =
                        (isTempPanel && editedPanelData[panel.id]) ||
                        (isEditingThisPanel && editedPanelData[panel.id])
                          ? editedPanelData[panel.id]
                          : panelData;

                      const needsReplacement =
                        panelData.isFPE ||
                        panelData.isZinsco ||
                        panelData.isChallenger ||
                        panelData.condition === "Hazardous";

                      return (
                        <tr
                          key={panel.id}
                          style={{
                            backgroundColor: needsReplacement
                              ? "#ffebee"
                              : "transparent",
                          }}
                        >
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <input
                                type="text"
                                value={displayData.panelDesignation}
                                onChange={(e) =>
                                  updatePanelField(
                                    panel.id,
                                    "panelDesignation",
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px",
                                  fontSize: "13px",
                                }}
                              />
                            ) : (
                              panelData.panelDesignation
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "5px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                {equipment.type === "main" && (
                                  <span title="Main Service Panel">🔴</span>
                                )}
                                {equipment.type === "distribution" && (
                                  <span title="Distribution Panel">🟡</span>
                                )}
                                {equipment.type === "branch" && (
                                  <span title="Branch Panel">🟢</span>
                                )}
                                <strong>
                                  {equipment.type === "main" && "Main"}
                                  {equipment.type === "distribution" &&
                                    "Distribution"}
                                  {equipment.type === "branch" && "Branch"}
                                </strong>
                              </div>
                              <span style={{ fontSize: "11px", color: "#666" }}>
                                L{equipment.level} • {equipment.voltage}V •{" "}
                                {equipment.amps}A
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <input
                                type="text"
                                value={displayData.manufacturer}
                                onChange={(e) =>
                                  updatePanelField(
                                    panel.id,
                                    "manufacturer",
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px",
                                  fontSize: "13px",
                                }}
                              />
                            ) : (
                              panelData.manufacturer
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <input
                                type="text"
                                value={displayData.busRating}
                                onChange={(e) =>
                                  updatePanelField(
                                    panel.id,
                                    "busRating",
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px",
                                  fontSize: "13px",
                                }}
                              />
                            ) : (
                              panelData.busRating
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <input
                                type="text"
                                value={displayData.voltage}
                                onChange={(e) =>
                                  updatePanelField(
                                    panel.id,
                                    "voltage",
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px",
                                  fontSize: "13px",
                                }}
                              />
                            ) : (
                              panelData.voltage
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <input
                                type="text"
                                value={displayData.mainBreakerSize}
                                onChange={(e) =>
                                  updatePanelField(
                                    panel.id,
                                    "mainBreakerSize",
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px",
                                  fontSize: "13px",
                                }}
                              />
                            ) : (
                              panelData.mainBreakerSize
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <select
                                value={displayData.condition}
                                onChange={(e) =>
                                  updatePanelField(
                                    panel.id,
                                    "condition",
                                    e.target.value
                                  )
                                }
                                style={{
                                  width: "100%",
                                  padding: "4px",
                                  fontSize: "13px",
                                }}
                              >
                                <option value="Good">Good</option>
                                <option value="Fair">Fair</option>
                                <option value="Poor">Poor</option>
                                <option value="Hazardous">Hazardous</option>
                              </select>
                            ) : (
                              panelData.condition
                            )}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                              color: needsReplacement ? "#d32f2f" : "#388e3c",
                              fontWeight: "bold",
                            }}
                          >
                            {needsReplacement ? "REPLACE" : "Reuse"}
                          </td>
                          <td
                            style={{
                              border: "1px solid #ddd",
                              padding: "10px",
                              textAlign: "center",
                            }}
                          >
                            {isEditingThisPanel ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "5px",
                                  justifyContent: "center",
                                }}
                              >
                                <button
                                  onClick={() => savePanelEdit(panel.id)}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✓ Save
                                </button>
                                <button
                                  onClick={() => cancelPanelEdit(panel.id)}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    backgroundColor: "#6c757d",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✕ Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingPanel(panel.id)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  backgroundColor: "#007bff",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                                title="Edit Panel"
                              >
                                ✏️ Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Export Buttons - Only show when not in live preview */}
      {!isLivePreview && (
        <div
          style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "2px solid #ddd",
            display: "flex",
            gap: "15px",
          }}
        >
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{ flex: 1, padding: "12px" }}
          >
            🖨️ Print Report
          </button>
          <button
            onClick={() => {
              const reportText = document.querySelector(".card").innerText;
              const blob = new Blob([reportText], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.projectNumber}_MEP_Report.txt`;
              a.click();
            }}
            className="btn"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#28a745",
              color: "white",
            }}
          >
            💾 Export Report
          </button>
        </div>
      )}

      {/* Report Metadata */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <p style={{ margin: "0 0 5px 0" }}>
          <strong>Report Generated:</strong> {new Date().toLocaleString()}
        </p>
        <p style={{ margin: "0 0 5px 0" }}>
          <strong>RTUs Analyzed:</strong> {rtuCount}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Survey Date:</strong>{" "}
          {new Date(project.surveyDate).toLocaleDateString()}
        </p>
        {isLivePreview && (
          <p
            style={{
              margin: "10px 0 0 0",
              color: "#28a745",
              fontWeight: "bold",
            }}
          >
            ⚡ This report updates automatically as you capture RTUs
          </p>
        )}
      </div>
    </div>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(ReportGenerator, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props actually changed
  return (
    prevProps.project === nextProps.project &&
    prevProps.squareFootage === nextProps.squareFootage &&
    prevProps.isLivePreview === nextProps.isLivePreview &&
    prevProps.currentExtractedData === nextProps.currentExtractedData &&
    prevProps.currentRTUNumber === nextProps.currentRTUNumber &&
    prevProps.currentPanelNumber === nextProps.currentPanelNumber &&
    prevProps.currentTransformerNumber === nextProps.currentTransformerNumber &&
    prevProps.equipmentType === nextProps.equipmentType &&
    prevProps.currentEquipmentSubtype === nextProps.currentEquipmentSubtype &&
    JSON.stringify(prevProps.currentUserInputs) ===
      JSON.stringify(nextProps.currentUserInputs)
  );
});
