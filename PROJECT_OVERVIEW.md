\# MEP Survey AI Agent



\## Purpose

Automates field documentation of HVAC rooftop units (RTUs) for Schnackel Engineers. 

Captures nameplate photos, extracts technical data via AI, generates formatted reports.



\## Core Workflow

1\. Create project (site info, square footage, project #)

2\. Capture RTU nameplate photos (camera or upload)

3\. User specifies equipment details (condition, heat type: Electric/Gas, gas pipe size if applicable)

4\. AI analyzes photo → extracts manufacturer, model, year, tonnage, electrical specs, etc.

5\. Report updates LIVE immediately after analysis (no need to click save)

6\. Continue capturing additional RTUs - report builds in real-time

7\. Edit report text if needed, then complete survey and generate final report



\## Key Files

\- `backend/lambda/quickAnalysis.js` - Claude Haiku AI analysis via AWS Bedrock

\- `backend/update-lambda.js` - Deploy Lambda function updates

\- `frontend/src/components/Camera.js` - Multi-RTU capture workflow with immediate save & live preview

\- `frontend/src/components/ProjectList.js` - Project management

\- `frontend/src/components/ReportGenerator.js` - Schnackel report format with inline editing & heat type differentiation



\## Key Features

\- **Live Report Preview**: Report updates immediately after each RTU analysis (no save button needed)

\- **Editable Reports**: Click "Edit" button in live preview to modify report text before finalizing

\- **Heat Type Detection**: Automatically differentiates between gas-fired and electric units in report text

\- **Gas Line Tracking**: Captures and displays gas pipe sizes (3/4", 1", 1 1/4", 1 1/2") for gas units

\- **Dual Capture Methods**: Use device camera or upload existing photos

\- **Offline Capable**: PWA with localStorage - works without internet after initial load



\## Report Requirements

Must follow Schnackel format:

\- Number words (two/three/four RTUs)

\- Ordinals (first unit, second unit)

\- Heat type specification (gas-fired vs electric) with gas line sizes where applicable

\- ASHRAE 15-year service life standard

\- Equipment summary table with Replace/OK status



\## Tech Stack

\- Frontend: React (PWA, works offline with localStorage)

\- Backend: AWS Lambda (Claude 3 Haiku via Bedrock)

\- Infrastructure: API Gateway, us-east-1 region

\- Storage: Browser localStorage (no database needed)



\## Deployment

\- Frontend: Netlify (https://sprightly-macaron-f0591a.netlify.app)

\- Backend: AWS Lambda (`mep-survey-analyzer`)

\- Lambda Update: `cd backend \&\& node update-lambda.js`

