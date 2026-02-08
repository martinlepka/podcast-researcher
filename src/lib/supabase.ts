/**
 * Podcast Researcher - Supabase Client
 * Description: Supabase client and API functions for podcast research
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-08
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://odvhuaehmuiyiswtbspu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kdmh1YWVobXVpeWlzd3Ric3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTk5NzksImV4cCI6MjA4MTYzNTk3OX0.4P3IsggQzFYMjVUZCD4pg6d9grGts4vHnnCM0zVcEDk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type PodcastCategory = 'finance' | 'ai_data';
export type PodcastSource = 'manual' | 'discovered';
export type PodcastStatus = 'researched' | 'contacted' | 'scheduled' | 'completed' | 'declined';
export type Recommendation = 'STRONG_YES' | 'YES' | 'MAYBE' | 'NO' | 'STRONG_NO';

export interface PodcastAnalysis {
  id: string;
  created_at: string;

  // Basic info
  podcast_name: string;
  host_name: string | null;
  podcast_url: string | null;
  podcast_category: PodcastCategory | null;

  // Audience info
  audience_description: string | null;
  audience_size: string | null;
  audience_fit_score: number | null;

  // Business info
  is_paid: boolean | null;
  estimated_cost: string | null;

  // Contact info
  contact_name: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  contact_method: string | null;

  // Analysis
  overall_score: number | null;
  recommendation: Recommendation | null;

  // Pitch strategy
  suggested_topics: string[] | null;
  value_proposition: string | null;
  pitch_angle: string | null;
  keboola_story: string | null;

  // Full report
  full_report: Record<string, unknown> | null;

  // Tracking
  source: PodcastSource;
  status: PodcastStatus;
}

export const podcastApi = {
  async getAll(filters?: {
    category?: PodcastCategory;
    source?: PodcastSource;
    status?: PodcastStatus;
  }): Promise<PodcastAnalysis[]> {
    let query = supabase
      .from('podcast_analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('podcast_category', filters.category);
    }
    if (filters?.source) {
      query = query.eq('source', filters.source);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as PodcastAnalysis[];
  },

  async getById(id: string): Promise<PodcastAnalysis | null> {
    const { data, error } = await supabase
      .from('podcast_analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as PodcastAnalysis;
  },

  async findByName(podcastName: string): Promise<PodcastAnalysis | null> {
    const { data, error } = await supabase
      .from('podcast_analyses')
      .select('*')
      .ilike('podcast_name', podcastName)
      .single();

    if (error) return null;
    return data as PodcastAnalysis;
  },

  async save(podcast: Omit<PodcastAnalysis, 'id' | 'created_at'>): Promise<PodcastAnalysis> {
    const { data, error } = await supabase
      .from('podcast_analyses')
      .insert(podcast)
      .select()
      .single();

    if (error) throw error;
    return data as PodcastAnalysis;
  },

  async update(id: string, updates: Partial<PodcastAnalysis>): Promise<PodcastAnalysis> {
    const { data, error } = await supabase
      .from('podcast_analyses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PodcastAnalysis;
  },

  async updateStatus(id: string, status: PodcastStatus): Promise<void> {
    const { error } = await supabase
      .from('podcast_analyses')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('podcast_analyses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
