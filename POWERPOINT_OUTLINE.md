# POWERPOINT SLIDE OUTLINE
## Optional: If You Want Visual Slides for the Demo

---

## SLIDE 1: TITLE SLIDE
**Title:** AI-Powered HVAC Equipment Survey Automation
**Subtitle:** Schnackel Engineers Form Compliance
**Your Name**
**Date**

**Visual:** Photo of HVAC rooftop unit or nameplate

---

## SLIDE 2: THE PROBLEM
**Title:** Current HVAC Survey Process is Time-Intensive

**Bullet Points:**
- Field engineers photograph equipment nameplates
- Manual data transcription: 15-20 minutes per unit
- 30+ data fields per Schnackel HVAC form
- Error-prone, tedious, prevents focus on analysis
- Typical project: 20-30 units = 5-10 hours of transcription

**Visual:** Split screen showing photo of nameplate + blank Schnackel form with arrows pointing to ~30 fields

---

## SLIDE 3: THE SOLUTION
**Title:** AI-Powered Nameplate Data Extraction

**Bullet Points:**
- Upload nameplate photo → AI extraction in 5-10 seconds
- AWS Bedrock with Claude 3 Vision model
- Automatically populates Schnackel HVAC Equipment Survey Form
- Engineer reviews and corrects vs. manual transcription
- 80-87% time reduction (15 min → 2 min per unit)

**Visual:** Simple workflow diagram:
```
📸 Photo Upload → 🤖 AI Extraction → ✅ Engineer Review → 📋 Completed Form
   (5 sec)           (10 sec)            (2 min)           (DONE)
```

---

## SLIDE 4: WHAT THE AI EXTRACTS
**Title:** Comprehensive Nameplate Data Extraction

**Two Column Layout:**

**LEFT COLUMN - Equipment Info:**
- ✅ Manufacturer & Model
- ✅ Serial Number → Age calculation
- ✅ Service life assessment (15+ years flagged)
- ✅ Cooling capacity (tonnage)
- ✅ Refrigerant type

**RIGHT COLUMN - Technical Specs:**
- ✅ Electrical: Voltage, Phase, MCA, MOCP
- ✅ Compressor: RLA, LRA (Comp A & B)
- ✅ Fan Motors: Condenser, Outdoor, Indoor, Combustion
- ✅ Phase data for ALL motors (Schnackel compliance)
- ✅ Gas info (if applicable)

**Visual:** Screenshot of extraction results or sample Schnackel form filled out

---

## SLIDE 5: DEMO
**Title:** Live Demonstration

