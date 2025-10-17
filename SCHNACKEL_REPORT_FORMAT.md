markdown# Schnackel Engineers - HVAC Equipment Survey Form

## Purpose

This document maps the official Schnackel Engineers HVAC Equipment Survey Form to AI extraction requirements for nameplate photo analysis.

---

## Official Survey Form Fields

### Unit Information

- **Unit #:** [Sequential number - #1, #2, #3, etc.]
- **Unit Type:** [Packaged RTU, Split System, etc.]
- **Heat Type:** Gas ☐ | Electric ☐
- **Manufacturer:** [Lennox, Trane, Carrier, York, etc.]
- **Model:** [Full model number from nameplate]
- **Serial Number:** [Full serial - decode for manufacturing year]
- **Age of Unit:** [Current year - Manufacturing year]
- **Condition:** [Good/Fair/Poor based on visual inspection]

---

## Electrical Information

### Main Electrical

- **Disconnect Size:** [Amperage - e.g., "60A"]
- **Fuse Size:** [Amperage - e.g., "40A"] or N.F. (Non-Fused)
- **KW:** [Kilowatts]
- **Voltage:** [e.g., "208/230V" or "460V"]
- **Phase:** [1 or 3]

### Compressor #1

- **Quantity:** [Usually 1 or 2]
- **Volts:** [Voltage]
- **Phase:** [1 or 3]
- **RLA:** [Rated Load Amps]
- **LRA:** [Locked Rotor Amps]
- **MCA:** [Minimum Circuit Ampacity]

### Compressor #2 (if dual compressor system)

- **Quantity:** [Usually 1 or 2]
- **Volts:** [Voltage]
- **Phase:** [1 or 3]
- **RLA:** [Rated Load Amps]
- **LRA:** [Locked Rotor Amps]
- **MOCP:** [Maximum Overcurrent Protection]

### Condenser Fan Motor

- **Quantity:** [Number of fans]
- **Volts:** [Voltage]
- **Phase:** [1 or 3]
- **FLA:** [Full Load Amps]
- **HP:** [Horsepower]

### Combustion Fan Motor

- **Quantity:** [Number of fans]
- **Volts:** [Voltage]
- **Phase:** [1 or 3]
- **FLA:** [Full Load Amps]
- **HP:** [Horsepower]

### Indoor Fan Motor

- **Quantity:** [Number of fans]
- **Volts:** [Voltage]
- **Phase:** [1 or 3]
- **FLA:** [Full Load Amps]
- **HP:** [Horsepower]

---

## Gas Information

- **Gas Type:** Natural Gas ☐ | Propane ☐
- **Gas Input Min. (BTU/HR):** [Minimum input rating]
- **Gas Input Max. (BTU/HR):** [Maximum input rating]
- **Gas Pipe Size (inches):** [Pipe diameter]
- **Gas Output Capacity (BTU/HR):** [Actual output capacity]

---

## AI Extraction Requirements

### CRITICAL: What AI Must Extract from Nameplate Photo

