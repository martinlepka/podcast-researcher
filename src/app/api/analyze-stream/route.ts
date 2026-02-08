/**
 * Script: route.ts
 * Description: Streaming API endpoint for podcast analysis with progress updates
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-08
 */

import { NextRequest } from 'next/server'
import { PodcastCategory } from '@/lib/supabase'

export const maxDuration = 60

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent'

// Keboola context for podcast pitches
const KEBOOLA_CONTEXT = `
ABOUT KEBOOLA:
- Data platform company helping finance teams automate their data workflows
- Key product: Financial Intelligence - AI solution for multi-entity Group CFOs
- Also: Data Engineering Agents for end-to-end workflow building
- Target customers: Mid-market "boomer" companies ($100M-$1B revenue, 200-5000 employees)
- Industries: Manufacturing, Logistics, Retail, Hospitality, Consumer Goods
- Problem we solve: Finance teams drowning in Excel, manual consolidation, legacy systems

FOUNDER/CEO:
- Pavel Doležal - CEO & Co-founder
- Expert in data platforms, enterprise data architecture
- Background: Built data solutions for enterprise companies
- Speaking style: Practical, results-focused, can speak to both technical and business audiences
- Key topics: Financial data automation, AI for CFOs, breaking free from Excel hell

KEY STORIES WE CAN TELL:
1. "From 30-day close to 5-day close" - How CFOs are using AI to transform their financial reporting
2. "The hidden cost of Excel" - Why mid-market CFOs are losing millions to manual data work
3. "AI Co-pilots for Finance" - How AI agents are changing data engineering for finance teams
4. "Multi-entity nightmare" - How group CFOs manage 50+ entities with legacy systems
5. "Data democratization for finance" - Letting finance teams self-serve without IT bottleneck

COMPETITIVE POSITIONING:
- NOT competing with: Snowflake, Databricks, dbt (we're higher level, business-user focused)
- Different from: Anaplan, Workday (we're more flexible, less rigid)
- Unique angle: Bridge between technical data engineering and business finance users
`

interface ProgressEvent {
  stage: 'searching' | 'audience' | 'contact' | 'strategy' | 'finalizing' | 'saving' | 'complete' | 'error'
  message: string
  progress: number // 0-100
  detail?: string
  result?: unknown
}