**(This slide is just a placeholder - you'll do the live demo here)**

**Talking Points on Slide:**
1. Upload nameplate photo
2. AI processes image (AWS Bedrock)
3. Review extraction results
4. Show Schnackel form population
5. Multi-image capability (nameplate + fuse label)

**Visual:** Screenshot of your application interface

---

## SLIDE 6: TECHNICAL ARCHITECTURE
**Title:** Serverless AWS Architecture

**Diagram:**
```
┌─────────────┐
│   React     │ ← Field Engineers (Browser/Phone)
│  Frontend   │
└──────┬──────┘
       │ HTTPS
┌──────▼──────┐
│ AWS API     │
│  Gateway    │
└──────┬──────┘
       │
┌──────▼──────┐
│ AWS Lambda  │ ← quickAnalysis.js
└──────┬──────┘
       │ Bedrock API
┌──────▼──────┐
│  Claude 3   │ ← Vision Model (OCR + Interpretation)
│   Haiku     │
└─────────────┘
```

**Bullet Points:**
- Serverless: No infrastructure to maintain
- Scalable: Handles 1 or 1000 requests
- Cost: $0.01-0.03 per nameplate analysis
- Fast: 5-10 second response time

---

## SLIDE 7: CURRENT ACCURACY & CHALLENGES
**Title:** Performance & Known Limitations

**LEFT COLUMN - Current Performance:**
- ✅ 70-80% accuracy on clear nameplates
- ✅ 40-50% accuracy on degraded/worn nameplates
- ✅ Excellent on: Basic info, electrical specs, compressor data
- ⚠️ Challenges on: Worn text, glare, angled photos

**RIGHT COLUMN - OCR Challenges:**
- Character confusion: '0' vs 'D' vs 'O', '6' vs '8'
- Table structure parsing (rows/columns)
- Model reads too far into adjacent fields
- Weathered nameplates with faded text

**Visual:** Side-by-side of clear nameplate vs degraded nameplate

**Bottom Text:**
*"Even at 70% accuracy, this delivers 80%+ time savings vs manual transcription"*

---

## SLIDE 8: IMPROVEMENT ROADMAP
**Title:** Path to 90% Accuracy

**WEEK 1-2: Quick Wins**
- ✅ Upgrade Claude Haiku → Claude 3.5 Sonnet (better vision)
- ✅ Image preprocessing (contrast, glare reduction)
- ✅ Engineer feedback mechanism
- ✅ Confidence scoring per field

**MONTH 1: Hybrid OCR Approach**
- 🔧 AWS Textract for table structure detection
- 🔧 Claude for semantic interpretation
- 🔧 Expected accuracy: 70% → 85-90%

**MONTH 2-3: Pilot Testing**
- 🔧 Test on 50 real nameplate photos
- 🔧 2-3 real projects with field engineers
- 🔧 Measure actual time savings
- 🔧 Refine based on feedback

**Visual:** Timeline graphic showing progression

---

## SLIDE 9: BUSINESS VALUE
**Title:** ROI Analysis

**Cost Analysis:**
```
MANUAL PROCESS:
• 20 units/project × 15 min = 5 hours
• Engineer rate: $75/hr
• Cost per project: $375

AI-ASSISTED PROCESS:
• 20 units/project × 2 min = 0.67 hours
• Engineer rate: $75/hr
• Cost: $50 labor + $0.40 AI = $50.40

SAVINGS PER PROJECT: $324 (86% reduction)
```

**Monthly Scale:**
- 10 projects/month
- Savings: $3,240/month = $38,880/year
- Engineer hours freed: 43 hrs/month for analysis work

**Visual:** Bar chart comparing manual vs AI-assisted cost/time

---

## SLIDE 10: PILOT PROPOSAL
**Title:** Proposed Pilot Deployment

**Scope:**
- 📋 2-3 real building survey projects
- 🏢 30-50 HVAC units total
- 👷 2-3 field engineers participating
- 📅 4-week duration

**Success Metrics:**
- 🎯 Field-level accuracy: 85%+
- 🎯 Fully correct extractions: 60%+
- 🎯 Time reduction: 80%+
- 🎯 Engineer satisfaction: Positive

**Deliverables:**
- Accuracy report with error analysis
- Time savings measurement
- Engineer feedback survey
- Recommendations for production rollout

---

## SLIDE 11: LONG-TERM VISION
**Title:** Future Capabilities

**Phase 1 (Current):** HVAC Nameplate Extraction
**Phase 2 (Q1):** Multi-Equipment Support (Electrical Panels, Transformers)
**Phase 3 (Q2):** Complete Survey Automation
- Photo → Extraction → Analysis → Report Generation
- 90%+ automation of survey documentation

**Phase 4 (Q3):** Predictive Intelligence
- AI-suggested equipment replacement recommendations
- Energy savings estimates
- Preliminary equipment specifications

**Phase 5 (Q4):** Integration
- API integration with company MEP software platform
- Mobile PWA for offline field use
- Active learning from engineer corrections

**Visual:** Roadmap timeline or pyramid showing phases

---

## SLIDE 12: QUESTIONS FOR DISCUSSION
**Title:** Feedback & Next Steps

**Key Questions:**
1. Is 70-80% current accuracy acceptable for pilot?
2. Which upcoming projects are good pilot candidates?
3. Should I prioritize OCR improvement or expand to electrical equipment?
4. How does this align with [Company's] AI platform roadmap?

**Proposed Next Steps:**
- ✅ Pilot project selection
- ✅ Set success metrics
- ✅ 4-week pilot deployment
- ✅ Go/No-Go decision based on results

---

## SLIDE 13: THANK YOU
**Title:** Thank You

**Your Contact Info**

**Backup Resources:**
- GitHub/Code Repository (if applicable)
- Demo video link (if you record one)
- Technical documentation

**Bottom Text:**
*"Questions?"*

---

## 📝 NOTES FOR SLIDE DESIGN

**Visual Style:**
- Use company branding/colors
- Keep text minimal (bullet points, not paragraphs)
- Use high-quality photos of actual nameplates
- Include screenshots of your working application
- Simple, clean diagrams (avoid clutter)

**Fonts:**
- Title: 32-40pt, bold
- Body: 20-24pt
- Use consistent font throughout

**Images to Include:**
- HVAC rooftop unit photo
- Close-up of nameplate (clear vs degraded)
- Screenshot of extraction results
- Schnackel form (blank and filled)
- Architecture diagram
- Your application interface

**Optional Animations:**
- Workflow diagrams: Each step appears on click
- Roadmap timeline: Phases appear sequentially
- Keep it simple - don't overdo animations

---

## ⏱️ TIMING GUIDE

If presenting with slides (15 min total):
- Slide 1-3: Problem & Solution (2 min)
- Slide 4-5: Live Demo (5 min) ← MAIN EVENT
- Slide 6: Architecture (1 min)
- Slide 7-8: Challenges & Roadmap (3 min)
- Slide 9-10: Business Value & Pilot (2 min)
- Slide 11-12: Vision & Discussion (2 min)

**Most Important:** Spend majority of time on DEMO. Slides are backup/context.

---

## 💡 PRO TIP

You can skip making slides entirely and just do:
1. Live demo (or test script if frontend broken)
2. Whiteboard the architecture
3. Discuss challenges conversationally
4. Hand them the DEMO_CHEAT_SHEET.md as a leave-behind

**Engineers often prefer live tech demos over PowerPoint.**

But if your boss expects slides, use this outline to build them quickly in PowerPoint/Google Slides.
