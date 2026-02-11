/**
 * Script: route.ts
 * Description: API endpoint to enhance existing podcast with media kit data
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-11
 */

import { NextRequest, NextResponse } from 'next/server'
import { podcastApi, PodcastCategory } from '@/lib/supabase'

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
- Speaking style: Practical, results-focused, can speak to both technical and business audiences

TARGET AUDIENCE WE WANT TO REACH:
- CFOs, Controllers, VP Finance at mid-market companies
- CTOs at established "boomer" companies (not startups)
- Companies: $100M-$1B revenue, 200-5000 employees, 20+ years old
- Industries: Manufacturing, Logistics, Retail, Hospitality
`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      podcastId,
      podcastName,
      hostName,
      podcastUrl,
      category,
      mediaKit,          // base64 encoded PDF
      mediaKitFileName
    } = body

    if (!podcastId || !mediaKit) {
      return NextResponse.json(
        { error: 'Podcast ID and media kit are required' },
        { status: 400 }
      )
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Build the prompt
    const prompt = `You are a podcast research expert. I have a media kit PDF for a podcast that contains ACCURATE, VERIFIED information.

${KEBOOLA_CONTEXT}

## MEDIA KIT ANALYSIS
The attached PDF is the official media kit for "${podcastName}". Extract and analyze the following:

**PRIORITIZE DATA FROM THE MEDIA KIT** - this is verified information directly from the podcast.

PODCAST: ${podcastName}
${hostName ? `HOST: ${hostName}` : ''}
${podcastUrl ? `URL: ${podcastUrl}` : ''}
${category ? `CATEGORY: ${category === 'finance' ? 'Finance Focused' : 'AI/Data Focused'}` : ''}

From the media kit, extract:
1. **Exact audience size/downloads** (monthly downloads, total subscribers, etc.)
2. **Audience demographics** (job titles, industries, company sizes)
3. **Sponsorship/guest rates** (if mentioned)
4. **Contact information** (booking email, producer name)
5. **Past guests or sponsors** (shows credibility)

Then analyze fit with Keboola's target audience (CFOs, finance leaders, CTOs at mid-market companies).

Respond in JSON format:
{
  "hostName": "<host name from media kit>",
  "overallScore": <0-100 based on audience fit>,
  "recommendation": "<STRONG_YES|YES|MAYBE|NO|STRONG_NO>",
  "audienceFitScore": <0-100>,

  "audienceAnalysis": {
    "description": "<detailed audience description from media kit>",
    "estimatedSize": "<exact listener/download count from media kit>",
    "primaryListeners": ["<job titles from media kit>"],
    "industryFocus": ["<industries from media kit>"],
    "seniorityLevel": "<from media kit data>",
    "companyTypes": "<from media kit data>"
  },

  "businessModel": {
    "isPaid": <true if sponsorship required>,
    "estimatedCost": "<exact pricing from media kit if available>",
    "sponsorshipOptions": ["<packages from media kit>"],
    "pastSponsors": ["<sponsors mentioned>"]
  },

  "contactInfo": {
    "contactName": "<contact person from media kit>",
    "contactEmail": "<email from media kit>",
    "linkedinUrl": "<if found>",
    "bestContactMethod": "<based on media kit info>",
    "outreachTips": ["<tips based on media kit>"]
  },

  "pitchStrategy": {
    "suggestedTopics": ["<topics that fit their audience>"],
    "valueProposition": "<why Pavel would be good for THIS specific audience>",
    "pitchAngle": "<hook based on their audience demographics>",
    "keboolaStory": "<which story fits their audience best>",
    "talkingPoints": ["<points to emphasize>"],
    "avoidTopics": ["<topics to avoid>"]
  },

  "mediaKitInsights": {
    "keyStats": ["<important stats from media kit>"],
    "uniqueAngles": ["<unique positioning from media kit>"],
    "credibilityMarkers": ["<past guests, awards, growth metrics>"]
  },

  "risks": ["<concerns>"],
  "fullAnalysis": "<2-3 paragraph analysis incorporating media kit data>"
}`

    // Build multimodal request with PDF
    const contentParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: mediaKit
        }
      },
      { text: prompt }
    ]

    // Check if mediaKit is too large (Gemini has limits around 20MB)
    const estimatedSize = mediaKit.length * 0.75 // base64 is ~33% larger
    if (estimatedSize > 15 * 1024 * 1024) { // 15MB limit
      return NextResponse.json(
        { error: 'Media kit PDF is too large. Please use a file under 15MB.' },
        { status: 400 }
      )
    }

    console.log(`Sending ${(mediaKit.length / 1024).toFixed(0)}KB base64 to Gemini...`)

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: contentParts }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', response.status, errorText)

      // Provide more specific error messages
      if (response.status === 413) {
        return NextResponse.json(
          { error: 'Media kit PDF is too large for analysis. Try a smaller file.' },
          { status: 400 }
        )
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `AI analysis failed: ${errorText.substring(0, 200)}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      console.error('No text in Gemini response:', JSON.stringify(data))
      return NextResponse.json(
        { error: 'No response from AI. The PDF may not be readable.' },
        { status: 500 }
      )
    }

    let analysis
    try {
      analysis = JSON.parse(text)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text.substring(0, 500))
      return NextResponse.json(
        { error: 'AI response was not valid JSON. Please try again.' },
        { status: 500 }
      )
    }

    // Update the existing podcast record
    const updated = await podcastApi.update(podcastId, {
      host_name: analysis.hostName || hostName || undefined,

      audience_description: analysis.audienceAnalysis?.description || undefined,
      audience_size: analysis.audienceAnalysis?.estimatedSize || undefined,
      audience_fit_score: analysis.audienceFitScore || undefined,

      is_paid: analysis.businessModel?.isPaid ?? undefined,
      estimated_cost: analysis.businessModel?.estimatedCost || undefined,

      contact_name: analysis.contactInfo?.contactName || undefined,
      contact_email: analysis.contactInfo?.contactEmail || undefined,
      contact_linkedin: analysis.contactInfo?.linkedinUrl || undefined,
      contact_method: analysis.contactInfo?.bestContactMethod || undefined,

      overall_score: analysis.overallScore || undefined,
      recommendation: analysis.recommendation || undefined,

      suggested_topics: analysis.pitchStrategy?.suggestedTopics || undefined,
      value_proposition: analysis.pitchStrategy?.valueProposition || undefined,
      pitch_angle: analysis.pitchStrategy?.pitchAngle || undefined,
      keboola_story: analysis.pitchStrategy?.keboolaStory || undefined,

      full_report: analysis as unknown as Record<string, unknown>,
    })

    return NextResponse.json({
      success: true,
      podcast: updated,
      analysis
    })

  } catch (error) {
    console.error('Enhance podcast error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Enhancement failed' },
      { status: 500 }
    )
  }
}
