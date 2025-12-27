# Quick Testing Reference

## 5-Minute Test Flow

### 1. Start Application
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

### 2. Create Test Project
- Click **"➕ New Project"**
- Name: "Quick Test"
- Number: "TEST-001"
- Click **"Create Project"**

### 3. Test AI Electrical Survey
From the test project card, click **"🤖 AI Electrical Survey"**:
1. Upload 2-3 nameplate images
2. Watch AI classify each image
3. Review extracted data with confidence scores
4. Fill in required fields (designation, location, wire sizes)
5. Save equipment

### 4. View Testing Report
Click **"📊 Testing & Diagnostics"** to see:
- Overall confidence scores
- Extraction quality analysis
- Missing fields warnings
- Recommended actions
- Export JSON option

## Button Reference

### From Project List
| Button | Description |
|--------|-------------|
| 📸 HVAC Survey | Original RTU capture |
| ⚡ Electrical Survey | Simple electrical panel capture |
| 🤖 AI Electrical Survey | **NEW** Multi-image AI workflow |
| 📊 Testing & Diagnostics | **NEW** Confidence & quality report |
| 📄 View Report | Full project report |
| 🗑️ Delete | Remove project |

### AI Survey Stages
1. **IMAGE_UPLOAD** → Upload multiple images
2. **CLASSIFICATION** → AI identifies equipment type
3. **AI_ANALYSIS** → AI extracts nameplate data
4. **USER_INPUTS** → Complete additional fields
5. **REVIEW** → Gap detection & validation
6. **SAVE** → Equipment stored

## Quick Validation Tests

### Wire Size Validation
- 200A panel + 12 AWG wire = ❌ ERROR (too small)
- 200A panel + 3/0 AWG wire = ✅ PASS

### Voltage Validation
- 480V transformer → 208V panel = ✅ PASS (step down)
- 208V disconnect → 480V panel = ❌ ERROR (step up)

### Amperage Validation
- 200A disconnect → 100A panel = ✅ PASS
- 200A disconnect → 400A panel = ⚠️ WARNING (exceeds)

## Expected Confidence Scores

| Image Quality | Expected Score | Color |
|---------------|----------------|-------|
| Clear, no glare | 90-100% | 🟢 Green |
| Minor issues | 70-90% | 🟡 Yellow |
| Weathered | 50-70% | 🟠 Orange |
| Illegible fields | <50% | 🔴 Red |

## Common Test Scenarios

### Scenario 1: Perfect Workflow
1. Upload 3 clear nameplate images
2. All classified with >90% confidence
3. Fill in user inputs with valid data
4. No validation errors
5. Save successfully

### Scenario 2: Poor Image Quality
1. Upload blurry/glare image
2. Classification works but confidence <70%
3. Manual verification required
4. Testing report flags for retake

### Scenario 3: Validation Errors
1. Create equipment with invalid wire size
2. Gap detection shows error
3. Fix wire size
4. Save successfully

### Scenario 4: Mixed Equipment Types
1. Upload transformer, disconnect, meter, panel
2. All classified correctly
3. Hierarchy built automatically
4. Voltage stepping validated

## Browser Console Commands

Open browser console (F12) and run:

```javascript
// View all projects
JSON.parse(localStorage.getItem('mep-survey-projects'))

// View specific project
const projects = JSON.parse(localStorage.getItem('mep-survey-projects'))
console.log(projects[0])

// Check electrical equipment
console.log(projects[0].electricalEquipment)

// Clear all data (CAUTION!)
localStorage.removeItem('mep-survey-projects')
```

## URLs for Direct Access

```
Project List:           http://localhost:3000/
AI Electrical Survey:   http://localhost:3000/advanced-electrical/PROJECT_ID
Testing Report:         http://localhost:3000/testing-report/PROJECT_ID
Simple Electrical:      http://localhost:3000/electrical/PROJECT_ID
Camera/HVAC:           http://localhost:3000/camera/PROJECT_ID
```

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Button not showing | Equipment data may not exist yet |
| Classification fails | Check backend Lambda is running |
| Validation too strict | Verify using NEC standard values |
| Data not saving | Check browser console for errors |
| Page blank | Hard refresh (Ctrl+Shift+R) |

## Test Data Requirements

Have ready:
- ✅ 3-5 nameplate images (JPG/PNG)
- ✅ Mix of equipment types (panel, transformer, etc.)
- ✅ At least one clear, high-quality image
- ✅ At least one lower-quality image for testing

## Success Indicators

You know it's working when:
- ✅ Images upload and classify automatically
- ✅ Confidence scores display correctly
- ✅ Validation catches invalid wire sizes
- ✅ Testing report shows statistics
- ✅ No console errors
- ✅ Data persists after page refresh

## Need Help?

See full TESTING_GUIDE.md for:
- Detailed testing procedures
- Expected behaviors
- Troubleshooting steps
- Known limitations
