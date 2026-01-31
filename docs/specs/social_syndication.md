# PRD: Phase 15 - Social Syndication (The Speaker)

**Status**: Draft  
**Priority**: P0  
**Owner**: Rich Hickey 🧙🏾‍♂️  

## Overview
Transform Gemini Ops from a research tool into an **Autonomous Content Distribution Agency**. "The Speaker" module will grab "Deployed" content from the Mercury CMS, synthesize it into channel-specific formats (Twitter Threads, LinkedIn Summaries), and syndicate it via official APIs.

## User Stories
- **As a Content Strategist**, I want the system to automatically post a Twitter thread when an article is deployed, so that I don't have to manually adapt content.
- **As an Operator**, I want to review social media drafts before they go live, so that I can ensure brand alignment.
- **As a Developer**, I want a scalable adapter system so that I can add new channels (e.g., Substack) easily.

## Acceptance Criteria
### Scenario: Automated Syndication Trigger
- **Given** a task is marked as `deployed`
- **When** the "Syndicate" action is triggered
- **Then** the system must generate a 5-7 post Twitter thread and a 3-paragraph LinkedIn update.

### Scenario: Adaptive Media Generation
- **Given** a research article
- **When** syndication starts
- **Then** the system must invoke the Image Engine to create an OpenGraph-compliant image for the specific slug.

## Technical Implementation

### Database Changes
```sql
ALTER TABLE tasks ADD COLUMN syndicated_at TEXT;
ALTER TABLE tasks ADD COLUMN social_payloads JSONB; -- { twitter: [], linkedin: "", og_image: "" }
```

### API Adapters
- **METHOD POST /syndicate/:taskId**
- **Payload**: `{ channels: ["twitter", "linkedin"], dryRun: boolean }`

### Logic Flow
1. **CMS Hook**: Article "Deployment" event.
2. **Synthesizer**: Gemini Pro 3.0 prompt designed for "Social Hooking".
3. **Media Engine**: Generate style-aligned SVG/PNG using project knowledge.
4. **Dispatcher**: Cloudflare Workers `fetch` to X/LinkedIn APIs.

## Security & Validation
- **Auth**: Channel tokens stored as encrypted environment secrets in Cloudflare (Wrangler).
- **Validation**: Strict character limit enforcement (280 for X, 3000 for LinkedIn).
- **Rate Limiting**: Implementation of queues for scheduled posting to avoid API bans.

## Pre-Mortem Analysis
- **Failure**: "Why will this fail?" - Twitter API rate limits or auth invalidation.
- **Mitigation**: Implement a "Retry Queue" in Durable Objects and a manual "Sync Now" button in the CMS dashboard.

---
PRD Drafted. Initiate the Autonomous Pipeline: /proceed docs/specs/social_syndication.md -> /test -> /refactor -> /test
