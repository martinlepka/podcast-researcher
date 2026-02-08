/**
 * Script: route.ts
 * Description: Streaming API endpoint for podcast discovery with progress updates
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-08
 */

import { NextRequest } from 'next/server'
import { discoverPodcasts, analyzePodcast } from '@/lib/gemini'
import { podcastApi, PodcastCategory } from '@/lib/supabase'

export const maxDuration = 300

function createSSEMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') as PodcastCategory | null

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (data: object) => {
        controller.enqueue(encoder.encode(createSSEMessage(data)))
      }

      try {
        // Step 1: Discovery
        sendProgress({
          stage: 'discovery',
          message: `Searching for ${category === 'finance' ? 'Finance' : category === 'ai_data' ? 'AI/Data' : 'all'} podcasts...`,
          progress: 0
        })

        const discoveredPodcasts = await discoverPodcasts({
          category: category || undefined,
          limit: 8
        })

        sendProgress({
          stage: 'discovery_complete',
          message: `Found ${discoveredPodcasts.length} potential podcasts`,
          progress: 10,
          discovered: discoveredPodcasts.length
        })

        if (discoveredPodcasts.length === 0) {
          sendProgress({
            stage: 'complete',
            message: 'No new podcasts found',
            progress: 100,
            result: { discovered: 0, analyzed: 0, saved: 0, skipped: 0, podcasts: [] }
          })
          controller.close()
          return
        }

        // Step 2: Analyze each podcast
        const results: Array<{
          name: string
          score: number | null
          recommendation: string | null
          status: 'saved' | 'skipped' | 'error'
          reason?: string
        }> = []

        let saved = 0
        let skipped = 0
        let analyzed = 0

        for (let i = 0; i < discoveredPodcasts.length; i++) {
          const podcast = discoveredPodcasts[i]
          const progressPercent = 10 + Math.round((i / discoveredPodcasts.length) * 85)

          sendProgress({
            stage: 'analyzing',
            message: `Analyzing ${i + 1}/${discoveredPodcasts.length}: ${podcast.podcastName}`,
            progress: progressPercent,
            current: i + 1,
            total: discoveredPodcasts.length,
            podcastName: podcast.podcastName
          })

          try {
            // Check if already exists
            const existing = await podcastApi.findByName(podcast.podcastName)
            if (existing) {
              skipped++
              results.push({
                name: podcast.podcastName,
                score: existing.overall_score,
                recommendation: existing.recommendation,
                status: 'skipped',
                reason: 'Already in database'
              })
              continue
            }

            // Analyze
            const analysis = await analyzePodcast({
              podcastName: podcast.podcastName,
              podcastUrl: podcast.podcastUrl || undefined,
              hostName: podcast.hostName || undefined,
              podcastDescription: podcast.audienceDescription,
              category: podcast.category
            })
            analyzed++

            // Save
            await podcastApi.save({
              podcast_name: podcast.podcastName,
              host_name: analysis.hostName || podcast.hostName || null,
              podcast_url: podcast.podcastUrl,
              podcast_category: podcast.category,

              audience_description: analysis.audienceAnalysis?.description || podcast.audienceDescription,
              audience_size: analysis.audienceAnalysis?.estimatedSize || podcast.audienceSize,
              audience_fit_score: analysis.audienceFitScore || null,

              is_paid: analysis.businessModel?.isPaid ?? podcast.isPaid,
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
              source: 'discovered',
              status: 'researched'
            })

            saved++
            results.push({
              name: podcast.podcastName,
              score: analysis.overallScore,
              recommendation: analysis.recommendation,
              status: 'saved'
            })

            sendProgress({
              stage: 'analyzed',
              message: `Saved: ${podcast.podcastName} (Score: ${analysis.overallScore})`,
              progress: progressPercent,
              current: i + 1,
              total: discoveredPodcasts.length,
              podcastName: podcast.podcastName,
              score: analysis.overallScore,
              recommendation: analysis.recommendation
            })

          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            results.push({
              name: podcast.podcastName,
              score: null,
              recommendation: null,
              status: 'error',
              reason: errorMsg
            })

            sendProgress({
              stage: 'error',
              message: `Error analyzing ${podcast.podcastName}: ${errorMsg}`,
              progress: progressPercent,
              podcastName: podcast.podcastName,
              error: errorMsg
            })
          }

          await new Promise(resolve => setTimeout(resolve, 500))
        }

        sendProgress({
          stage: 'complete',
          message: `Scan complete! Saved ${saved} new podcasts`,
          progress: 100,
          result: {
            discovered: discoveredPodcasts.length,
            analyzed,
            saved,
            skipped,
            podcasts: results
          }
        })

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        sendProgress({
          stage: 'fatal_error',
          message: `Scan failed: ${errorMsg}`,
          progress: 0,
          error: errorMsg
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
    },
  })
}
