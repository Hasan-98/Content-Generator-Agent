# Caller ID & Voicemail App

Privacy-first caller intelligence and on-device voicemail for phone and WhatsApp calls, with global caller name and spam reputation powered by opt-in data.

## Problem & Vision
People want to know who is calling and handle missed calls without losing control or privacy. This app delivers trusted caller identification, spam protection, and automatic voicemail while keeping audio fully on-device. Optional opt-in sharing improves accuracy for everyone.

## Core Features (User Facing)
- Caller ID for phone calls with real-time name or spam warning.
- Spam detection and user reporting.
- Auto-pickup voicemail for phone calls (local recording, up to 30s).
- WhatsApp call voicemail via accessibility service.
- Local voicemail inbox and call history.
- Ads for free users.
- Privacy Mode (future): no ads, no data contribution.

## Why a Backend Is Needed
A server is required to:
- Lookup unknown numbers and return caller name + spam reputation.
- Aggregate opt-in contact names into a global directory.
- Compute spam scores and confidence thresholds.

What stays on-device:
- Voicemail audio and voicemail metadata.
- Local inbox and call history UI.

## Architecture Overview
- Mobile: React Native app with native Android modules for call state, recording, and WhatsApp accessibility detection.
- Backend: Node.js API + Postgres for lookup, opt-in uploads, spam reporting, and auth.
- Data pipeline: Nightly jobs for name normalization, confidence scoring, spam decay, and cleanup.

## Key Decisions
- Android-only v1.
- Email/password auth.
- Google AdMob for ads.
- Voicemail audio stored on-device only.

## APIs & Data Models (High Level)

### Core Endpoints
- `POST /auth/register` — Create account.
- `POST /auth/login` — Authenticate and return JWT.
- `POST /lookup` — Return caller name + confidence + spam score.
- `POST /report-spam` — Submit spam report event.
- `POST /optin/contacts` — Upload opt-in contact name pairs.
- `GET /me/consent` — Fetch consent toggles.
- `POST /me/consent` — Update consent toggles.

### Key Entities
- `users`: account records.
- `consents`: share_contacts, share_reports flags.
- `contact_submissions`: opt-in name + phone hash pairs.
- `name_candidates`: aggregated name counts per phone hash.
- `spam_reports`: report events.
- `spam_scores`: weighted spam reputation per phone hash.
- `lookup_cache`: materialized lookup results.

## Implementation Plan

### Phase 0 — Discovery & Compliance
- Validate Android APIs for call state, auto-answer, recording, and WhatsApp accessibility.
- Confirm Play Store policy constraints for call recording.
- Draft consent + privacy copy.

### Phase 1 — Mobile App (Core UX)
- React Native app shell + navigation.
- Permissions flow (contacts, call, mic, accessibility).
- Contact normalization + hashing.
- Incoming call overlay with lookup display.
- On-device voicemail recording and playback.
- WhatsApp call handling via accessibility service.
- Local voicemail inbox + call history.
- Settings and consent toggles.

### Phase 2 — Backend MVP
- Auth + JWT.
- Postgres schema + migrations.
- Lookup endpoint and cache.
- Contact upload and spam reporting endpoints.
- Basic confidence + spam scoring.

### Phase 3 — Data Pipeline
- Nightly cron jobs:
  - Name normalization, dedupe, abusive term filtering.
  - Confidence recalculation and thresholds.
  - Spam decay + trust weighting.
- Materialize lookup cache.

### Phase 4 — Ads + Monetization
- Integrate AdMob.
- Add daily ad cap logic.
- Stub Privacy Mode toggles.

### Phase 5 — Hardening & QA
- Permission-denied fallbacks.
- Background service stability.
- Performance profiling for lookup latency.
- Crash reporting and analytics.

## Detailed TODOs

### Mobile
- Set up RN + TypeScript project.
- Implement permission onboarding flow.
- Build contact normalization + hashing module.
- Implement caller lookup cache and API integration.
- Create incoming call overlay UI.
- Implement voicemail recording and storage.
- Add WhatsApp accessibility detection.
- Build voicemail inbox + call history UI.
- Add spam reporting UI.
- Add settings for consent + ads.

### Backend
- Scaffold Node API project.
- Implement JWT auth.
- Create Postgres schema and migrations.
- Build lookup endpoint with cache.
- Build opt-in contact upload pipeline.
- Build spam report ingestion.
- Implement confidence score computation.
- Implement spam score computation.

### Data/Ops
- Phone hashing policy and salt rotation plan.
- Region detection strategy.
- Spam decay formula.
- Scheduled job runner and monitoring.
- Deployment and secrets management.

## Testing Plan

### Mobile
- Unit tests: phone normalization, hashing, caching.
- Integration: lookup + UI update.
- Device tests: call detection, recording.
- WhatsApp accessibility detection tests.
- Permission denial paths.

### Backend
- Unit tests: confidence and spam scoring.
- Integration tests: lookup, opt-in, spam reporting.
- Job tests: nightly aggregation correctness.
- Load tests: lookup latency under burst.

## Risks & Mitigations
- WhatsApp accessibility may be unstable: guard with feature flag.
- Play Store policy on call recording: confirm regional policy and keep audio on-device.
- Spam quality: apply trust weighting and decay early.

## Assumptions
- Android-only v1.
- Email auth for account and consent.
- AdMob for ads.
- Name confidence thresholds: show name at >=70%, partial at 40–69%, unknown below.
