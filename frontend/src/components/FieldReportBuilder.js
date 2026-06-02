import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectById } from "../utils/projectStore";
import "./FieldReportBuilder.css";

const steps = [
  { id: "project", label: "Project Info" },
  { id: "mechanical", label: "Mechanical" },
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "fire", label: "Fire Protection" },
  { id: "review", label: "Review" },
];

const emptyRtu = () => ({
  id: `rtu-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  designation: "",
  heatType: "Electric",
  condition: "Good",
  tonnage: "",
  manufacturer: "",
  model: "",
  manufacturingYear: "",
  age: "",
  aiStatus: "Not analyzed",
  notes: "",
  gasPipeSize: "",
  gasRoute: "",
  gasNotes: "",
  photos: [],
});

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
];

const serviceSizeOptions = ["100-amp", "200-amp", "225-amp", "400-amp", "600-amp", "Other"];
const voltageOptions = ["120/208V", "120/240V", "277/480V", "208Y/120V", "480Y/277V", "Other"];
const phaseOptions = ["1-phase, 3-wire", "3-phase, 3-wire", "3-phase, 4-wire", "Other"];
const guideText = {
  nameplate:
    "Nameplate photo: take the picture straight-on, centered, flat, close enough to read, and without glare. Include the full label edges if possible. If the label is faded, upload it anyway and mark unreadable fields as Not legible.",
  ductwork:
    "Ducted means supply/return air moves through ductwork. Plenum return means the ceiling or open space is used as the return air path. Look for sheet metal duct, round spiral duct, flex duct to diffusers, interior insulation, exterior wrap, damaged insulation, or no visible ductwork.",
  waterMeter:
    "Water meter size is the service/meter pipe size serving the tenant space, not a small fixture branch. Look at the pipe entering/leaving the meter or the tag on the meter assembly.",
  electricalMeter:
    "The electrical meter/service equipment is mandatory. Look for the meter, main disconnect, fused switch, or main breaker serving the tenant space. The service size, voltage, and phase are usually on the label inside or on the deadfront.",
  serviceSize:
    "Service size is usually the amp rating of the main disconnect, fused switch, or main circuit breaker. Examples: 200A, 225A, 400A.",
  voltage:
    "Voltage is usually printed on the panel/service label. Common values are 120/208V, 120/240V, 277/480V, 208Y/120V, and 480Y/277V.",
  phase:
    "Phase/wire count is usually printed near voltage. Look for 1-phase, 3-phase, 3-wire, or 4-wire.",
  panelboard:
    "Panelboard information is on the panel label or directory. Capture designation, amp rating, voltage, phase/wires, pole spaces, main breaker, and what feeds it.",
  transformer:
    "Transformer labels usually show kVA, primary voltage, secondary voltage, and phase. They are often near panels, in electrical rooms, back of office areas, or mall mechanical rooms.",
  gasMeter:
    "Gas meters are usually outside on the rear or side of the building. Document the meter location, pipe size leaving the meter, route to the roof, and whether it serves the rooftop units.",
  riser:
    "The sprinkler riser is the vertical sprinkler piping assembly with valves, gauges, drain/test connections, and sometimes a flow switch. It is often in a mechanical room or back-of-house area.",
  mainLine:
    "Sprinkler mains are the larger pipes feeding the tenant space or sprinkler zone. Note the pipe size, how many mains enter, and the direction they enter from.",
  branchLine:
    "Sprinkler mains are larger pipes feeding the area. Branch lines are smaller pipes that tap off the mains and feed sprinkler heads. Note pipe sizes, direction, and whether lines run side-to-side or front-to-back.",
  fireAlarmPanel:
    "The Fire Alarm Control Unit, or FACU, is the main fire alarm panel. It is often red and may be near the front entry, in a sprinkler riser room, next to electrical distribution equipment, or near telecom service equipment.",
};

const spaceOptions = [
  "a single space which was vacant at the time of my visit",
  "a single space which was occupied at the time of my visit",
  "multiple spaces which were vacant at the time of my visit",
  "multiple spaces which were occupied at the time of my visit",
  "a multi-tenant space which was partially occupied at the time of my visit",
];

const emptyPanel = () => ({
  id: `panel-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  designation: "",
  ampRating: "",
  voltage: "",
  phase: "",
  poleSpaces: "",
  mainBreaker: "",
  fedFrom: "",
  condition: "good condition and should be reused",
});

