\# MEP Survey AI Agent



\## Purpose

Automates field documentation of HVAC rooftop units (RTUs) for Schnackel Engineers. 

Captures nameplate photos, extracts technical data via AI, generates formatted reports.



\## Core Workflow

1\. Create project (site info, square footage, project #)

2\. Capture RTU nameplate photos (camera or upload)

3\. AI analyzes photo → extracts manufacturer, model, year, tonnage, etc.

4\. Generate Schnackel-formatted report with service life assessment



\## Key Files

\- `backend/lambda/quickAnalysis.js` - Claude Haiku AI analysis via AWS Bedrock

\- `backend/update-lambda.js` - Deploy Lambda function updates

\- `frontend/src/components/Camera.js` - Multi-RTU capture workflow

\- `frontend/src/components/ProjectList.js` - Project management

\- `frontend/src/components/ReportGenerator.js` - Schnackel report format



\## Report Requirements

Must follow Schnackel format:

\- Number words (two/three/four RTUs)

\- Ordinals (first unit, second unit)

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

