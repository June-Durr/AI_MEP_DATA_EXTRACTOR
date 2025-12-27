# MEP Survey AI - Testing Guide

## Overview
This guide will help you test all features of the AI-integrated electrical surveying system, including the new Advanced Electrical Survey and Testing & Diagnostics features.

## Prerequisites
- Frontend development server running (`npm start` in frontend directory)
- Backend Lambda function deployed or local mock ready
- Sample electrical equipment nameplate images ready for testing

## Quick Start Testing Path

### 1. Create a Test Project
1. Navigate to `http://localhost:3000`
2. Click **"➕ New Project"**
3. Fill in required fields:
   - Project Name: "Test AI Electrical Survey"
   - Project Number: "TEST-001"
4. Click **"Create Project"**

### 2. Test Standard Electrical Survey (Baseline)
This is the original workflow for comparison:
1. From the project card, click **"⚡ Electrical Survey"**
2. Take/upload a panel nameplate photo
3. Select equipment type manually (Panel/Transformer)
4. Review AI-extracted data
5. Save the equipment
6. Return to project list

### 3. Test AI-Powered Electrical Survey (NEW)
This is the new AI-first workflow:

#### Stage 1: Image Upload
1. From project card, click **"🤖 AI Electrical Survey"**
2. Upload multiple nameplate images at once (try 3-5 images)
3. Images can be mixed types (panels, transformers, service disconnects, meters)
4. Click **"Proceed to Classification"**

#### Stage 2: AI Classification
- System automatically classifies each image
- Shows confidence scores for each classification
- Review classification results
- Click **"Proceed to Data Extraction"**

#### Stage 3: AI Analysis
- System extracts data from all classified images in parallel
- Shows extraction progress
- Displays confidence scores for extracted fields
- Click **"Proceed to User Inputs"**

#### Stage 4: User Input Collection
- Review AI-extracted data with confidence badges
- Fill in additional required information:
  - Equipment designation (e.g., "Panel MDP-1")
  - Location (dropdown + custom option)
  - Wire sizes (phase, neutral, ground)
  - Conduit size
  - Physical dimensions
  - Condition assessment
- System validates wire sizes against NEC ampacity tables
- Click **"Save Equipment"** for each item
- Click **"Proceed to Review"**

#### Stage 5: Gap Detection & Validation
- View validation warnings and errors
- See electrical hierarchy visualization
- Check for:
  - Missing equipment in chain
  - Voltage stepping issues
  - Undersized wires
  - Missing critical data
- Fix any errors before saving
- Click **"Save All Equipment"**

#### Stage 6: Save Complete
- Equipment saved to project
- Return to project list

### 4. Test Testing & Diagnostics Report (NEW)
This feature appears after electrical equipment is captured:

1. From project card, click **"📊 Testing & Diagnostics"**
2. Review the report sections:

#### Section 1: Overall Statistics
- Total equipment count
- Equipment breakdown by type
- Average confidence score
- Extraction completeness percentage
- Quality metrics summary

#### Section 2: Confidence Breakdown Table
- Per-equipment confidence scores
- Color-coded confidence levels:
  - 🟢 Green (>90%) - Excellent
  - 🟡 Yellow (70-90%) - Good
  - 🟠 Orange (50-70%) - Fair
  - 🔴 Red (<50%) - Poor
- Per-field confidence scores

#### Section 3: Side-by-Side Comparison
- Click **"View Details"** on any equipment
- See original nameplate image next to extracted data
- Confidence badges on each field
- Visual verification of AI accuracy

#### Section 4: Extraction Quality Report
- Glare detected: X images
- Focus issues: Y images
- Partial occlusion: Z images
- Weathering damage: W images
- Click on issue type to see affected equipment

#### Section 5: Missing Fields Analysis
- List of equipment with incomplete data
- What fields are missing and why
- AI recommendations for follow-up

#### Section 6: Recommended Actions
- Priority-ranked action items
- Suggestions like:
  - "Retake photo of Panel-2 (glare detected)"
  - "Field verify serial number on Transformer-1 (low confidence)"
  - "Complete wire size for Service Disconnect"

#### Section 7: Export Options
- Click **"Export to JSON"** to download diagnostics data
- Data includes all statistics, quality metrics, and recommendations

### 5. Test Electrical Hierarchy Validation

Test voltage stepping validation:
1. Create transformer (480V → 208V)
2. Create service disconnect (208V)
3. Create panels (208V or 120V)
4. Try creating a panel with 480V fed from 208V disconnect
   - Should show error: "Voltage exceeds feeding equipment"

Test amperage validation:
1. Create service disconnect rated 200A
2. Create panel rated 400A fed from the disconnect
   - Should show warning: "Amperage exceeds feeding equipment"

Test wire size validation:
1. Create panel rated 200A
2. Enter phase wire size: "12 AWG"
   - Should show error: "Wire size undersized for load"
