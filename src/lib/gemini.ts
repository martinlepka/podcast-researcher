/**
 * Script: gemini.ts
 * Description: Gemini API client for podcast research and discovery
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-08
 */

import { PodcastCategory, Recommendation } from './supabase'

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

export interface PodcastAnalysisInput {
  podcastName: string
  podcastUrl?: string
  hostName?: string
  podcastDescription?: string
  category?: PodcastCategory
}

export interface PodcastAnalysisResult {
  podcastName: string
  hostName: string | null
  overallScore: number
  recommendation: Recommendation
  audienceFitScore: number

  // Audience analysis
  audienceAnalysis: {
    description: string
    estimatedSize: string
    primaryListeners: string[]
    industryFocus: string[]
    seniorityLevel: string
    companyTypes: string
  }

  // Business model
  businessModel: {
    isPaid: boolean
    estimatedCost: string | null
    sponsorshipOptions: string[]
    pastSponsors: string[]
  }

  // Contact info
  contactInfo: {
    contactName: string | null
    contactEmail: string | null
    linkedinUrl: string | null
    bestContactMethod: string
    outreachTips: string[]
  }

  // Pitch strategy
  pitchStrategy: {
    suggestedTopics: string[]
    valueProposition: string
    pitchAngle: string
    keboolaStory: string
    talkingPoints: string[]
    avoidTopics: string[]
  }

  // Risk assessment
  risks: string[]

  // Full analysis
  fullAnalysis: string
}

export interface DiscoveredPodcast {
  podcastName: string
  hostName: string | null
  podcastUrl: string | null
  category: PodcastCategory
  audienceDescription: string
  audienceSize: string | null
  whyRelevant: string
  isPaid: boolean | null
}

export async function analyzePodcast(input: PodcastAnalysisInput): Promise<PodcastAnalysisResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const prompt = `You are a podcast research expert helping Keboola find the best podcasts for their CEO/founder to appear on.

${KEBOOLA_CONTEXT}

Analyze this podcast for guest appearance potential:

PODCAST NAME: ${input.podcastName}
${input.hostName ? `HOST: ${input.hostName}` : ''}
${input.podcastUrl ? `URL: ${input.podcastUrl}` : ''}
${input.podcastDescription ? `DESCRIPTION:\n${input.podcastDescription}` : ''}
${input.category ? `CATEGORY: ${input.category === 'finance' ? 'Finance Focused' : 'AI/Data Focused'}` : ''}

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

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No response from Gemini')
  }

  try {
    const analysis = JSON.parse(text)
    return {
      podcastName: input.podcastName,
      ...analysis
    }
  } catch {
    return {
      podcastName: input.podcastName,
      hostName: null,
      overallScore: 50,
      recommendation: 'MAYBE',
      audienceFitScore: 50,
      audienceAnalysis: {
        description: 'Unable to analyze',
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
      risks: ['Analysis failed - manual review required'],
      fullAnalysis: text
    }
  }
}

export async function discoverPodcasts(options?: {
  category?: PodcastCategory
  limit?: number
}): Promise<DiscoveredPodcast[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const category = options?.category
  const limit = options?.limit || 10

  const categoryFocus = category === 'finance'
    ? `FOCUS: Finance & CFO podcasts

Look for:
- CFO interview podcasts
- Finance leadership shows
- Controller/FP&A focused content
- Industry finance podcasts (manufacturing CFO, retail finance)
- Financial transformation/modernization shows
- Podcasts about breaking free from Excel, automating finance

AVOID:
- Personal finance/investing podcasts
- Financial services/banking industry podcasts
- Accounting firm marketing podcasts
- Stock market/trading shows`
    : `FOCUS: AI & Data podcasts (with business/enterprise angle)

Look for:
- AI in enterprise/business podcasts
- Data engineering leadership shows
- CTO/technology leadership interviews
- AI for business transformation
- Practical AI implementation stories
- Data platform discussions

AVOID:
- Pure ML/research focused podcasts
- Developer-only audiences
- Startup/VC focused tech shows
- Consumer AI product discussions`

  const prompt = `You are a podcast researcher finding the best podcasts for a B2B data platform CEO to appear on.

${KEBOOLA_CONTEXT}

${categoryFocus}

TARGET AUDIENCE WE WANT TO REACH:
- CFOs, Controllers, VP Finance at mid-market companies
- CTOs at established "boomer" companies (not startups)
- Companies: $100M-$1B revenue, 200-5000 employees, 20+ years old
- Industries: Manufacturing, Logistics, Retail, Hospitality

Find ${limit} podcasts that would be good fits. Prioritize:
1. Podcasts with established audiences (1000+ listeners)
2. Podcasts that regularly have guests
3. Podcasts where the audience matches our ICP
4. Mix of well-known and niche/emerging podcasts

Return JSON array:
[
  {
    "podcastName": "Podcast Name",
    "hostName": "Host Name",
    "podcastUrl": "https://...",
    "category": "${category || 'finance'}",
    "audienceDescription": "Who listens to this podcast",
    "audienceSize": "Estimated listeners per episode",
    "whyRelevant": "Why this podcast's audience matches Keboola's ICP",
    "isPaid": <true if typically requires payment, false if accepts free guests, null if unknown>
  }
]

Focus on REAL podcasts you can verify. Include a mix of:
- Top-tier, well-known podcasts (harder to get on but high impact)
- Mid-tier podcasts (good balance of reach and accessibility)
- Niche/emerging podcasts (easier to get on, highly targeted audience)`

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No response from Gemini')
  }

  try {
    const podcasts = JSON.parse(text)
    return Array.isArray(podcasts) ? podcasts : []
  } catch {
    console.error('Failed to parse discovered podcasts:', text)
    return []
  }
}

export async function generateOutreachEmail(podcast: {
  podcastName: string
  hostName: string | null
  pitchAngle: string
  suggestedTopics: string[]
  valueProposition: string
}): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const prompt = `Write a concise, personalized outreach email to pitch Pavel Doležal (CEO of Keboola) as a guest on this podcast.

PODCAST: ${podcast.podcastName}
HOST: ${podcast.hostName || 'the host'}
PITCH ANGLE: ${podcast.pitchAngle}
SUGGESTED TOPICS: ${podcast.suggestedTopics.join(', ')}
VALUE FOR AUDIENCE: ${podcast.valueProposition}

${KEBOOLA_CONTEXT}

Write a SHORT (150 words max) email that:
1. Shows you know the podcast (reference a recent episode or theme)
2. Clearly states why Pavel would be a great guest
3. Proposes 2-3 specific episode ideas
4. Has a clear call to action

Tone: Professional but warm, not salesy. Focus on value for their audience.
Do NOT start with "I hope this email finds you well" or similar clichés.`

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    })
  })

  if (!response.ok) {
    throw new Error('Failed to generate email')
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate email'
}