```json
{
  "systemType": {
    "category": "Packaged Roof Top Unit",
    "configuration": "Electric Cooling / Gas Heat",
    "confidence": "high"
  },
  "basicInfo": {
    "manufacturer": "Lennox",
    "model": "LCA120H2RN1Y",
    "serialNumber": "5608D05236",
    "manufacturingYear": 2006,
    "currentAge": 19,
    "condition": "Fair",
    "confidence": "high"
  },
  "electrical": {
    "disconnectSize": "60A",
    "fuseSize": "40A",
    "voltage": "208/230V",
    "phase": "3",
    "kw": "12.5",
    "confidence": "high"
  },
  "compressor1": {
    "quantity": 1,
    "volts": "208-230V",
    "phase": "3",
    "rla": "28.5",
    "lra": "163",
    "mca": "35",
    "confidence": "high"
  },
  "compressor2": {
    "quantity": 1,
    "volts": "208-230V",
    "phase": "3",
    "rla": "28.5",
    "lra": "163",
    "mocp": "50",
    "confidence": "high"
  },
  "condenserFanMotor": {
    "quantity": 2,
    "volts": "208-230V",
    "phase": "3",
    "fla": "3.5",
    "hp": "1",
    "confidence": "high"
  },
  "indoorFanMotor": {
    "quantity": 1,
    "volts": "208-230V",
    "phase": "3",
    "fla": "8.5",
    "hp": "3",
    "confidence": "medium"
  },
  "gasInformation": {
    "gasType": "Natural Gas",
    "inputMinBTU": "100000",
    "inputMaxBTU": "120000",
    "outputCapacityBTU": "96000",
    "gasPipeSize": "1.5",
    "confidence": "high"
  },
  "cooling": {
    "tonnage": "10 tons",
    "refrigerant": "R-410A",
    "confidence": "high"
  },
  "serviceLife": {
    "assessment": "BEYOND SERVICE LIFE (15+ years)",
    "recommendation": "Replace",
    "ashrae_standard": "ASHRAE median service life for RTU: 15 years"
  }
}

Report Generation Format
Mechanical Systems Narrative
The proposed space is served by [NUMBER WORD] single packaged gas-fired roof top unit[s].
The [ORDINAL] unit is [a/an] [TONNAGE]-ton model manufactured by [MANUFACTURER] in [YEAR].
[Repeat for each RTU]

With ASHRAE's estimated median service life of a packaged roof top unit being 15 years,
[ASSESSMENT].

With the proposed space being approximately [SQFT] sq.ft., Schnackel Engineers estimates
[MIN]-[MAX] tons of cooling will be required, however complete heat gain/loss calculations
will be performed to determine the exact amount of cooling required.

The majority of ductwork in the space is interior insulated rectangular sheet metal
ductwork with insulated flexible diffuser connections.
Equipment Summary Table
RTU #ManufacturerModelCapacityYearAgeStatus#1LennoxLCA12010 tons200619Replace#2TraneYSC12010 tons20187OK
Status Logic:

Age ≤ 15 years = "OK"
Age > 15 years = "Replace"


Common Extraction Errors to Avoid
❌ ERROR #1: Confusing Unit Weight with Cooling Capacity
WRONG: Extracting "5 LBS 6 OZ" as tonnage
RIGHT: Calculate from model number or BTU rating
Model Number Tonnage Calculation:

ZCA060 = 60,000 BTU ÷ 12,000 = 5 tons
LCA120 = 120,000 BTU ÷ 12,000 = 10 tons
LGA180 = 180,000 BTU ÷ 12,000 = 15 tons

❌ ERROR #2: Missing Electrical Details
The survey form requires BOTH:

Disconnect Size (e.g., "60A")
Fuse Size (e.g., "40A")

Look for labels: "MCA", "MOCP", "MAX FUSE", "MIN CIRCUIT AMPS"
❌ ERROR #3: Not Extracting Fan Motor Details
Schnackel needs:

Condenser fan motor specs
Indoor blower motor specs
Quantity, HP, FLA for each

❌ ERROR #4: Incomplete Gas Information
Must extract ALL gas fields:

Gas type (Natural Gas vs Propane)
Input Min BTU
Input Max BTU
Output Capacity BTU


Lennox Serial Number Decoding
Format: YYWWXXXXXX
Examples:

Serial 5608D05236 = Year 2006, Week 08
Serial 0823A12345 = Year 2008, Week 23
Serial 1501B67890 = Year 2015, Week 01

Age Calculation:

2025 - 2006 = 19 years → REPLACE
2025 - 2015 = 10 years → OK


Number Words & Ordinals Reference
NumberWordOrdinal1onefirst2twosecond3threethird4fourfourth5fivefifth6sixsixth7sevenseventh8eighteighth

Field Mapping: Survey Form → AI Output
Survey Form FieldAI JSON PathManufacturerbasicInfo.manufacturerModelbasicInfo.modelSerial NumberbasicInfo.serialNumberAge of UnitbasicInfo.currentAgeDisconnect Sizeelectrical.disconnectSizeFuse Sizeelectrical.fuseSizeVoltageelectrical.voltagePhaseelectrical.phaseCompressor #1 RLAcompressor1.rlaCompressor #1 LRAcompressor1.lraCompressor #1 MCAcompressor1.mcaGas TypegasInformation.gasTypeGas Input MaxgasInformation.inputMaxBTUGas Output CapacitygasInformation.outputCapacityBTU
```

Next Steps

✅ Update Lambda function (quickAnalysis.js) to extract ALL form fields
✅ Test with real nameplate photos
✅ Verify all electrical specs are captured
✅ Verify gas information is complete
✅ Generate report matching Schnackel format
