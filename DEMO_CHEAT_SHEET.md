# DEMO CHEAT SHEET - Quick Reference

## 🎯 30-SECOND PITCH
"AI-powered HVAC survey tool that extracts nameplate data in 5-10 seconds vs 15-20 minutes manually. Built for Schnackel form compliance. 70-80% accuracy on clear nameplates. Saves 250+ engineer hours/month."

---

## ✅ DEMO SEQUENCE (10 min total)

1. **Problem** (1 min): Manual transcription = 15-20 min/unit, error-prone
2. **Demo** (5 min): Upload nameplate → AI extraction → Show results
3. **Limitations** (2 min): OCR issues, table parsing, 70-80% accuracy
4. **Architecture** (1 min): React → Lambda → Bedrock → Haiku
5. **Next Steps** (1 min): Upgrade to Sonnet, hybrid OCR, pilot test

---

## 💬 KEY TALKING POINTS

### What's Working:
- ✅ Manufacturer, model, serial extraction
- ✅ Age calculation from serial decoding
- ✅ Electrical specs (voltage, phase from POWER SUPPLY row)
- ✅ Compressor data (RLA, LRA)
- ✅ Fan motor specs with phase fields (Schnackel compliance)
- ✅ Multi-image support (nameplate + fuse label)
- ✅ Service life assessment (15+ years flagged)

### Current Challenges (Be Honest):
- ⚠️ OCR accuracy: 70-80% on clear, 40-50% on degraded nameplates
- ⚠️ Character confusion: '0' vs 'D', '6' vs '8'
- ⚠️ Table structure parsing issues
- ⚠️ Model reads too far into adjacent fields

### Solutions in Progress:
- 🔧 Upgrade to Claude 3.5 Sonnet (better vision)
- 🔧 Hybrid OCR: AWS Textract + Claude interpretation
- 🔧 Image preprocessing (glare reduction, contrast)
- 🔧 Engineer feedback loop for corrections

---

## 💰 BUSINESS VALUE

**Time Savings:**
- Manual: 15-20 min/unit
- AI-assisted: 2-3 min/unit (review + corrections)
- Savings: 80-87% time reduction

**Cost Analysis:**
- AI cost: $0.01-0.03/nameplate
- 1000 units/month: $10-30 infrastructure
- Engineer time saved: 250-330 hrs/month = $12,500-33,000 value

**ROI:** 400:1 to 1000:1

---

## 🎤 ANSWER TOUGH QUESTIONS

**Q: "Why still OCR errors?"**
A: Vision models excel at interpretation, not pixel-level OCR. Moving to hybrid: Textract for characters + Claude for understanding.

**Q: "Why not traditional OCR?"**
A: Tesseract reads characters but lacks context. AI knows Schnackel form structure, serial decoding, validation. Best: hybrid approach.

**Q: "What if AI hallucinates?"**
A: Prompt says "Never guess, mark Not Available." Confidence scoring. Engineers review all extractions. Human-in-loop quality gate.

**Q: "Why not wait for better models?"**
A: Building now = learning, establishing pipeline, creating training corpus. Easy to swap models later. Domain knowledge is the hard part.

---

## 📊 PILOT PROPOSAL

**Scope:**
- 2-3 real projects
- 30-50 HVAC units
- 2-3 engineers
- 4 weeks duration

**Success Metrics:**
- Field accuracy: 85%+
- Fully correct extractions: 60%+
- Time reduction: 80%+
- Engineer satisfaction: Positive

---

## 🎬 CLOSING ASK

"I need your feedback on:
1. Is 70-80% accuracy acceptable for pilot?
2. Which projects for pilot deployment?
3. Prioritize OCR or expand to electrical?
4. How does this align with company AI roadmap?

Next step: Pilot approval and project selection."

---

## 🚨 IF DEMO BREAKS

**Backup Plan:**
1. Show screenshots of working extractions
2. Walk through the prompt engineering doc
3. Show AWS Lambda logs
4. Discuss architecture and roadmap
5. Focus on business value, not just tech demo

**What to Say:**
"I'm debugging a deployment issue - this is a CORS/API config problem, not an AI model problem. Let me show you the extraction results I captured earlier and walk through the technical approach instead."

---

## 📱 MATERIALS TO HAVE READY

- [ ] 2-3 clear nameplate photos (Carrier, Lennox)
- [ ] Blank Schnackel HVAC form (printed)
- [ ] Sample extraction results (screenshot backup)
- [ ] Cost analysis spreadsheet
- [ ] Architecture diagram
- [ ] Roadmap timeline

---

## 🎯 THE ONE THING TO REMEMBER

**"This delivers 80% time savings TODAY at 70% accuracy. With hybrid OCR, we hit 90% accuracy in 4-6 weeks and it's production-ready."**

---

Print this. Keep it next to you during the demo.