const emptyTransformer = () => ({
  id: `xfmr-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  designation: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  kva: "",
  primaryVoltage: "",
  secondaryVoltage: "",
  location: "",
  condition: "good condition and should be reused",
  aiStatus: "Not analyzed",
  photos: [],
});

const fieldStyle = (full = false) => `field-report-field${full ? " full" : ""}`;

const numberWord = (num) => {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight"];
  return words[num] || String(num);
};

const ordinalWord = (index) => {
  const words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
  return words[index] || `${index + 1}th`;
};

const formatDate = (value) => {
  if (!value) return "Month, Day, Year";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const textOrPlaceholder = (value, placeholder) => value || placeholder;
const CURRENT_REPORT_YEAR = new Date().getFullYear();
const NOT_LEGIBLE = "Not legible";

const calculateAgeFromYear = (year) => {
  const match = String(year || "").match(/\b(19|20)\d{2}\b/);
  if (!match) return "";
  const numericYear = Number(match[0]);
  if (!numericYear || numericYear > CURRENT_REPORT_YEAR) return "";
  return String(CURRENT_REPORT_YEAR - numericYear);
};

const withNotLegible = (value) => (isUsefulAiValue(value) ? value : NOT_LEGIBLE);

const sentenceCase = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const ensureSentence = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.replace(/\s+\./g, ".").replace(/([^.!?])$/, "$1.");
};

const polishFieldNote = (value, context = "general") => {
  let text = String(value || "").trim();
  if (!text) return "";

  text = text
    .replace(/\s+/g, " ")
    .replace(/\bi saw\b/gi, "")
    .replace(/\bi observed\b/gi, "")
    .replace(/\bi believe\b/gi, "")
    .replace(/\bi think\b/gi, "")
    .replace(/\bit came in\b/gi, "it routes")
    .replace(/\bwhre\b/gi, "were")
    .replace(/\btheyre\b/gi, "they are")
    .replace(/\btheyre\b/gi, "they are")
    .replace(/\bductowkr\b/gi, "ductwork")
    .replace(/\binut\b/gi, "input")
    .replace(/\bback right side\b/gi, "rear right side")
    .replace(/\bcame in from\b/gi, "enters from")
    .replace(/\bcomes in from\b/gi, "enters from")
    .replace(/\bwent underground\b/gi, "routes underground")
    .replace(/\bcame up into\b/gi, "rises into")
    .replace(/\bwent up\b/gi, "rises")
    .replace(/\bcame down\b/gi, "drops")
    .replace(/\bfrom the back\b/gi, "from the rear")
    .replace(/\bmain power\b/gi, "electrical service")
    .replace(/\bpower came in\b/gi, "electrical service enters")
    .replace(/\bwire came in\b/gi, "service conductors enter")
    .replace(/\blooked good\b/gi, "appeared to be in good condition")
    .replace(/\bover the office area\b/gi, "above the office area")
    .replace(/\babove the office area\b/gi, "above the office area")
    .replace(/\bmounted to the ground\b/gi, "floor-mounted")
    .replace(/\bmounted to ground\b/gi, "floor-mounted")
    .replace(/\bdual handle\b/gi, "dual-handle")
    .replace(/\bdouble handle\b/gi, "dual-handle")
    .replace(/\btoilets\b/gi, "water closets")
    .replace(/\bbathrooms\b/gi, "toilet rooms")
    .replace(/\bsinks\b/gi, "lavatories")
    .replace(/\bforgot what they are called\b/gi, "with flexible diffuser connections")
    .replace(/\bforgo what theyre called\b/gi, "with flexible diffuser connections")
    .replace(/\bforgo what they are called\b/gi, "with flexible diffuser connections")
    .replace(/\bsock\b/gi, "flexible duct connection");

  if (context === "route") {
    text = text.replace(/^runs?\s+/i, "").replace(/^goes?\s+/i, "").replace(/^routes?\s+/i, "");
  }

  if (context === "ductwork") {
    if (/open plenum/i.test(text) && /insulated|square|rectangular|duct/i.test(text)) {
      text = "The space appears to utilize an open plenum return arrangement. The visible ductwork generally consists of interior insulated rectangular sheet metal ductwork with flexible duct connections serving the diffusers.";
    }
  }

  if (context === "plumbing-location") {
    text = text
      .replace(/^the service is located\s+/i, "")
      .replace(/^the main water line\s+/i, "The water service ")
      .replace(/\bwater meter was\b/gi, "water meter is")
      .replace(/\bthe water meter was\b/gi, "the water meter is");
  }

  return ensureSentence(sentenceCase(text));
};

const formatFixtureSummary = (plumbing) => {
  const rawFixtureNotes = String(plumbing.fixtureNotes || "").trim();
  const normalizedFixtureNotes = rawFixtureNotes.toLowerCase();
  if (rawFixtureNotes) {
    const toiletRoomCount = normalizedFixtureNotes.match(/\b(two|2)\s+(bathrooms|toilet rooms)\b/) ? "two" : "";
    const waterClosetCount = normalizedFixtureNotes.match(/\beach\b.*\b(two|2)\s+(toilets|water closets)\b/) ? "two" : "";
    const lavatoryCount = normalizedFixtureNotes.match(/\b(four|4)\s+(sinks|lavatories)\b/) ? "four" : "";
    const mounting = /mounted to (the )?ground|floor[- ]mounted/.test(normalizedFixtureNotes) ? "floor-mounted " : "";
    const faucet = /dual|double/.test(normalizedFixtureNotes) ? " with dual-handle faucets" : "";

    if (toiletRoomCount || waterClosetCount || lavatoryCount) {
      return `The space includes ${toiletRoomCount || "the documented"} toilet rooms. Each toilet room includes ${waterClosetCount || "water closet count to be verified"} ${mounting}water closets and ${lavatoryCount || "lavatory count to be verified"} lavatories${faucet}.`;
    }

    return polishFieldNote(rawFixtureNotes, "general");
  }

  const roomText = textOrPlaceholder(plumbing.toiletRoomCount, "the documented");
  const waterClosetText = textOrPlaceholder(plumbing.waterClosetCount, "water closet count to be verified");
  const lavatoryText = textOrPlaceholder(plumbing.lavatoryCount, "lavatory count to be verified");
  return `${roomText} toilet room${plumbing.toiletRoomCount === "1" ? "" : "s"}. Each toilet room includes ${waterClosetText} water closet${plumbing.waterClosetCount === "1" ? "" : "s"} and ${lavatoryText} ${textOrPlaceholder(plumbing.lavatoryMounting, "lavatory type to be verified")} lavator${plumbing.lavatoryCount === "1" ? "y" : "ies"} with ${textOrPlaceholder(plumbing.faucetType, "faucet type to be verified")}.`;
};

const formatWaterServiceLocation = (plumbing) => {
  const rawLocation = String(plumbing.waterMeterLocation || "").trim();
  if (!rawLocation) return "The water service location should be verified in the field.";

  const location = polishFieldNote(rawLocation, "plumbing-location");
  const lower = rawLocation.toLowerCase();
  const serviceParts = [];

  if (/rear right side|back right side/.test(lower)) {
    serviceParts.push("The water service enters from the rear right side of the building");
  } else if (/rear|back/.test(lower)) {
    serviceParts.push("The water service enters from the rear side of the building");
  }

  if (/above the office|over the office|office area/.test(lower)) {
    serviceParts.push("routes above the office area");
  }

  const meterLocation = /meter.*office|office.*meter/.test(lower)
    ? "The water meter is located in the office area."
    : "";

  if (serviceParts.length || meterLocation) {
    return `${serviceParts.length ? `${serviceParts.join(" and ")}.` : ""}${meterLocation ? ` ${meterLocation}` : ""}`.trim();
  }

  return location;
};

const buildPlumbingNarrative = (plumbing) => {
  const override = polishFieldNote(plumbing.narrative, "general");
  if (override) return override;

  if (plumbing.hasWaterService === "no") {
    return "The proposed space is not served by a dedicated water service based on information provided.";
  }

  const opening = `The proposed space is served by a separately metered ${textOrPlaceholder(plumbing.waterMeterSize, "water meter size to be verified")} water line.`;
  const serviceLocation = plumbing.hasWaterService === "yes" ? formatWaterServiceLocation(plumbing) : "Water service information should be verified in the field.";
  const fixtures = plumbing.hasWaterService === "yes" ? formatFixtureSummary(plumbing) : "";
  const waterHeater = plumbing.hasWaterHeater === "yes" ? `There is also an ${textOrPlaceholder(plumbing.waterHeaterSize, "size to be verified")} tank type hot water heater.` : "";
  const mopSink = plumbing.hasMopSink === "yes" ? "There is also a floor mop sink." : "";
  const condition = `All of the fixtures are ${textOrPlaceholder(plumbing.fixtureCondition, "condition to be verified")}.`;

  return [opening, serviceLocation, fixtures, waterHeater, mopSink, condition].filter(Boolean).join(" ");
};

const buildGasNarrative = (plumbing) => {
  if (plumbing.hasGasService !== "yes") return "";
  const override = polishFieldNote(plumbing.gasNarrative, "general");
  if (override) return override;

  return `The space is served by a separately metered gas service. The service is metered ${textOrPlaceholder(plumbing.gasMeterLocation, "in a location to be verified")}. The gas line routes ${polishFieldNote(textOrPlaceholder(plumbing.gasRoute, "along a route to be verified"), "route").replace(/\.$/, "")}. The gas line size is ${textOrPlaceholder(plumbing.gasPipeSize, "to be verified")} and serves ${plumbing.gasServesRtus === "yes" ? "the roof top units" : "equipment to be verified"}.`;
};

const buildMechanicalNarrative = (report) => {
  const rtus = report.mechanical.rtus;
  const squareFootage = report.project.squareFootage;

  if (!rtus.length) {
    return "Mechanical system information was not available at the time of this draft.";
  }

  const gasCount = rtus.filter((rtu) => rtu.heatType === "Gas").length;
  const electricCount = rtus.filter((rtu) => rtu.heatType === "Electric").length;
  let opening = `The proposed space is served by ${numberWord(rtus.length)} single packaged roof top unit${rtus.length === 1 ? "" : "s"}.`;

  if (gasCount > 0 && electricCount === 0) {
    opening = `The proposed space is served by ${numberWord(rtus.length)} single packaged gas-fired roof top unit${rtus.length === 1 ? "" : "s"}.`;
  } else if (electricCount > 0 && gasCount === 0) {
    opening = `The proposed space is served by ${numberWord(rtus.length)} single packaged electric roof top unit${rtus.length === 1 ? "" : "s"}.`;
  } else if (gasCount > 0 && electricCount > 0) {
    opening = `The proposed space is served by ${numberWord(gasCount)} single packaged gas-fired roof top unit${gasCount === 1 ? "" : "s"} and ${numberWord(electricCount)} electric roof top unit${electricCount === 1 ? "" : "s"}.`;
  }

  const rtuDescriptions = rtus
    .map((rtu, index) => {
      const designation = rtu.designation ? `${rtu.designation} ` : "";
      const tonnage = rtu.tonnage ? `${rtu.tonnage}-ton ` : "";
      const manufacturer = rtu.manufacturer || "unit manufacturer not legible";
      const year = rtu.manufacturingYear
        ? ` in ${rtu.manufacturingYear}`
        : " with the manufacturing year not legible on the nameplate";
      const gasText =
        rtu.heatType === "Gas"
          ? `${rtu.gasPipeSize ? ` The unit is served by a ${rtu.gasPipeSize} gas line` : " Gas line size should be verified"}${rtu.gasRoute ? ` routed ${polishFieldNote(rtu.gasRoute, "route").replace(/\.$/, "")}` : ""}.${rtu.gasNotes ? ` ${polishFieldNote(rtu.gasNotes, "general")}` : ""}`
          : "";
      return `The ${ordinalWord(index)} unit ${designation}is a ${tonnage}model manufactured by ${manufacturer}${year}.${gasText}`;
    })
    .join(" ");

  const oldUnits = rtus.filter((rtu) => Number(rtu.age) > 15);
  const replacementText =
    oldUnits.length === 0
      ? "With ASHRAE's estimated median service life of a packaged roof top unit being 15-years, the units are within their expected service life."
      : `With ASHRAE's estimated median service life of a packaged roof top unit being 15-years, ${oldUnits.length === rtus.length ? "the unit equipment" : `${numberWord(oldUnits.length)} unit${oldUnits.length === 1 ? "" : "s"}`} would be recommended to be replaced.`;

  const coolingEstimate = squareFootage
      ? ` With the proposed space being approximately ${Math.round(Number(squareFootage)).toLocaleString()} sq. ft., Schnackel Engineers estimates ${(Number(squareFootage) / 600).toFixed(1)} to ${(Number(squareFootage) / 400).toFixed(1)} tons of cooling will be required. This preliminary estimate is based on a typical planning range of 400 to 600 sq. ft. per ton; complete heat gain/loss calculations will be performed to determine the exact amount of cooling required.`
    : "";

  const ductwork =
    polishFieldNote(report.mechanical.ductworkDescription, "ductwork") ||
    "Ductwork information was not fully documented at the time of this draft.";

  return `${opening} ${rtuDescriptions} ${replacementText}${coolingEstimate} ${ductwork}`;
};

const buildReportPreview = (report) => ({
  intro: `I visited the proposed ${textOrPlaceholder(report.project.projectName, "Project Name")} in ${textOrPlaceholder(report.project.cityState, "City, State")} on ${formatDate(report.project.visitDate)}. The following is summary of the mechanical, electrical, and plumbing systems at this location. The proposed space consisted of ${textOrPlaceholder(report.project.spaceDescription, "a single space which was vacant at the time of my visit")}.`,
  mechanical: buildMechanicalNarrative(report),
  plumbing: buildPlumbingNarrative(report.plumbing),
  gas: buildGasNarrative(report.plumbing),
  electrical:
    polishFieldNote(report.electrical.narrative, "general") ||
    `The proposed space is served by ${textOrPlaceholder(report.electrical.metering, "a meter configuration to be verified")} ${textOrPlaceholder(report.electrical.serviceSize, "electrical service size to be verified")}, ${textOrPlaceholder(report.electrical.voltage, "voltage to be verified")}, ${textOrPlaceholder(report.electrical.phase, "phase to be verified")} electrical service located ${textOrPlaceholder(report.electrical.serviceLocation, "in a location to be verified")}. The service routes ${polishFieldNote(textOrPlaceholder(report.electrical.serviceRoute, "along a route to be verified"), "route").replace(/\.$/, "")}. ${report.electrical.panels.map((panel) => `${textOrPlaceholder(panel.designation, "Panelboard")} is a ${textOrPlaceholder(panel.ampRating, "amp rating to be verified")}, ${textOrPlaceholder(panel.voltage, "voltage to be verified")}, ${textOrPlaceholder(panel.phase, "phase to be verified")} panelboard with ${textOrPlaceholder(panel.poleSpaces, "pole spaces to be verified")} pole spaces${panel.mainBreaker ? ` and a ${panel.mainBreaker} main circuit breaker` : ""}${panel.fedFrom ? ` which is fed from ${polishFieldNote(panel.fedFrom, "route").replace(/\.$/, "")}` : ""}.`).join(" ")} ${report.electrical.transformers.map((transformer) => `${textOrPlaceholder(transformer.designation, "Transformer")} is a ${textOrPlaceholder(transformer.kva, "kVA to be verified")} transformer located ${textOrPlaceholder(transformer.location, "in a location to be verified")} with ${textOrPlaceholder(transformer.primaryVoltage, "primary voltage to be verified")} primary and ${textOrPlaceholder(transformer.secondaryVoltage, "secondary voltage to be verified")} secondary voltage.`).join(" ")} All of the electrical equipment is ${textOrPlaceholder(report.electrical.equipmentCondition, "condition to be verified")}.`,
  telephone:
    polishFieldNote(report.electrical.telephoneNarrative, "general") ||
    `The telephone service for the space is fed from the demark located ${textOrPlaceholder(report.electrical.telephoneDemarkLocation, "in a location to be verified")}. The service ${textOrPlaceholder(report.electrical.telephoneRoute, "route should be verified in the field")}.`,
  fire:
    polishFieldNote(report.fire.narrative, "general") ||
    `The proposed space is ${report.fire.isSprinklered === "no" ? "not documented as fully sprinklered" : "served by the building sprinkler system"}. ${report.fire.mainLineSize ? `${report.fire.mainLineSize} main lines enter the space from ${textOrPlaceholder(report.fire.mainEntryDirection, "a direction to be verified")}. ` : ""}${report.fire.riserLocation ? `The fire sprinkler riser is located ${report.fire.riserLocation}. ` : ""}${polishFieldNote(report.fire.branchLineNotes, "general") || "Fire protection main, branch, riser, and isolation valve information should be verified in the field."}`,
  alarm:
    report.fire.hasFireAlarm === "yes"
      ? polishFieldNote(report.fire.alarmNarrative, "general") || `The space is served by the building fire alarm system with the main Fire Alarm Panel located ${textOrPlaceholder(report.fire.fireAlarmPanelLocation, "in a location to be verified")}.`
      : "",
});

const inputProps = (value, onChange) => ({
  value,
  onChange: (event) => onChange(event.target.value),
});

const apiUrl =
  process.env.REACT_APP_API_URL ||
  "https://jqyt5l9x73.execute-api.us-east-1.amazonaws.com/prod";

const isUsefulAiValue = (value) =>
  value !== undefined &&
  value !== null &&
  String(value).trim() !== "" &&
  !["not available", "not applicable", "n/a", "unknown"].includes(String(value).trim().toLowerCase());

const firstUseful = (...values) => values.find(isUsefulAiValue) || "";

const stripDataUrl = (dataUrl) => dataUrl.split(",")[1] || dataUrl;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const fileToBase64 = async (file) => {
  const dataUrl = await fileToDataUrl(file);

  if (!file.type.startsWith("image/")) {
    return stripDataUrl(dataUrl);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(image.src);
      resolve(stripDataUrl(canvas.toDataURL("image/jpeg", 0.92)));
    };
    image.onerror = () => resolve(stripDataUrl(dataUrl));
    image.src = URL.createObjectURL(file);
  });
};

