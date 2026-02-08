# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Podcast Researcher is an AI-powered tool for finding and analyzing podcasts for CEO guest appearances. It helps identify podcasts that match Keboola's target audience (finance leaders, CTOs at mid-market "boomer" companies).

**Tech Stack**: Next.js 16, TypeScript, Tailwind CSS, Gemini AI
**Design**: Purple/Pink gradient theme
**Backend**: Genesis Supabase project (shared with Event Analyzer)

## Commands

```bash
npm run dev     # Development server
npm run build   # Production build
npm run lint    # ESLint
```

## Features

- **Two Categories**: Finance Focused, AI/Data Focused
- **Manual Research**: Add a podcast and get detailed analysis
- **AI Discovery**: Automatically find relevant podcasts using Gemini
- **Pitch Strategy**: Get suggested topics, value proposition, pitch angle
- **Contact Info**: Find host contact details and best outreach method
- **Status Tracking**: Researched → Contacted → Scheduled → Completed → Declined
- **Free/Paid Indicator**: Know if podcast requires sponsorship payment

## Key Fields Analyzed

| Field | Description |
|-------|-------------|
| Audience Fit Score | How well audience matches Keboola's ICP |
| Is Paid | Whether guest spot requires payment |
| Suggested Topics | Episode ideas for Pavel |
| Pitch Angle | Hook for outreach email |
| Keboola Story | Which company story fits best |
| Contact Method | Best way to reach the host |

## Target Podcasts

**Finance Category**:
- CFO interview podcasts
- Finance leadership shows
- FP&A and Controller content
- Industry finance podcasts

**AI/Data Category**:
- AI in enterprise podcasts
- Data engineering leadership
- CTO/technology interviews
- Practical AI implementation

## Data Source

Reads from `podcast_analyses` table in Genesis Supabase project.

## Related Apps

- Event Analyzer (sibling)
- Genesis Dashboard (parent)
- Marketing Ops Hub (router)