function sendEvent(controller: ReadableStreamDefaultController, event: ProgressEvent) {
  const data = JSON.stringify(event)
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const {
    podcastName,
    podcastUrl,
    hostName,
    podcastDescription,
    category
  } = body

  if (!podcastName) {
    return new Response(JSON.stringify({ error: 'Podcast name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stage 1: Searching for podcast information
        sendEvent(controller, {
          stage: 'searching',
          message: 'Searching for podcast information...',
          progress: 10,
          detail: `Looking up "${podcastName}" across podcast databases`
        })
        await new Promise(r => setTimeout(r, 500))

        // Stage 2: Analyzing audience
        sendEvent(controller, {
          stage: 'audience',
          message: 'Analyzing audience fit...',
          progress: 25,
          detail: 'Evaluating listener demographics and ICP match'
        })

        // Stage 3: Make the actual API call
        const prompt = buildAnalysisPrompt(podcastName, hostName, podcastUrl, podcastDescription, category)

        sendEvent(controller, {
          stage: 'contact',
          message: 'Researching contact information...',
          progress: 40,
          detail: 'Finding host details, email, and best outreach method'
        })

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096,
              responseMimeType: "application/json"
            }
          })
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Gemini API error: ${error}`)
        }

        sendEvent(controller, {
          stage: 'strategy',
          message: 'Generating pitch strategy...',
          progress: 60,
          detail: 'Creating personalized topics and talking points for Pavel'
        })

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
          throw new Error('No response from Gemini')
        }

        sendEvent(controller, {
          stage: 'finalizing',
          message: 'Finalizing analysis...',
          progress: 80,
          detail: 'Scoring and generating recommendations'
        })

        let analysis
        try {
          analysis = JSON.parse(text)
        } catch {
          analysis = {
            hostName: null,
            overallScore: 50,
            recommendation: 'MAYBE',
            audienceFitScore: 50,
            audienceAnalysis: {
              description: 'Unable to fully analyze',
              estimatedSize: 'Unknown',
              primaryListeners: [],
              industryFocus: [],
              seniorityLevel: 'Unknown',
              companyTypes: 'Unknown'
            },
            businessModel: {
              isPaid: false,
              estimatedCost: null,
              sponsorshipOptions: [],
              pastSponsors: []
            },
            contactInfo: {
              contactName: null,
              contactEmail: null,
              linkedinUrl: null,
              bestContactMethod: 'Unknown',
              outreachTips: ['Research manually']
            },
            pitchStrategy: {
              suggestedTopics: [],
              valueProposition: 'Unable to determine',
              pitchAngle: 'Unable to determine',
              keboolaStory: 'Unable to determine',
              talkingPoints: [],
              avoidTopics: []
            },
            risks: ['Analysis incomplete - manual review required'],
            fullAnalysis: text
          }
        }

        // Stage 5: Saving to database
        sendEvent(controller, {
          stage: 'saving',
          message: 'Saving to database...',
          progress: 90,
          detail: 'Storing analysis results'
        })

        // Import and use podcastApi to save
        const { podcastApi } = await import('@/lib/supabase')

        const saved = await podcastApi.save({
          podcast_name: podcastName,
          host_name: analysis.hostName || hostName || null,
          podcast_url: podcastUrl || null,
          podcast_category: category || null,

          audience_description: analysis.audienceAnalysis?.description || null,
          audience_size: analysis.audienceAnalysis?.estimatedSize || null,
          audience_fit_score: analysis.audienceFitScore || null,

          is_paid: analysis.businessModel?.isPaid || null,
          estimated_cost: analysis.businessModel?.estimatedCost || null,

          contact_name: analysis.contactInfo?.contactName || null,
          contact_email: analysis.contactInfo?.contactEmail || null,
          contact_linkedin: analysis.contactInfo?.linkedinUrl || null,
          contact_method: analysis.contactInfo?.bestContactMethod || null,

          overall_score: analysis.overallScore || null,
          recommendation: analysis.recommendation || null,

          suggested_topics: analysis.pitchStrategy?.suggestedTopics || null,
          value_proposition: analysis.pitchStrategy?.valueProposition || null,
          pitch_angle: analysis.pitchStrategy?.pitchAngle || null,
          keboola_story: analysis.pitchStrategy?.keboolaStory || null,

          full_report: analysis as unknown as Record<string, unknown>,
          source: 'manual',
          status: 'researched'
        })

        // Complete!
        sendEvent(controller, {
          stage: 'complete',
          message: 'Research complete!',
          progress: 100,
          detail: `Score: ${analysis.overallScore}/100 - ${analysis.recommendation}`,
          result: { ...analysis, id: saved.id, podcastName }
        })

      } catch (error) {
        sendEvent(controller, {
          stage: 'error',
          message: 'Research failed',
          progress: 0,
          detail: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

function buildAnalysisPrompt(
  podcastName: string,
  hostName?: string,
  podcastUrl?: string,
  podcastDescription?: string,
  category?: string
): string {
  return `You are a podcast research expert helping Keboola find the best podcasts for their CEO/founder to appear on.

${KEBOOLA_CONTEXT}

Analyze this podcast for guest appearance potential:

PODCAST NAME: ${podcastName}
${hostName ? `HOST: ${hostName}` : ''}
${podcastUrl ? `URL: ${podcastUrl}` : ''}
${podcastDescription ? `DESCRIPTION:\n${podcastDescription}` : ''}
${category ? `CATEGORY: ${category === 'finance' ? 'Finance Focused' : 'AI/Data Focused'}` : ''}

Research this podcast thoroughly and provide analysis in JSON format:
{
  "hostName": "<host name if found>",
  "overallScore": <0-100>,
  "recommendation": "<STRONG_YES|YES|MAYBE|NO|STRONG_NO>",
  "audienceFitScore": <0-100>,

  "audienceAnalysis": {
    "description": "<detailed audience description>",
    "estimatedSize": "<listener count estimate>",
    "primaryListeners": ["<job titles/roles>"],
    "industryFocus": ["<industries covered>"],
    "seniorityLevel": "<executive/manager/practitioner/mixed>",
    "companyTypes": "<startup/enterprise/mid-market/mixed>"
  },

  "businessModel": {
    "isPaid": <true if paid sponsorship required, false if free guest spots>,
    "estimatedCost": "<cost estimate if paid, null if free>",
    "sponsorshipOptions": ["<available options>"],
    "pastSponsors": ["<known sponsors>"]
  },

  "contactInfo": {
    "contactName": "<best contact person>",
    "contactEmail": "<email if findable>",
    "linkedinUrl": "<LinkedIn URL of host/producer>",
    "bestContactMethod": "<email/linkedin/website form/twitter>",
    "outreachTips": ["<tips for reaching them>"]
  },

  "pitchStrategy": {
    "suggestedTopics": ["<3-5 specific episode topics that would resonate>"],
    "valueProposition": "<what value Pavel brings to their audience>",
    "pitchAngle": "<the hook/angle for the pitch email>",
    "keboolaStory": "<which Keboola story fits best for this podcast>",
    "talkingPoints": ["<key points to emphasize>"],
    "avoidTopics": ["<topics to avoid or handle carefully>"]
  },

  "risks": ["<potential concerns or red flags>"],

  "fullAnalysis": "<2-3 paragraph detailed analysis of why this podcast is or isn't a good fit>"
}

Be thorough. Research the podcast's history, past guests, audience engagement, and typical episode format.
Focus on whether their audience matches Keboola's target (CFOs, finance leaders, CTOs at mid-market "boomer" companies).`
}