const normalizeTonnage = (value) => {
  if (!isUsefulAiValue(value)) return "";
  const match = String(value).match(/[\d.]+/);
  return match ? match[0] : String(value);
};

const inferHeatType = (data) => {
  const combined = [
    data?.systemType?.configuration,
    data?.systemType?.type,
    data?.heating?.type,
    data?.gasInformation?.gasType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (combined.includes("gas")) return "Gas";
  if (combined.includes("electric")) return "Electric";
  return "";
};

const analyzeEquipmentPhotos = async (files, equipmentType) => {
  const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) {
    throw new Error("Please choose at least one image file.");
  }

  const images = await Promise.all(imageFiles.map(fileToBase64));
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      images,
      imageBase64: images[0],
      equipmentType,
    }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const errorData = await response.json();
      details = errorData.error ? ` ${errorData.error}` : "";
    } catch (error) {
      details = "";
    }
    throw new Error(`AI extraction failed (${response.status}).${details}`);
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || "AI extraction failed.");
  }

  return responseData.data || {};
};

function Field({ label, help, full, children }) {
  return (
    <div className={fieldStyle(full)}>
      <label className="field-report-label">{label}</label>
      {children}
      {help && <p className="field-report-help">{help}</p>}
    </div>
  );
}

function ToggleGroup({ value, onChange, options = yesNo }) {
  return (
    <div className="field-report-control-row">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`field-report-toggle${value === option.value ? " active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GuideButton({ topic, onOpen }) {
  return (
    <button
      type="button"
      className="field-report-guide"
      onClick={() => onOpen(topic)}
      title="Show field guide"
    >
      ?
    </button>
  );
}

function SelectWithOther({ value, onChange, options, placeholder = "Select..." }) {
  const isOtherValue = value && !options.includes(value);
  const showOtherInput = isOtherValue || value === "Other";
  return (
    <div className="field-report-select-other">
      <select
        className="field-report-select"
        value={isOtherValue ? "Other" : value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {showOtherInput && (
        <input
          className="field-report-input"
          placeholder="Other value"
          value={isOtherValue ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function ExtractionProgress({ status, photoCount }) {
  if (!status && !photoCount) return null;
  const isAnalyzing = /analyzing|queued|compressing|uploading/i.test(status || "");
  const isComplete = /filled|analyzed|confirm/i.test(status || "");
  const label = isAnalyzing ? "Extracting nameplate data" : isComplete ? "Extraction complete" : "Needs review";

  return (
    <div className={`field-report-progress${isAnalyzing ? " active" : ""}${isComplete ? " complete" : ""}`}>
      <div className="field-report-progress-head">
        <strong>{label}</strong>
        <span>{photoCount} photo file{photoCount === 1 ? "" : "s"}</span>
      </div>
      <div className="field-report-progress-track" aria-hidden="true">
        <div className="field-report-progress-bar" />
      </div>
      {status && <p className="field-report-help">{status}</p>}
    </div>
  );
}

function DuctworkGuideVisual() {
  return (
    <div>
      <div className="field-report-guide-image-grid">
        <GuideImage
          src="/field-guides/ductwork-example.jpg"
          alt="Ducted return example"
          caption="Ductwork example: document visible duct material, insulation, diffuser connections, and any damaged or missing sections."
        />
        <GuideImage
          src="/field-guides/plenum-return-example.png"
          alt="Plenum return example"
          caption="Plenum return: return air uses the ceiling/open plenum space instead of a return duct."
        />
      </div>
      <GuideImage
        src="/field-guides/duct-dimension-example.webp"
        alt="Duct dimension reference"
        caption="Duct size reference: width, height, and length are the main dimensions to note when visible."
      />
    </div>
  );
}

function GuideImage({ src, alt, caption }) {
  return (
    <figure className="field-report-guide-image">
      <img src={src} alt={alt} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function GuideVisual({ topic }) {
  if (topic === "ductwork") {
    return <DuctworkGuideVisual />;
  }

  if (topic === "nameplate") {
    return (
      <div className="field-report-guide-image-grid">
        <GuideImage
          src="/field-guides/rtu-nameplate-electric-example.png"
          alt="Electric RTU nameplate example"
          caption="Electric RTU nameplate: capture the full label, not just the serial number."
        />
        <GuideImage
          src="/field-guides/rtu-nameplate-gas-example.png"
          alt="Gas RTU nameplate example"
          caption="Gas RTU nameplate: include the gas heat section if the unit is gas-fired."
        />
      </div>
    );
  }

  if (topic === "electricalMeter" || topic === "serviceSize") {
    return (
      <div className="field-report-guide-image-grid">
        <GuideImage
          src="/field-guides/electric-meter-bank-example.webp"
          alt="Exterior electric meter bank example"
          caption="Exterior meter bank: identify which meter/disconnect serves the tenant space."
        />
        <GuideImage
          src="/field-guides/electric-meter-room-example.jpg"
          alt="Interior electric meter room example"
          caption="Interior meter room: meters may be grouped with disconnects and tenant labels."
        />
      </div>
    );
  }

  if (topic === "voltage" || topic === "phase") {
    return (
      <GuideImage
        src="/field-guides/electrical-distribution-overview.png"
        alt="Electrical distribution overview with panels and transformer"
        caption="Electrical overview: look for labels on switchboards, panelboards, transformers, and disconnects."
      />
    );
  }

  if (topic === "panelboard") {
    return (
      <GuideImage
        src="/field-guides/panelboard-example.jpg"
        alt="Panelboard example"
        caption="Panelboard guide: photograph the panel label/directory and document designation, amp rating, voltage, phase, pole spaces, main breaker, and feeder source."
      />
    );
  }

  if (topic === "transformer") {
    return (
      <GuideImage
        src="/field-guides/transformer-nameplate-example.jpg"
        alt="Transformer nameplate example"
        caption="Transformer guide: photograph the nameplate and record kVA, primary voltage, secondary voltage, phase, and location."
      />
    );
  }

  if (topic === "gasMeter") {
    return (
      <GuideImage
        src="/field-guides/gas-meter-example.png"
        alt="Gas meter example"
        caption="Gas meter: document where it is located, the pipe size leaving the meter, and the route to the rooftop units."
      />
    );
  }

  if (topic === "waterMeter") {
    return (
      <div className="field-report-guide-image-grid">
        <GuideImage
          src="/field-guides/water-meter-example.jpg"
          alt="Water meter example"
          caption="Water meter: identify the meter body and the pipe entering/leaving the meter."
        />
        <GuideImage
          src="/field-guides/water-meter-pit-example.jpg"
          alt="Water meter pit example"
          caption="Meter pit: sometimes the meter is below grade in a box outside the building."
        />
      </div>
    );
  }

  if (topic === "riser") {
    return (
      <GuideImage
        src="/field-guides/fire-riser-example.jpg"
        alt="Fire sprinkler riser example"
        caption="Fire riser example: look for vertical sprinkler piping, valves, gauges, tags, and inspector test/drain piping."
      />
    );
  }

  if (topic === "branchLine") {
    return (
      <div className="field-report-guide-image-grid">
        <GuideImage
          src="/field-guides/fire-sprinkler-riser-branch-lines.webp"
          alt="Wet pipe fire sprinkler riser and branch line diagram"
          caption="Branch lines: smaller pipes tap off larger mains and feed sprinkler heads."
        />
        <GuideImage
          src="/field-guides/sprinkler-piping-network.png"
          alt="Fire sprinkler piping network with branch lines"
          caption="Piping network: branch lines repeat across the space and connect back to mains."
        />
      </div>
    );
  }

  if (topic === "mainLine") {
    return (
      <GuideImage
        src="/field-guides/sprinkler-main-branch-diagram.jpg"
        alt="Fire sprinkler main and branch line diagram"
        caption="Main line guide: feed mains and cross mains are larger pipes that supply the branch lines."
      />
    );
  }

  if (topic === "fireAlarmPanel") {
    return (
      <div className="field-report-guide-image-grid">
        <GuideImage
          src="/field-guides/Fire-Alarm-Systemfire-alarm-control-unit-example.jpg"
          alt="Fire alarm control unit example"
          caption="FACU example: document location and take photos of the front, inside door, model, and service company label."
        />
        <GuideImage
          src="/field-guides/fire-alarm-system-overview.jpg"
          alt="Fire alarm system overview"
          caption="Fire alarm overview: the FACU connects initiating devices, notification appliances, and supervisory devices."
        />
      </div>
    );
  }

  return (
    <div className="field-report-visual-guide">
      Diagram coming next. For real reference photos, place images in
      <code> frontend/public/field-guides/</code> and reference them as
      <code> /field-guides/example-name.jpg</code>.
    </div>
  );
}

export default function FieldReportBuilder() {
  const { projectId } = useParams();
  const sourceProject = projectId ? getProjectById(projectId) : null;
  const [activeStep, setActiveStep] = useState("project");
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [report, setReport] = useState(() => ({
    project: {
      reportDate: new Date().toISOString().split("T")[0],
      visitDate: sourceProject?.surveyDate || new Date().toISOString().split("T")[0],
      clientName: sourceProject?.clientName || "",
      companyName: "",
      companyAddress: "",
      companyCityStateZip: "",
      projectName: sourceProject?.name || "",
      schnackelProjectNumber: sourceProject?.projectNumber || "",
      siteAddress: sourceProject?.address || "",
      siteCityStateZip: "",
      cityState: "",
      surveyorName: sourceProject?.surveyorName || "",
      squareFootage: sourceProject?.squareFootage || "",
      spaceDescription: sourceProject?.spaceDescription || "a single space which was vacant at the time of my visit",
    },
    mechanical: {
      rtus: [emptyRtu()],
      ductworkDescription: "",
    },
    plumbing: {
      hasWaterService: "unknown",
      hasGasService: "unknown",
      narrative: "",
      fixtureNotes: "",
      gasNarrative: "",
      waterMeterSize: "",
      waterMeterLocation: "",
      toiletRoomCount: "",
      waterClosetCount: "",
      lavatoryCount: "",
      lavatoryMounting: "",
      faucetType: "",
      hasWaterHeater: "unknown",
      waterHeaterSize: "",
      hasMopSink: "unknown",
      fixtureCondition: "in good condition and should be considered for reuse",
      gasMeterLocation: "",
      gasPipeSize: "",
      gasRoute: "",
      gasServesRtus: "unknown",
    },
    electrical: {
      serviceSize: "",
      voltage: "",
      phase: "",
      metering: "a separately metered",
      serviceLocation: "",
      serviceRoute: "",
      panelNotes: "",
      equipmentCondition: "All of the electrical equipment is in good condition and should be reused.",
      narrative: "",
      telephoneNarrative: "",
      telephoneDemarkLocation: "",
      telephoneRoute: "",
      panels: [emptyPanel()],
      transformers: [],
    },
    fire: {
      isSprinklered: "unknown",
      hasFireAlarm: "unknown",
      sprinklerNotes: "",
      narrative: "",
      alarmNarrative: "",
      mainLineSize: "",
      mainEntryDirection: "",
      riserLocation: "",
      branchLineNotes: "",
      isolationValve: "unknown",
      fireAlarmPanelLocation: "",
    },
  }));

  const preview = useMemo(() => buildReportPreview(report), [report]);
  const generatedReportText = useMemo(
    () =>
      [
        formatDate(report.project.reportDate),
        "",
        report.project.clientName || "Client Name",
        report.project.companyName || "Company Name",
        report.project.companyAddress || "Client Address",
        report.project.companyCityStateZip || "Client City, State, ZIP",
        "",
        `RE: Project Name: ${report.project.projectName || "Project Name"}`,
        `Schnackel Project No.: ${report.project.schnackelProjectNumber || "XXXXXX"}`,
        "",
        `Dear ${report.project.clientName || "Client Name"}:`,
        "",
        buildReportPreview(report).intro,
        "",
        "Investigation Performed by:",
        report.project.surveyorName || "Surveyor Name",
        "Schnackel Engineers",
        "Telephone No. 402-391-7680, Fax No. 402-391-7488",
        "",
        "Site Address:",
        report.project.siteAddress || "Site Address",
        report.project.siteCityStateZip || "City, State, ZIP",
        "",
        "Mechanical Systems:",
        buildReportPreview(report).mechanical,
        "",
        "Plumbing Systems:",
        buildReportPreview(report).plumbing,
        buildReportPreview(report).gas,
        "",
        "Electrical Systems:",
        buildReportPreview(report).electrical,
        buildReportPreview(report).telephone,
        "",
        "Fire Protection Systems:",
        buildReportPreview(report).fire,
        buildReportPreview(report).alarm,
        "",
        "If you have any questions, please let me know.",
        "",
        "Sincerely,",
        "",
        report.project.surveyorName || "Surveyor Name",
      ]
        .filter((line) => line !== "")
        .join("\n\n"),
    [report]
  );
  const [editableReportText, setEditableReportText] = useState("");
  const [reportWasEdited, setReportWasEdited] = useState(false);

  useEffect(() => {
    if (!reportWasEdited) {
      setEditableReportText(generatedReportText);
    }
  }, [generatedReportText, reportWasEdited]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  const updateSection = (section, patch) => {
    setReport((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }));
  };

  const updateProject = (field, value) => {
    updateSection("project", { [field]: value });
  };

  const updateRtu = (rtuId, patch) => {
    setReport((current) => ({
      ...current,
      mechanical: {
        ...current.mechanical,
        rtus: current.mechanical.rtus.map((rtu) =>
          rtu.id === rtuId ? { ...rtu, ...patch } : rtu
        ),
      },
    }));
  };

  const addRtu = () => {
    setReport((current) => ({
      ...current,
      mechanical: {
        ...current.mechanical,
        rtus: [...current.mechanical.rtus, emptyRtu()],
      },
    }));
  };

  const removeRtu = (rtuId) => {
    setReport((current) => ({
      ...current,
      mechanical: {
        ...current.mechanical,
        rtus: current.mechanical.rtus.filter((rtu) => rtu.id !== rtuId),
      },
    }));
  };

  const addRtuPhotos = async (rtuId, files) => {
    const selectedFiles = Array.from(files || []);
    const photos = selectedFiles.map((file) => ({
      id: `photo-${Date.now()}-${file.name}`,
      name: file.name,
      status: "Preparing image for AI extraction",
    }));
    updateRtu(rtuId, { photos, aiStatus: "Preparing and uploading nameplate photo..." });

    try {
      updateRtu(rtuId, { aiStatus: "AI is reading the nameplate and extracting fields..." });
      const data = await analyzeEquipmentPhotos(selectedFiles, "hvac");
      const manufacturingYear = firstUseful(data.basicInfo?.manufacturingYear);
      const aiPatch = {
        manufacturer: withNotLegible(data.basicInfo?.manufacturer),
        model: withNotLegible(data.basicInfo?.model),
        manufacturingYear: withNotLegible(manufacturingYear),
        age: firstUseful(data.basicInfo?.currentAge, calculateAgeFromYear(manufacturingYear)),
        tonnage: normalizeTonnage(firstUseful(data.cooling?.tonnage)) || NOT_LEGIBLE,
      };
      const heatType = inferHeatType(data);
      if (heatType) aiPatch.heatType = heatType;

      updateRtu(rtuId, {
        ...aiPatch,
        aiStatus:
          Object.keys(aiPatch).length > 0
            ? "AI filled what it could read. Please confirm the fields against the photo."
            : "AI could not confidently read the nameplate. Please enter values manually or mark Not legible.",
        photos: photos.map((photo) => ({ ...photo, status: "Analyzed" })),
      });
    } catch (error) {
      updateRtu(rtuId, {
        manufacturer: NOT_LEGIBLE,
        model: NOT_LEGIBLE,
        manufacturingYear: NOT_LEGIBLE,
        tonnage: NOT_LEGIBLE,
        age: "",
        aiStatus: error.message || "AI extraction failed. Unreadable nameplate fields were marked Not legible.",
        photos: photos.map((photo) => ({ ...photo, status: "Needs manual entry" })),
      });
    }
  };

  const updatePanel = (panelId, patch) => {
    updateSection("electrical", {
      panels: report.electrical.panels.map((panel) =>
        panel.id === panelId ? { ...panel, ...patch } : panel
      ),
    });
  };

  const addPanel = () => {
    updateSection("electrical", {
      panels: [...report.electrical.panels, emptyPanel()],
    });
  };

  const removePanel = (panelId) => {
    updateSection("electrical", {
      panels: report.electrical.panels.filter((panel) => panel.id !== panelId),
    });
  };

  const updateTransformer = (transformerId, patch) => {
    setReport((current) => ({
      ...current,
      electrical: {
        ...current.electrical,
        transformers: current.electrical.transformers.map((transformer) =>
          transformer.id === transformerId ? { ...transformer, ...patch } : transformer
        ),
      },
    }));
  };

  const addTransformer = () => {
    setReport((current) => ({
      ...current,
      electrical: {
        ...current.electrical,
        transformers: [...current.electrical.transformers, emptyTransformer()],
      },
    }));
  };

  const removeTransformer = (transformerId) => {
    setReport((current) => ({
      ...current,
      electrical: {
        ...current.electrical,
        transformers: current.electrical.transformers.filter(
          (transformer) => transformer.id !== transformerId
        ),
      },
    }));
  };

  const addTransformerPhotos = async (transformerId, files) => {
    const selectedFiles = Array.from(files || []);
    const photos = selectedFiles.map((file) => ({
      id: `photo-${Date.now()}-${file.name}`,
      name: file.name,
      status: "Preparing image for AI extraction",
    }));
    updateTransformer(transformerId, { photos, aiStatus: "Preparing and uploading transformer nameplate..." });

    try {
      updateTransformer(transformerId, { aiStatus: "AI is reading the transformer nameplate and extracting fields..." });
      const data = await analyzeEquipmentPhotos(selectedFiles, "transformer");
      const aiPatch = {
        manufacturer: firstUseful(data.basicInfo?.manufacturer),
        model: firstUseful(data.basicInfo?.model),
        serialNumber: firstUseful(data.basicInfo?.serialNumber),
        kva: firstUseful(data.electrical?.powerRating),
        primaryVoltage: firstUseful(data.electrical?.primaryVoltage),
        secondaryVoltage: firstUseful(data.electrical?.secondaryVoltage),
      };

      Object.keys(aiPatch).forEach((key) => {
        if (!isUsefulAiValue(aiPatch[key])) delete aiPatch[key];
      });

      updateTransformer(transformerId, {
        ...aiPatch,
        aiStatus:
          Object.keys(aiPatch).length > 0
            ? "AI filled what it could read. Please confirm the transformer values."
            : "AI could not confidently read the transformer nameplate. Please enter values manually.",
        photos: photos.map((photo) => ({ ...photo, status: "Analyzed" })),
      });
    } catch (error) {
      updateTransformer(transformerId, {
        aiStatus: error.message || "AI extraction failed. Please enter transformer values manually.",
        photos: photos.map((photo) => ({ ...photo, status: "Needs manual entry" })),
      });
    }
  };

  const missingItems = useMemo(() => {
    const items = [];
    if (!report.project.clientName) items.push("Client name");
    if (!report.project.projectName) items.push("Project name");
    if (!report.project.schnackelProjectNumber) items.push("Schnackel project number");
    if (!report.project.siteAddress) items.push("Site address");
    if (!report.project.surveyorName) items.push("Surveyor name");
    report.mechanical.rtus.forEach((rtu, index) => {
      if (!rtu.designation) items.push(`RTU ${index + 1} designation`);
      if (!rtu.manufacturer) items.push(`RTU ${index + 1} manufacturer or illegible confirmation`);
      if (!rtu.tonnage) items.push(`RTU ${index + 1} tonnage`);
    });
    if (report.plumbing.hasWaterService === "unknown") items.push("Plumbing water service yes/no");
    if (report.plumbing.hasWaterService === "yes" && !report.plumbing.waterMeterSize) items.push("Water meter size");
    if (report.electrical.narrative === "" && !report.electrical.serviceSize) items.push("Electrical service description");
    report.electrical.panels.forEach((panel, index) => {
      if (!panel.designation) items.push(`Panelboard ${index + 1} designation`);
      if (!panel.ampRating) items.push(`Panelboard ${index + 1} amp rating`);
    });
    if (report.fire.isSprinklered === "unknown") items.push("Fire sprinkler yes/no");
    return items;
  }, [report]);

  const reportQualityAlerts = useMemo(() => {
    const alerts = [];
    const rawNotes = [
      ["Ductwork description", report.mechanical.ductworkDescription],
      ["Plumbing override", report.plumbing.narrative],
      ["Gas override", report.plumbing.gasNarrative],
      ["Electrical override", report.electrical.narrative],
      ["Electrical route", report.electrical.serviceRoute],
      ["Fire override", report.fire.narrative],
    ];

    rawNotes.forEach(([label, value]) => {
      const text = String(value || "").toLowerCase();
      if (/\bi\s|\bi saw\b|\bi think\b|\bi believe\b|forgot|forgo|theyre|not sure/.test(text)) {
        alerts.push(`${label} contains informal or uncertain wording; the preview has been polished, but verify the final meaning.`);
      }
    });

    if (report.plumbing.hasGasService !== "yes" && (report.plumbing.gasMeterLocation || report.plumbing.gasPipeSize || report.plumbing.gasRoute || report.plumbing.gasNarrative)) {
      alerts.push("Gas service is not marked Yes, so gas fields will be omitted from the report.");
    }

    if (report.project.squareFootage && Number.isNaN(Number(report.project.squareFootage))) {
      alerts.push("Square footage is not a clean number.");
    }

    return alerts;
  }, [report]);

  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  const nextStep = () => setActiveStep(steps[Math.min(currentIndex + 1, steps.length - 1)].id);
  const previousStep = () => setActiveStep(steps[Math.max(currentIndex - 1, 0)].id);

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 8px", color: "#0f172a" }}>Field Report Builder</h1>
        <p style={{ margin: 0, color: "#64748b" }}>
          Build a client-ready existing conditions report from guided survey inputs.
        </p>
      </div>

      <div className="field-report-shell">
        <aside className="field-report-sidebar">
          <div className="field-report-card">
            <div className="field-report-step-list">
              {steps.map((step) => (
                <button
                  key={step.id}
                  className={`field-report-step${activeStep === step.id ? " active" : ""}`}
                  onClick={() => setActiveStep(step.id)}
                  type="button"
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="field-report-card">
          {activeStep === "project" && (
            <section>
              <h2>Project Info</h2>
              <div className="field-report-grid">
                <Field label="Report Date">
                  <input className="field-report-input" type="date" {...inputProps(report.project.reportDate, (value) => updateProject("reportDate", value))} />
                </Field>
                <Field label="Survey Visit Date">
                  <input className="field-report-input" type="date" {...inputProps(report.project.visitDate, (value) => updateProject("visitDate", value))} />
                </Field>
                <Field label="Client Name" help="This appears in the greeting and client block.">
                  <input className="field-report-input" {...inputProps(report.project.clientName, (value) => updateProject("clientName", value))} />
                </Field>
                <Field label="Company Name">
                  <input className="field-report-input" {...inputProps(report.project.companyName, (value) => updateProject("companyName", value))} />
                </Field>
                <Field label="Client Address">
                  <input className="field-report-input" {...inputProps(report.project.companyAddress, (value) => updateProject("companyAddress", value))} />
                </Field>
                <Field label="Client City, State, ZIP">
                  <input className="field-report-input" {...inputProps(report.project.companyCityStateZip, (value) => updateProject("companyCityStateZip", value))} />
                </Field>
                <Field label="Project Name">
                  <input className="field-report-input" {...inputProps(report.project.projectName, (value) => updateProject("projectName", value))} />
                </Field>
                <Field label="Schnackel Project No.">
                  <input className="field-report-input" {...inputProps(report.project.schnackelProjectNumber, (value) => updateProject("schnackelProjectNumber", value))} />
                </Field>
                <Field label="Project City, State">
                  <input className="field-report-input" placeholder="Omaha, Nebraska" {...inputProps(report.project.cityState, (value) => updateProject("cityState", value))} />
                </Field>
                <Field label="Site Address">
                  <input className="field-report-input" {...inputProps(report.project.siteAddress, (value) => updateProject("siteAddress", value))} />
                </Field>
                <Field label="Site City, State, ZIP">
                  <input className="field-report-input" {...inputProps(report.project.siteCityStateZip, (value) => updateProject("siteCityStateZip", value))} />
                </Field>
                <Field label="Surveyor Name">
                  <input className="field-report-input" {...inputProps(report.project.surveyorName, (value) => updateProject("surveyorName", value))} />
                </Field>
                <Field label="Square Footage">
                  <input className="field-report-input" type="number" {...inputProps(report.project.squareFootage, (value) => updateProject("squareFootage", value))} />
                </Field>
                <Field label="Space Description" full help="This sentence appears in the opening paragraph. Pick the closest option, then edit if needed.">
                  <select className="field-report-select" {...inputProps(report.project.spaceDescription, (value) => updateProject("spaceDescription", value))}>
                    {spaceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="">Custom / type below</option>
                  </select>
                  <textarea
                    className="field-report-textarea"
                    style={{ marginTop: 8 }}
                    placeholder="Optional custom wording"
                    {...inputProps(report.project.spaceDescription, (value) => updateProject("spaceDescription", value))}
                  />
                </Field>
              </div>
            </section>
          )}

          {activeStep === "mechanical" && (
            <section>
              <h2>Mechanical Systems</h2>
              <p className="field-report-help">
                Add each rooftop unit using the designation from the field, such as RTU-2 or Unit A. If a nameplate is faded, mark fields as Not legible.
              </p>
              {report.mechanical.rtus.map((rtu, index) => (
                <div className="field-report-rtu" key={rtu.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <h3 style={{ marginTop: 0 }}>Rooftop Unit {index + 1}</h3>
                    {report.mechanical.rtus.length > 1 && (
                      <button type="button" className="btn" style={{ background: "#dc3545", color: "#fff" }} onClick={() => removeRtu(rtu.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="field-report-guide-note">
                    <strong>Nameplate photo first.</strong> Upload the RTU nameplate photo so AI can extract manufacturer, model, year, age, and capacity. Then confirm or correct the values below.
                    <GuideButton topic="nameplate" onOpen={setActiveGuide} />
                  </div>
                  <div className="field-report-upload-first">
                    <Field label="1. Upload Nameplate Photos" full help="Start here. Upload the clearest nameplate photo first; add fuse/disconnect photos after it if available. The AI fills the fields below when extraction finishes.">
                      <input
                        className="field-report-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                          addRtuPhotos(rtu.id, event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </Field>
                    <ExtractionProgress status={rtu.aiStatus} photoCount={rtu.photos.length} />
                  </div>
                  <div className="field-report-form-section">
                    <h4>2. Confirm Unit Identity</h4>
                    <div className="field-report-grid three">
                      <Field label="RTU Name / Number from Plans" help="Examples: RTU-1, RTU-2, Unit A, Existing RTU.">
                        <input className="field-report-input" placeholder="Enter RTU name/number from plans" {...inputProps(rtu.designation, (value) => updateRtu(rtu.id, { designation: value }))} />
                      </Field>
                      <Field label="Heat Type">
                        <select className="field-report-select" {...inputProps(rtu.heatType, (value) => updateRtu(rtu.id, { heatType: value }))}>
                          <option value="Electric">Electric</option>
                          <option value="Gas">Gas</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </Field>
                      <Field label="Condition">
                        <select className="field-report-select" {...inputProps(rtu.condition, (value) => updateRtu(rtu.id, { condition: value }))}>
                          <option>Good</option>
                          <option>Fair</option>
                          <option>Poor</option>
                          <option>Not observed</option>
                        </select>
                      </Field>
                    </div>
                    {rtu.heatType === "Gas" && (
                      <div className="field-report-grid" style={{ marginTop: 14 }}>
                        <Field label="Gas Pipe Size" help="Show only for gas-fired RTUs. Use the pipe size serving this RTU if observed.">
                          <input className="field-report-input" placeholder='3/4", 1", 1-1/4"' {...inputProps(rtu.gasPipeSize, (value) => updateRtu(rtu.id, { gasPipeSize: value }))} />
                        </Field>
                        <Field label="Gas Route">
                          <input className="field-report-input" placeholder="from exterior gas meter to roof, then to RTU-1" {...inputProps(rtu.gasRoute, (value) => updateRtu(rtu.id, { gasRoute: value }))} />
                        </Field>
                        <Field label="Gas Notes" full>
                          <textarea
                            className="field-report-textarea"
                            placeholder="Example: Gas shutoff located adjacent to unit. Pipe size could not be verified at roof curb."
                            {...inputProps(rtu.gasNotes, (value) => updateRtu(rtu.id, { gasNotes: value }))}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                  <div className="field-report-form-section">
                    <h4>3. Verify AI-Extracted Nameplate Data</h4>
                    <div className="field-report-grid three">
                      <Field label="Manufacturer">
                        <input className="field-report-input" placeholder="Trane or Not legible" {...inputProps(rtu.manufacturer, (value) => updateRtu(rtu.id, { manufacturer: value }))} />
                      </Field>
                      <Field label="Model">
                        <input className="field-report-input" placeholder="Model or Not legible" {...inputProps(rtu.model, (value) => updateRtu(rtu.id, { model: value }))} />
                      </Field>
                      <Field label="Capacity Tons">
                        <input className="field-report-input" placeholder="8.5" {...inputProps(rtu.tonnage, (value) => updateRtu(rtu.id, { tonnage: value }))} />
                      </Field>
                      <Field label="Manufacturing Year">
                        <input
                          className="field-report-input"
                          placeholder="2002 or Not legible"
                          {...inputProps(rtu.manufacturingYear, (value) => updateRtu(rtu.id, { manufacturingYear: value, age: calculateAgeFromYear(value) }))}
                        />
                        <p className="field-report-help">
                          Age is calculated automatically from the manufacturing year using {CURRENT_REPORT_YEAR}.
                          {calculateAgeFromYear(rtu.manufacturingYear) ? ` Current age: ${calculateAgeFromYear(rtu.manufacturingYear)} years.` : ""}
                        </p>
                      </Field>
                      <Field label="Surveyor Notes" full>
                        <textarea
                          className="field-report-textarea"
                          placeholder="Example: Unit is roof mounted, access was clear, nameplate was weathered, economizer condition was not verified."
                          {...inputProps(rtu.notes, (value) => updateRtu(rtu.id, { notes: value }))}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={addRtu}>
                Add Rooftop Unit
              </button>
              <div style={{ marginTop: 18 }}>
                <Field
                  label="Ductwork Description"
                  full
                  help="Describe what you see: interior insulated rectangular sheet metal ductwork, insulated flex diffuser connections, exposed round duct, damaged insulation, or no visible ductwork."
                >
                  <textarea
                    className="field-report-textarea"
                    placeholder="Write field notes naturally. Example: open plenum return, interior insulated rectangular ductwork, flex connections to diffusers, damaged insulation above sales area. The report preview will convert this into client-ready wording."
                    {...inputProps(report.mechanical.ductworkDescription, (value) => updateSection("mechanical", { ductworkDescription: value }))}
                  />
                  <button type="button" className="field-report-help-button" onClick={() => setActiveGuide("ductwork")}>
                    Show ductwork and plenum guide
                  </button>
                </Field>
              </div>
            </section>
          )}

          {activeStep === "plumbing" && (
            <section>
              <h2>Plumbing Systems</h2>
              <p className="field-report-help">
                These questions follow the template: water meter, toilet rooms, lavatories, water heater, mop sink, fixture condition, and gas service route.
              </p>
              <div className="field-report-grid">
                <Field label="Is there a water service?" help="Use Unknown if the water service could not be verified during the visit.">
                  <ToggleGroup value={report.plumbing.hasWaterService} onChange={(value) => updateSection("plumbing", { hasWaterService: value })} />
                </Field>
                <Field label="Is there a gas service?">
                  <ToggleGroup value={report.plumbing.hasGasService} onChange={(value) => updateSection("plumbing", { hasGasService: value })} />
                </Field>
                {report.plumbing.hasWaterService === "yes" && (
                  <>
                    <Field label="Water Meter Size" help="Measure the service pipe entering/leaving the tenant water meter, not the small pipe at a sink. Common examples: 3/4 inch, 1 inch, 1-1/2 inch.">
                      <input className="field-report-input" placeholder='3/4"' {...inputProps(report.plumbing.waterMeterSize, (value) => updateSection("plumbing", { waterMeterSize: value }))} />
                      <GuideButton topic="waterMeter" onOpen={setActiveGuide} />
                    </Field>
                    <Field label="Water Meter Location / Route">
                      <input className="field-report-input" placeholder="rear wall, mall main, overhead to toilet rooms" {...inputProps(report.plumbing.waterMeterLocation, (value) => updateSection("plumbing", { waterMeterLocation: value }))} />
                    </Field>
                    <Field label="Bathroom Fixture Notes" full help="Use one note instead of many boxes. The report will format it into a professional fixture description.">
                      <textarea
                        className="field-report-textarea"
                        placeholder="Example: Two toilet rooms. Each has two water closets and two wall-mounted lavatories with single-handle faucets. Or: Men's room has 2 toilets, 1 urinal, 2 sinks; women's room has 3 toilets and 2 sinks."
                        {...inputProps(report.plumbing.fixtureNotes, (value) => updateSection("plumbing", { fixtureNotes: value }))}
                      />
                    </Field>
                  </>
                )}
                <Field label="Hot Water Heater?">
                  <ToggleGroup value={report.plumbing.hasWaterHeater} onChange={(value) => updateSection("plumbing", { hasWaterHeater: value })} />
                </Field>
                {report.plumbing.hasWaterHeater === "yes" && (
                  <Field label="Water Heater Size">
                    <input className="field-report-input" placeholder="6-gallon" {...inputProps(report.plumbing.waterHeaterSize, (value) => updateSection("plumbing", { waterHeaterSize: value }))} />
                  </Field>
                )}
                <Field label="Mop Sink?">
                  <ToggleGroup value={report.plumbing.hasMopSink} onChange={(value) => updateSection("plumbing", { hasMopSink: value })} />
                </Field>
                <Field label="Fixture Condition">
                  <select className="field-report-select" {...inputProps(report.plumbing.fixtureCondition, (value) => updateSection("plumbing", { fixtureCondition: value }))}>
                    <option>in excellent condition and should be considered for reuse</option>
                    <option>in good condition and should be considered for reuse</option>
                    <option>in fair condition and should be reviewed for reuse</option>
                    <option>in poor condition and should be replaced</option>
                    <option>not observed</option>
                  </select>
                </Field>
                {report.plumbing.hasGasService === "yes" && (
                  <>
                    <Field label="Gas Meter Location">
                      <input className="field-report-input" placeholder="west side/rear of building, approximately 120 feet south" {...inputProps(report.plumbing.gasMeterLocation, (value) => updateSection("plumbing", { gasMeterLocation: value }))} />
                      <GuideButton topic="gasMeter" onOpen={setActiveGuide} />
                    </Field>
                    <Field label="Gas Pipe Size">
                      <input className="field-report-input" placeholder='1-1/4" increasing to 2-3/8"' {...inputProps(report.plumbing.gasPipeSize, (value) => updateSection("plumbing", { gasPipeSize: value }))} />
                    </Field>
                    <Field label="Gas Route">
                      <input className="field-report-input" placeholder="to roof to serve rooftop units" {...inputProps(report.plumbing.gasRoute, (value) => updateSection("plumbing", { gasRoute: value }))} />
                    </Field>
                    <Field label="Gas Serves RTUs?">
                      <ToggleGroup value={report.plumbing.gasServesRtus} onChange={(value) => updateSection("plumbing", { gasServesRtus: value })} />
                    </Field>
                    <Field label="Override Gas Narrative" full help="Optional final wording. Example: Gas service enters at the west exterior wall, rises to the roof, and serves the existing gas-fired rooftop units.">
                      <textarea className="field-report-textarea" {...inputProps(report.plumbing.gasNarrative, (value) => updateSection("plumbing", { gasNarrative: value }))} />
                    </Field>
                  </>
                )}
                <Field label="Override Plumbing Narrative" full help="Optional final wording. Example: Water service enters above the rear office area and serves two toilet rooms with wall-mounted lavatories and tank-type water heating.">
                  <textarea
                    className="field-report-textarea"
                    placeholder="Only use this if the generated plumbing paragraph needs special handling."
                    {...inputProps(report.plumbing.narrative, (value) => updateSection("plumbing", { narrative: value }))}
                  />
                </Field>
              </div>
            </section>
          )}

          {activeStep === "electrical" && (
            <section>
              <h2>Electrical Systems</h2>
              <p className="field-report-help">
                Start with the service/meter, then add each panelboard and transformer. The help text tells a novice surveyor where to look.
              </p>
              <div className="field-report-grid">
                <Field label="Metering" help="Usually separately metered or fed from a house/mall service. Look near the meter or service switch.">
                  <input className="field-report-input" {...inputProps(report.electrical.metering, (value) => updateSection("electrical", { metering: value }))} />
                  <GuideButton topic="electricalMeter" onOpen={setActiveGuide} />
                </Field>
                <Field label="Service Size" help="Look on the main disconnect, fused switch, main breaker, or service equipment label. Example: 400-amp.">
                  <SelectWithOther value={report.electrical.serviceSize} onChange={(value) => updateSection("electrical", { serviceSize: value })} options={serviceSizeOptions} />
                </Field>
                <Field label="Voltage" help="Look on the panel nameplate or service equipment label. Example: 120/208V.">
                  <SelectWithOther value={report.electrical.voltage} onChange={(value) => updateSection("electrical", { voltage: value })} options={voltageOptions} />
                </Field>
                <Field label="Phase" help="Look for 1-phase, 3-phase, 3-wire, or 4-wire on the nameplate.">
                  <SelectWithOther value={report.electrical.phase} onChange={(value) => updateSection("electrical", { phase: value })} options={phaseOptions} />
                </Field>
                <Field label="Service Equipment Location">
                  <input className="field-report-input" placeholder="Mall Mechanical Room, back of office, electrical room" {...inputProps(report.electrical.serviceLocation, (value) => updateSection("electrical", { serviceLocation: value }))} />
                </Field>
                <Field label="Service Route">
                  <input className="field-report-input" placeholder='runs overhead in a 4" conduit to Panelboard 1' {...inputProps(report.electrical.serviceRoute, (value) => updateSection("electrical", { serviceRoute: value }))} />
                </Field>
                <Field label="Equipment Condition">
                  <select className="field-report-select" {...inputProps(report.electrical.equipmentCondition, (value) => updateSection("electrical", { equipmentCondition: value }))}>
                    <option>in excellent condition and should be reused</option>
                    <option>in good condition and should be reused</option>
                    <option>in fair condition and should be reviewed for reuse</option>
                    <option>in poor condition and should be replaced</option>
                    <option>not observed</option>
                  </select>
                </Field>
              </div>

              <h3>Panelboards</h3>
              {report.electrical.panels.map((panel, index) => (
                <div className="field-report-rtu" key={panel.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <h4 style={{ marginTop: 0 }}>Panelboard {index + 1}</h4>
                    {report.electrical.panels.length > 1 && (
                      <button type="button" className="btn" style={{ background: "#dc3545", color: "#fff" }} onClick={() => removePanel(panel.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="field-report-grid three">
                    <Field label="Panel Designation">
                      <input className="field-report-input" placeholder="Panelboard 1" {...inputProps(panel.designation, (value) => updatePanel(panel.id, { designation: value }))} />
                    </Field>
                    <Field label="Amp Rating">
                      <SelectWithOther value={panel.ampRating} onChange={(value) => updatePanel(panel.id, { ampRating: value })} options={serviceSizeOptions} />
                      <GuideButton topic="panelboard" onOpen={setActiveGuide} />
                    </Field>
                    <Field label="Voltage">
                      <SelectWithOther value={panel.voltage} onChange={(value) => updatePanel(panel.id, { voltage: value })} options={voltageOptions} />
                    </Field>
                    <Field label="Phase / Wires">
                      <SelectWithOther value={panel.phase} onChange={(value) => updatePanel(panel.id, { phase: value })} options={phaseOptions} />
                    </Field>
                    <Field label="Pole Spaces">
                      <input className="field-report-input" placeholder="42-pole spaces" {...inputProps(panel.poleSpaces, (value) => updatePanel(panel.id, { poleSpaces: value }))} />
                    </Field>
                    <Field label="Main Breaker">
                      <input className="field-report-input" placeholder="400-amp, 3-pole" {...inputProps(panel.mainBreaker, (value) => updatePanel(panel.id, { mainBreaker: value }))} />
                    </Field>
                    <Field label="Fed From" full>
                      <input className="field-report-input" placeholder="service switch, transformer, Panelboard 1 subfeed breaker" {...inputProps(panel.fedFrom, (value) => updatePanel(panel.id, { fedFrom: value }))} />
                    </Field>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={addPanel}>
                Add Panelboard
              </button>

              <h3>Transformers</h3>
              {report.electrical.transformers.map((transformer, index) => (
                <div className="field-report-rtu" key={transformer.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <h4 style={{ marginTop: 0 }}>Transformer {index + 1}</h4>
                    <button type="button" className="btn" style={{ background: "#dc3545", color: "#fff" }} onClick={() => removeTransformer(transformer.id)}>
                      Remove
                    </button>
                  </div>
                  <div className="field-report-guide-note">
                    <strong>Transformer nameplate photo.</strong> Upload a clear photo so AI can extract manufacturer, model, kVA, and voltage values. Then confirm or correct the fields.
                    <GuideButton topic="transformer" onOpen={setActiveGuide} />
                  </div>
                  <div className="field-report-grid three">
                    <Field label="Designation">
                      <input className="field-report-input" placeholder="Transformer T-1" {...inputProps(transformer.designation, (value) => updateTransformer(transformer.id, { designation: value }))} />
                    </Field>
                    <Field label="Transformer Nameplate Photos">
                      <input
                        className="field-report-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                          addTransformerPhotos(transformer.id, event.target.files);
                          event.target.value = "";
                        }}
                      />
                    </Field>
                    <Field label="Manufacturer">
                      <input className="field-report-input" placeholder="Eaton or Not legible" {...inputProps(transformer.manufacturer, (value) => updateTransformer(transformer.id, { manufacturer: value }))} />
                    </Field>
                    <Field label="Model">
                      <input className="field-report-input" placeholder="Model or Not legible" {...inputProps(transformer.model, (value) => updateTransformer(transformer.id, { model: value }))} />
                    </Field>
                    <Field label="Serial Number">
                      <input className="field-report-input" placeholder="Serial or Not legible" {...inputProps(transformer.serialNumber, (value) => updateTransformer(transformer.id, { serialNumber: value }))} />
                    </Field>
                    <Field label="kVA">
                      <input className="field-report-input" placeholder="75 kVA" {...inputProps(transformer.kva, (value) => updateTransformer(transformer.id, { kva: value }))} />
                    </Field>
                    <Field label="Location">
                      <input className="field-report-input" placeholder="Mall Mechanical Room, back of office, electrical room" {...inputProps(transformer.location, (value) => updateTransformer(transformer.id, { location: value }))} />
                    </Field>
                    <Field label="Primary Voltage">
                      <input className="field-report-input" placeholder="480V" {...inputProps(transformer.primaryVoltage, (value) => updateTransformer(transformer.id, { primaryVoltage: value }))} />
                    </Field>
                    <Field label="Secondary Voltage">
                      <input className="field-report-input" placeholder="208Y/120V" {...inputProps(transformer.secondaryVoltage, (value) => updateTransformer(transformer.id, { secondaryVoltage: value }))} />
                    </Field>
                  </div>
                  {transformer.photos.length > 0 && (
                    <p className="field-report-help" style={{ marginTop: 10 }}>
                      {transformer.photos.length} photo file{transformer.photos.length === 1 ? "" : "s"} selected. {transformer.aiStatus}
                    </p>
                  )}
                </div>
              ))}
              <button type="button" className="btn" style={{ marginTop: 10, background: "#0f766e", color: "#fff" }} onClick={addTransformer}>
                Add Transformer
              </button>

              <div className="field-report-grid" style={{ marginTop: 18 }}>
                <Field label="Telephone Demark Location" help="Usually a telephone board, demark, or low-voltage backboard.">
                  <input className="field-report-input" placeholder="Mall Mechanical Room" {...inputProps(report.electrical.telephoneDemarkLocation, (value) => updateSection("electrical", { telephoneDemarkLocation: value }))} />
                </Field>
                <Field label="Telephone Route">
                  <input className="field-report-input" placeholder="runs overhead without conduit to telephone board" {...inputProps(report.electrical.telephoneRoute, (value) => updateSection("electrical", { telephoneRoute: value }))} />
                </Field>
                <Field label="Override Electrical Narrative" full help="Optional. Use only if generated wording needs special handling.">
                  <textarea className="field-report-textarea" {...inputProps(report.electrical.narrative, (value) => updateSection("electrical", { narrative: value }))} />
                </Field>
                <Field label="Override Telephone Narrative" full>
                  <textarea className="field-report-textarea" {...inputProps(report.electrical.telephoneNarrative, (value) => updateSection("electrical", { telephoneNarrative: value }))} />
                </Field>
              </div>
            </section>
          )}

          {activeStep === "fire" && (
            <section>
              <h2>Fire Protection Systems</h2>
              <p className="field-report-help">
                Capture whether the space is sprinklered, where the riser is, main line sizes, branch lines, isolation valves, and fire alarm panel location.
              </p>
              <div className="field-report-guide-note" style={{ marginBottom: 16 }}>
                <strong>Fire alarm system detail.</strong> Verify whether the tenant space has fire alarm notification devices such as horn/strobes, pull stations, smoke/duct detectors, flow or tamper monitoring, and the Fire Alarm Control Unit location. If you only see devices but not the panel, note the visible devices and mark the panel location as not observed.
              </div>
              <div className="field-report-grid">
                <Field label="Is the space sprinklered?">
                  <ToggleGroup value={report.fire.isSprinklered} onChange={(value) => updateSection("fire", { isSprinklered: value })} />
                </Field>
                <Field label="Is there a fire alarm system?">
                  <ToggleGroup value={report.fire.hasFireAlarm} onChange={(value) => updateSection("fire", { hasFireAlarm: value })} />
                </Field>
                <Field label="Main Line Size" help="Look for sprinkler main labels or visible pipe size. Example: two 3 inch mains.">
                  <input className="field-report-input" placeholder='two 3" main lines' {...inputProps(report.fire.mainLineSize, (value) => updateSection("fire", { mainLineSize: value }))} />
                  <GuideButton topic="mainLine" onOpen={setActiveGuide} />
                </Field>
                <Field label="Main Entry Direction" help="Direction the sprinkler main piping enters the tenant space from, such as from the south mall corridor or rear wall. This is not necessarily the riser location.">
                  <input className="field-report-input" placeholder="from the south" {...inputProps(report.fire.mainEntryDirection, (value) => updateSection("fire", { mainEntryDirection: value }))} />
                </Field>
                <Field label="Riser Location" help="Physical location of the riser assembly with valves/gauges, such as the rear mechanical room. The main may enter from one direction while the riser sits in a different room or wall.">
                  <input className="field-report-input" placeholder="Mall Mechanical Room on the rear of the building" {...inputProps(report.fire.riserLocation, (value) => updateSection("fire", { riserLocation: value }))} />
                  <GuideButton topic="riser" onOpen={setActiveGuide} />
                </Field>
                <Field label="Isolation Valve?">
                  <ToggleGroup value={report.fire.isolationValve} onChange={(value) => updateSection("fire", { isolationValve: value })} />
                </Field>
                <Field label="Branch Line / Tap Notes" full help="Example: 4-1/2 inch mains run side-to-side with 1-1/4 inch branch lines running front-to-back.">
                  <textarea className="field-report-textarea" {...inputProps(report.fire.branchLineNotes, (value) => updateSection("fire", { branchLineNotes: value }))} />
                  <button type="button" className="field-report-help-button" onClick={() => setActiveGuide("branchLine")}>
                    Show branch line guide
                  </button>
                </Field>
                <Field label="Fire Alarm Panel Location" full>
                  <input className="field-report-input" placeholder="Mall Mechanical Room" {...inputProps(report.fire.fireAlarmPanelLocation, (value) => updateSection("fire", { fireAlarmPanelLocation: value }))} />
                  <GuideButton topic="fireAlarmPanel" onOpen={setActiveGuide} />
                </Field>
                <Field label="Override Fire Protection Narrative" full help="Optional final wording. Example: The tenant space is served by the building wet-pipe sprinkler system. Main piping enters from the south and the riser is located in the rear mechanical room.">
                  <textarea className="field-report-textarea" placeholder="Only use this if the generated sprinkler paragraph needs special handling." {...inputProps(report.fire.narrative, (value) => updateSection("fire", { narrative: value }))} />
                </Field>
                {report.fire.hasFireAlarm === "yes" && (
                  <Field label="Override Fire Alarm Narrative" full help="Optional final wording. Example: The space is provided with fire alarm notification devices connected to the building fire alarm system; the main panel is located in the rear electrical room.">
                    <textarea className="field-report-textarea" placeholder="Only use this if the generated fire alarm paragraph needs special handling." {...inputProps(report.fire.alarmNarrative, (value) => updateSection("fire", { alarmNarrative: value }))} />
                  </Field>
                )}
              </div>
            </section>
          )}

          {activeStep === "review" && (
            <section>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h2>Review Report</h2>
                <button
                  type="button"
                  className="btn"
                  style={{ background: isEditingReport ? "#64748b" : "#0f766e", color: "#fff" }}
                  onClick={() => setIsEditingReport((editing) => !editing)}
                >
                  {isEditingReport ? "Preview Report" : "Edit Report"}
                </button>
              </div>
              {missingItems.length > 0 && (
                <div style={{ background: "#fffbeb", border: "1px solid #facc15", borderRadius: 8, padding: 14, marginBottom: 16 }}>
                  <strong>Items to verify before final export:</strong>
                  <ul className="field-report-warning-list">
                    {missingItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!isEditingReport && <div className="field-report-preview">
                <p>{formatDate(report.project.reportDate)}</p>
                <p>
                  {textOrPlaceholder(report.project.clientName, "Client Name")}<br />
                  {textOrPlaceholder(report.project.companyName, "Company Name")}<br />
                  {textOrPlaceholder(report.project.companyAddress, "Client Address")}<br />
                  {textOrPlaceholder(report.project.companyCityStateZip, "Client City, State, ZIP")}
                </p>
                <p>
                  RE: Project Name: {textOrPlaceholder(report.project.projectName, "Project Name")}<br />
                  Schnackel Project No.: {textOrPlaceholder(report.project.schnackelProjectNumber, "XXXXXX")}
                </p>
                <p>Dear {textOrPlaceholder(report.project.clientName, "Client Name")}:</p>
                <p>{preview.intro}</p>
                <p>
                  <strong><u>Investigation Performed by:</u></strong><br />
                  {textOrPlaceholder(report.project.surveyorName, "Surveyor Name")}<br />
                  Schnackel Engineers<br />
                  Telephone No. 402-391-7680, Fax No. 402-391-7488
                </p>
                <p>
                  <strong><u>Site Address:</u></strong><br />
                  {textOrPlaceholder(report.project.siteAddress, "Site Address")}<br />
                  {textOrPlaceholder(report.project.siteCityStateZip, "City, State, ZIP")}
                </p>
                <h3>Mechanical Systems:</h3>
                <p>{preview.mechanical}</p>
                <h3>Plumbing Systems:</h3>
                <p>{preview.plumbing}</p>
                {preview.gas && <p>{preview.gas}</p>}
                <h3>Electrical Systems:</h3>
                <p>{preview.electrical}</p>
                <p>{preview.telephone}</p>
                <h3>Fire Protection Systems:</h3>
                <p>{preview.fire}</p>
                {preview.alarm && <p>{preview.alarm}</p>}
                <p>If you have any questions, please let me know.</p>
                <p>Sincerely,</p>
                <p>{textOrPlaceholder(report.project.surveyorName, "Surveyor Name")}</p>
              </div>}
              {isEditingReport && (
                <Field
                  label="Editable Final Report Text"
                  full
                  help="Edits here will be the wording used for Word/PDF export once the generator is connected."
                >
                  <textarea
                    className="field-report-textarea"
                    style={{ minHeight: 520, fontFamily: "Georgia, 'Times New Roman', serif" }}
                    value={editableReportText}
                    onChange={(event) => {
                      setReportWasEdited(true);
                      setEditableReportText(event.target.value);
                    }}
                  />
                  {reportWasEdited && (
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: 10, background: "#64748b", color: "#fff" }}
                      onClick={() => {
                        setReportWasEdited(false);
                        setEditableReportText(generatedReportText);
                      }}
                    >
                      Reset to Generated Text
                    </button>
                  )}
                </Field>
              )}
              <div className="field-report-alert-box">
                <strong>AI report alerts</strong>
                <ul>
                  {missingItems.length > 0 ? (
                    missingItems.slice(0, 8).map((item) => <li key={item}>{item} is missing or needs confirmation.</li>)
                  ) : (
                    <li>No required report alerts. Review wording before export.</li>
                  )}
                  {reportQualityAlerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                  {report.mechanical.rtus.some((rtu) => rtu.photos.length === 0) && (
                    <li>One or more RTUs do not have a nameplate photo attached.</li>
                  )}
                </ul>
              </div>
              <div className="field-report-control-row" style={{ marginTop: 18 }}>
                <button type="button" className="btn" style={{ background: "#6c757d", color: "#fff" }} onClick={() => window.print()}>
                  Print Preview
                </button>
                <button type="button" className="btn btn-success" onClick={() => setShowMissingModal(true)}>
                  Review Missing Items
                </button>
              </div>
              <p className="field-report-help" style={{ marginTop: 10 }}>
                Word/PDF export is not connected yet in this local build. Use Print Preview for the demo and review alerts before copying the wording into the final template.
              </p>
            </section>
          )}

          <div className="field-report-control-row" style={{ marginTop: 24, justifyContent: "space-between" }}>
            <button type="button" className="btn" style={{ background: "#64748b", color: "#fff" }} onClick={previousStep} disabled={currentIndex === 0}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={currentIndex === steps.length - 1 ? () => window.print() : nextStep}>
              {currentIndex === steps.length - 1 ? "Print Preview" : "Next"}
            </button>
          </div>
        </main>
      </div>

      {showMissingModal && (
        <div className="field-report-modal-backdrop" onClick={() => setShowMissingModal(false)}>
          <div className="field-report-modal" onClick={(event) => event.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Confirm Report Generation</h2>
            {missingItems.length > 0 ? (
              <>
                <p>The report can be generated, but these items are missing or should be verified:</p>
                <ul className="field-report-warning-list">
                  {missingItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="field-report-help">
                  When the document generator is connected, these items will appear as Not Available, Not legible, or verification language in the report.
                </p>
              </>
            ) : (
              <p>All required report fields have been filled. The next backend pass will generate the Word document and matching PDF from the template.</p>
            )}
            <div className="field-report-control-row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
              <button type="button" className="btn" style={{ background: "#64748b", color: "#fff" }} onClick={() => setShowMissingModal(false)}>
                Keep Editing
              </button>
              <button type="button" className="btn btn-success" onClick={() => setShowMissingModal(false)}>
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      {activeGuide && (
        <div className="field-report-modal-backdrop" onClick={() => setActiveGuide(null)}>
          <div className="field-report-modal" onClick={(event) => event.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Field Guide</h2>
            <p style={{ lineHeight: 1.6 }}>{guideText[activeGuide]}</p>
            <GuideVisual topic={activeGuide} />
            <div className="field-report-control-row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-primary" onClick={() => setActiveGuide(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