3. Change to "3/0 AWG"
   - Should validate successfully

### 6. Test Backward Compatibility

Verify old data still works:
1. Use a project with old-format data (electricalPanels, transformers arrays)
2. Click **"📊 Testing & Diagnostics"**
3. System should automatically convert old format on-the-fly
4. Report should display with default confidence scores

### 7. Test Error Handling

Test offline mode:
1. Disconnect internet (or turn off Lambda)
2. Try uploading images in AI Electrical Survey
3. Should show clear error message
4. Data should be preserved in browser

Test invalid images:
1. Upload a non-nameplate image (e.g., landscape photo)
2. AI should classify as "UNKNOWN"
3. System should allow manual classification override

Test missing required fields:
1. Try saving equipment without designation
2. Should prevent save and highlight missing fields

## Testing Checklist

### Core AI Features
- [ ] Multi-image upload works (3+ images)
- [ ] AI classification runs automatically
- [ ] Confidence scores display correctly
- [ ] Mixed equipment types classified correctly
- [ ] Data extraction shows progress
- [ ] Extracted data displays with confidence badges

### User Input & Validation
- [ ] Required fields validation works
- [ ] Wire size dropdown shows all NEC standard sizes
- [ ] Conduit size dropdown shows all standard sizes
- [ ] Location dropdown + custom option works
- [ ] Mounting type suggestions work
- [ ] Physical dimensions accept numeric input
- [ ] Condition assessment dropdown works

### NEC Validation
- [ ] Wire size too small shows error
- [ ] Correct wire size validates successfully
- [ ] 125% continuous load rule applied
- [ ] Conduit fill calculation works (40% limit)
- [ ] Voltage stepping validation works
- [ ] Amperage validation works

### Gap Detection
- [ ] Missing equipment warnings show
- [ ] Unreadable field warnings show
- [ ] Conflicting data errors show
- [ ] Hierarchy visualization displays correctly
- [ ] Orphaned equipment flagged

### Testing Report
- [ ] Overall statistics calculate correctly
- [ ] Confidence breakdown table displays all equipment
- [ ] Color coding matches confidence levels
- [ ] Side-by-side comparison modal opens
- [ ] Extraction quality issues listed correctly
- [ ] Missing fields analysis accurate
- [ ] Recommended actions prioritized correctly
- [ ] JSON export downloads successfully

### Navigation & UX
- [ ] All buttons accessible from project list
- [ ] Navigation between stages works smoothly
- [ ] Back button preserves state
- [ ] Error messages clear and helpful
- [ ] Loading states show during API calls
- [ ] Tooltips display on hover

### Data Persistence
- [ ] Equipment saves to localStorage correctly
- [ ] Page refresh preserves data
- [ ] Multiple projects don't interfere
- [ ] Old format data converts correctly
- [ ] Delete project removes all data

## Known Limitations & Expected Behavior

1. **AI Classification**: May struggle with severely damaged or weathered nameplates
2. **Confidence Scores**: Older/weathered nameplates typically score 50-70%
3. **Wire Size Validation**: Only validates against standard NEC table (75°C copper)
4. **Offline Mode**: Classification and extraction require backend connection
5. **Image Format**: Supports JPG, PNG, HEIC (standard image formats)

## Sample Test Data

### Good Quality Nameplate (Expected: >90% confidence)
- Clear, well-lit photo
- Entire nameplate visible
- Text sharp and readable
- No glare or reflections

### Fair Quality Nameplate (Expected: 70-90% confidence)
- Some weathering or dirt
- Minor glare on parts
- All critical fields still readable

### Poor Quality Nameplate (Expected: <70% confidence)
- Significant weathering
- Heavy glare or poor lighting
- Some fields illegible
- Requires manual verification

## Troubleshooting

### "Classification failed" error
- Check backend Lambda is running
- Verify image file is valid format
- Try with smaller file size (<5MB)

### Wire size validation failing incorrectly
- Ensure entering standard NEC wire size from dropdown
- Check amperage rating is correct
- Verify 125% rule calculation

### Testing Report not appearing
- Ensure at least 1 electrical equipment captured
- Check browser console for errors
- Verify project has electricalEquipment or electricalPanels array

### Hierarchy validation showing false positives
- Verify parent-child relationships set correctly
- Check voltage values entered correctly (numeric only)
- Ensure equipment types assigned properly

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser console errors (F12 → Console)
5. Screenshot if UI issue
6. Sample image if classification issue

## Success Criteria

A successful test session should demonstrate:
- ✅ 3+ images classified correctly (>80% accuracy)
- ✅ All required user inputs validate properly
- ✅ NEC validation catches undersized wires
- ✅ Testing report shows accurate statistics
- ✅ Confidence scores match image quality
- ✅ Gap detection finds actual issues
- ✅ Export functionality works
- ✅ No console errors during normal operation

Happy testing! 🧪🔌⚡
