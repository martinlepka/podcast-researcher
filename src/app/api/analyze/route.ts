/**
 * Script: route.ts
 * Description: API endpoint for podcast analysis using Gemini
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-08
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzePodcast } from '@/lib/gemini'
import { podcastApi, PodcastCategory } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      podcastName,
      podcastUrl,
      hostName,
      podcastDescription,
      category
    } = body

    if (!podcastName) {
      return NextResponse.json(
        { error: 'Podcast name is required' },
        { status: 400 }
      )
    }

    // Analyze the podcast
    const result = await analyzePodcast({
      podcastName,
      podcastUrl,
      hostName,
      podcastDescription,
      category: category as PodcastCategory
    })

    // Save to Supabase
    const saved = await podcastApi.save({
      podcast_name: podcastName,
      host_name: result.hostName || hostName || null,
      podcast_url: podcastUrl || null,
      podcast_category: category || null,

      audience_description: result.audienceAnalysis?.description || null,
      audience_size: result.audienceAnalysis?.estimatedSize || null,
      audience_fit_score: result.audienceFitScore || null,

      is_paid: result.businessModel?.isPaid || null,
      estimated_cost: result.businessModel?.estimatedCost || null,

      contact_name: result.contactInfo?.contactName || null,
      contact_email: result.contactInfo?.contactEmail || null,
      contact_linkedin: result.contactInfo?.linkedinUrl || null,
      contact_method: result.contactInfo?.bestContactMethod || null,

      overall_score: result.overallScore || null,
      recommendation: result.recommendation || null,

      suggested_topics: result.pitchStrategy?.suggestedTopics || null,
      value_proposition: result.pitchStrategy?.valueProposition || null,
      pitch_angle: result.pitchStrategy?.pitchAngle || null,
      keboola_story: result.pitchStrategy?.keboolaStory || null,

      full_report: result as unknown as Record<string, unknown>,
      source: 'manual',
      status: 'researched'
    })

    return NextResponse.json({ ...result, id: saved.id })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
