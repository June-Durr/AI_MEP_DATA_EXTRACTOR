# QUICK FIX GUIDE - Demo Preparation

## 🚨 IF "FAILED TO FETCH" ERROR OCCURS

### Quick Diagnostic Checklist (5 minutes):

#### 1. **Check Lambda Function Status**
```bash
# Verify Lambda was deployed
aws lambda get-function --function-name mep-survey-analyzer --region us-east-1
```

Expected: Should return function details with status "Active"

---

#### 2. **Check API Gateway Endpoint**
- Frontend should be calling: `https://[your-api-id].execute-api.us-east-1.amazonaws.com/prod/analyze`
- Verify this URL is correct in your frontend code
- Look in browser DevTools → Network tab → Check what URL is being called

---

#### 3. **Test Lambda Directly (Bypass Frontend)**
```bash
cd backend
node test-full-flow.js
```

- If this works: Problem is frontend → Lambda connection
- If this fails: Problem is Lambda → Bedrock connection

---

#### 4. **Check CORS Headers**
Lambda should return these headers:
```javascript
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "Content-Type",
"Access-Control-Allow-Methods": "OPTIONS,POST"
```

This is already in the Lambda code (lines 8-12).

---

#### 5. **Check Frontend API URL**
Look in `frontend/src/` for API endpoint configuration:
- Check `.env` file
- Check API service file
- Ensure it points to your API Gateway URL

---

## 🎯 FASTEST FIX FOR DEMO

### Option 1: Use Backend Test Script (NO FRONTEND NEEDED)

**Pros:** Works 100%, no web debugging
**Cons:** Less polished, shows results in terminal

```bash
cd backend
node test-full-flow.js
```

**Demo Flow:**
1. Show the test script code
2. Run it with a sample nameplate
3. Show the JSON extraction results in terminal
4. Say: "In production, this displays in a web form. The backend AI is working perfectly - just debugging a frontend deployment issue."

---

### Option 2: Use Screenshots/Pre-Recorded Results

**If demo completely breaks:**
1. Take screenshots NOW of working extractions
2. Put them in a PowerPoint
3. Walk through the results visually
4. Say: "Let me show you the extraction results from my testing environment"

---

### Option 3: Fix the Frontend (30-60 min effort)

**Only do this if you have time:**

1. **Check the frontend API configuration:**
```bash
cd frontend/src
grep -r "api.amazonaws.com" .
# or
grep -r "execute-api" .
```

2. **Verify environment variables:**
```bash
cat frontend/.env
cat frontend/.env.local
```

Should have:
```
REACT_APP_API_URL=https://[your-api-id].execute-api.us-east-1.amazonaws.com/prod
```

3. **Check browser console for exact error:**
- Open DevTools (F12)
- Go to Console tab
- Look for error message
- Common issues:
  - CORS policy error → Lambda CORS headers
  - 404 Not Found → Wrong API URL
  - Timeout → Image too large or Lambda timeout

4. **Quick CORS fix (if needed):**
Update Lambda quickAnalysis.js headers to include more permissive CORS:
```javascript
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
  "Content-Type": "application/json",
};
```

Then redeploy:
```bash
cd backend
node update-lambda.js
```

---

## 🎬 BACKUP DEMO PLAN (If Everything Breaks)

### Show the Architecture & Code Instead:

**Talking Points:**
1. "Let me show you the technical implementation rather than the UI"
2. Open `backend/lambda/quickAnalysis.js`
3. Show the 500+ line prompt (lines 38-534):
   - "This is the domain expertise encoded into the AI"
   - Point out Carrier nameplate table structure (lines 182-272)
   - Point out Schnackel form mapping (lines 289-376)
   - Point out validation checklist (lines 378-445)
4. Show the JSON structure (lines 447-562):
   - "This exactly matches Schnackel Engineers' HVAC form"
5. Run the test script to show it working:
   ```bash
   node backend/test-full-flow.js
   ```
6. Show the JSON results
7. Say: "The AI extraction is production-ready. I'm just debugging the web deployment for field engineer access."

**This actually might be MORE impressive** because it shows:
- Your prompt engineering skills
- Deep domain knowledge
- Technical implementation details
- The AI works, just deployment glitch

---

## ⏰ MORNING OF DEMO CHECKLIST

### 30 Minutes Before Demo:

- [ ] Test the frontend one more time
  - [ ] Open http://localhost:3000
  - [ ] Try uploading ONE nameplate
  - [ ] If it works: Great! Demo normally
  - [ ] If it fails: Switch to Backup Plan

- [ ] Have these ready on your laptop:
  - [ ] `backend/test-full-flow.js` ready to run
  - [ ] Screenshots of working extractions
  - [ ] Lambda code open in editor
  - [ ] This cheat sheet printed or on second monitor

- [ ] Practice your 30-second pitch OUT LOUD

- [ ] Take a deep breath. You've built something valuable. Communication matters more than perfection.

---

## 🎯 WHAT YOUR BOSS CARES ABOUT

He doesn't care if the demo is "perfect." He cares about:

1. **Can this solve a real problem?** YES - automates 15 min/unit of manual work
2. **Is the technical approach sound?** YES - AWS Bedrock, Claude Vision, serverless
3. **Do you understand the limitations?** YES - you're honest about OCR challenges
4. **Can you execute on improvements?** YES - clear roadmap to 85-90% accuracy
5. **Does this align with company AI strategy?** YES - practical AI application in MEP

**If the UI is broken but the backend works, you've still proven all 5 of these.**

---

## 💪 YOU GOT THIS

The hardest part is already done:
- ✅ You built a working AI extraction system
- ✅ You encoded Schnackel form domain knowledge
- ✅ You deployed to AWS Lambda
- ✅ You understand the technical challenges
- ✅ You have a clear improvement roadmap

A deployment bug doesn't change any of that.

Show the value. Be honest about challenges. Communicate confidence.

**Good luck tomorrow!**
