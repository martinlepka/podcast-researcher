/**
 * Podcast Researcher - Main Dashboard Page
 * Description: AI-powered podcast research for CEO guest appearances
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-08
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Link as LinkIcon,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Target,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  Trash2,
  Eye,
  Plus,
  X,
  RefreshCw,
  ExternalLink,
  Radar,
  DollarSign,
  Mail,
  Linkedin,
  Copy,
  Clock,
  Briefcase,
  BarChart3,
  Upload,
  FileText
} from 'lucide-react';
import { podcastApi, PodcastAnalysis, PodcastCategory, PodcastStatus } from '@/lib/supabase';

const RECOMMENDATION_CONFIG = {
  STRONG_YES: { color: '#059669', bg: '#d1fae5', icon: CheckCircle2, label: 'Strong Yes' },
  YES: { color: '#3b82f6', bg: '#dbeafe', icon: CheckCircle2, label: 'Yes' },
  MAYBE: { color: '#f59e0b', bg: '#fef3c7', icon: AlertTriangle, label: 'Maybe' },
  NO: { color: '#ef4444', bg: '#fee2e2', icon: XCircle, label: 'No' },
  STRONG_NO: { color: '#991b1b', bg: '#fee2e2', icon: XCircle, label: 'Strong No' }
};

const STATUS_CONFIG: Record<PodcastStatus, { color: string; bg: string; label: string }> = {
  researched: { color: '#6b7280', bg: '#f3f4f6', label: 'Researched' },
  contacted: { color: '#f59e0b', bg: '#fef3c7', label: 'Contacted' },
  scheduled: { color: '#3b82f6', bg: '#dbeafe', label: 'Scheduled' },
  completed: { color: '#059669', bg: '#d1fae5', label: 'Completed' },
  declined: { color: '#ef4444', bg: '#fee2e2', label: 'Declined' }
};

const CATEGORY_CONFIG: Record<PodcastCategory, { label: string; icon: typeof Briefcase; color: string }> = {
  finance: { label: 'Finance Focused', icon: BarChart3, color: '#059669' },
  ai_data: { label: 'AI/Data Focused', icon: Sparkles, color: '#8b5cf6' }
};

export default function PodcastResearcher() {
  // Form state
  const [podcastName, setPodcastName] = useState('');
  const [podcastUrl, setPodcastUrl] = useState('');
  const [hostName, setHostName] = useState('');
  const [podcastDescription, setPodcastDescription] = useState('');
  const [formCategory, setFormCategory] = useState<PodcastCategory>('finance');
  const [mediaKit, setMediaKit] = useState<File | null>(null);
  const [mediaKitPreview, setMediaKitPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Enhance existing podcast state
  const [enhanceMediaKit, setEnhanceMediaKit] = useState<File | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{
    stage: string;
    message: string;
    progress: number;
    detail?: string;
  } | null>(null);

  // View state
  const [showForm, setShowForm] = useState(false);
  const [podcasts, setPodcasts] = useState<PodcastAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastAnalysis | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<PodcastCategory | 'all'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    stage: string;
    message: string;
    progress: number;
    current?: number;
    total?: number;
  } | null>(null);
  const [scanResult, setScanResult] = useState<{ discovered: number; saved: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Load podcasts
  const loadPodcasts = async () => {
    setIsLoading(true);
    try {
      const data = await podcastApi.getAll({
        category: categoryFilter === 'all' ? undefined : categoryFilter
      });
      setPodcasts(data);
    } catch (e) {
      console.error('Error loading podcasts:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPodcasts();
  }, [categoryFilter]);

  const handleAnalyze = async () => {
    if (!podcastName.trim()) {
      setError('Please enter a podcast name');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress({ stage: 'starting', message: 'Starting research...', progress: 0 });

    try {
      // Convert media kit to base64 if present
      let mediaKitBase64: string | undefined;
      if (mediaKit) {
        setAnalysisProgress({ stage: 'uploading', message: 'Processing media kit...', progress: 5 });
        const arrayBuffer = await mediaKit.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        mediaKitBase64 = btoa(binary);
      }

      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastName,
          podcastUrl: podcastUrl || undefined,
          hostName: hostName || undefined,
          podcastDescription: podcastDescription || undefined,
          category: formCategory,
          mediaKit: mediaKitBase64 || undefined,
          mediaKitFileName: mediaKit?.name || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let resultData: { id?: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              setAnalysisProgress({
                stage: event.stage,
                message: event.message,
                progress: event.progress,
                detail: event.detail
              });

              if (event.stage === 'complete' && event.result) {
                resultData = event.result;
              }

              if (event.stage === 'error') {
                throw new Error(event.detail || 'Analysis failed');
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      await loadPodcasts();
      setShowForm(false);
      setPodcastName('');
      setPodcastUrl('');
      setHostName('');
      setPodcastDescription('');
      setMediaKit(null);
      setMediaKitPreview(null);

      if (resultData?.id) {
        const newPodcast = await podcastApi.getById(resultData.id);
        if (newPodcast) setSelectedPodcast(newPodcast);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  // Enhance existing podcast with media kit
  const handleEnhanceWithMediaKit = async () => {
    if (!selectedPodcast || !enhanceMediaKit) return;

    setIsEnhancing(true);
    setEnhanceProgress('Processing media kit...');

    try {
      // Convert media kit to base64
      const arrayBuffer = await enhanceMediaKit.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const mediaKitBase64 = btoa(binary);

      setEnhanceProgress('Analyzing with media kit data...');

      const response = await fetch('/api/enhance-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: selectedPodcast.id,
          podcastName: selectedPodcast.podcast_name,
          hostName: selectedPodcast.host_name,
          podcastUrl: selectedPodcast.podcast_url,
          category: selectedPodcast.podcast_category,
          mediaKit: mediaKitBase64,
          mediaKitFileName: enhanceMediaKit.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Enhancement failed');
      }

      setEnhanceProgress('Saving updated analysis...');

      const result = await response.json();

      // Refresh the podcast data
      const updated = await podcastApi.getById(selectedPodcast.id);
      if (updated) {
        setSelectedPodcast(updated);
        setPodcasts(prev => prev.map(p => p.id === updated.id ? updated : p));
      }

      setEnhanceMediaKit(null);
      setEnhanceProgress(null);
      alert('Podcast enhanced with media kit data!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
      setEnhanceProgress(null);
    }
  };

  const handleScan = async (category?: PodcastCategory) => {
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);
    setScanProgress({ stage: 'starting', message: 'Starting scan...', progress: 0 });

    try {
      const url = category
        ? `/api/scan-podcasts-stream?category=${category}`
        : '/api/scan-podcasts-stream';
      const response = await fetch(url);

      if (!response.ok) throw new Error('Scan failed to start');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setScanProgress({
                stage: data.stage,
                message: data.message,
                progress: data.progress,
                current: data.current,
                total: data.total
              });

              if (data.stage === 'complete' && data.result) {
                setScanResult({ discovered: data.result.discovered, saved: data.result.saved });
                await loadPodcasts();
              }

              if (data.stage === 'fatal_error') {
                setScanError(data.error || 'Unknown error');
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Scan error:', e);
      setScanError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        if (!scanError) setScanProgress(null);
      }, 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this podcast?')) return;
    try {
      await podcastApi.delete(id);
      await loadPodcasts();
      if (selectedPodcast?.id === id) setSelectedPodcast(null);
    } catch (e) {
      console.error('Error deleting:', e);
    }
  };

  const handleStatusChange = async (id: string, status: PodcastStatus) => {
    try {
      await podcastApi.updateStatus(id, status);
      await loadPodcasts();
      if (selectedPodcast?.id === id) {
        const updated = await podcastApi.getById(id);
        if (updated) setSelectedPodcast(updated);
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  const getRecommendationConfig = (rec: string | null) => {
    return RECOMMENDATION_CONFIG[rec as keyof typeof RECOMMENDATION_CONFIG] || RECOMMENDATION_CONFIG.MAYBE;
  };

  // Stats
  const stats = {
    total: podcasts.length,
    finance: podcasts.filter(p => p.podcast_category === 'finance').length,
    aiData: podcasts.filter(p => p.podcast_category === 'ai_data').length,
    strongYes: podcasts.filter(p => p.recommendation === 'STRONG_YES').length,
    avgScore: podcasts.length > 0
      ? Math.round(podcasts.reduce((sum, p) => sum + (p.overall_score || 0), 0) / podcasts.length)
      : 0
  };

  // Derived values for selected podcast modal
  const selectedReport = selectedPodcast?.full_report as Record<string, string> | null;
  const selectedRecConfig = selectedPodcast ? getRecommendationConfig(selectedPodcast.recommendation) : null;
  const selectedStatusConfig = selectedPodcast ? STATUS_CONFIG[selectedPodcast.status] : null;
  const fullAnalysisText = selectedReport?.fullAnalysis ?? null;

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="border-b border-[hsl(210,20%,90%)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-cyber text-xl font-bold text-[hsl(220,20%,20%)] tracking-wide">
                  PODCAST RESEARCHER
                </h1>
                <p className="text-xs text-[hsl(220,10%,50%)] font-mono">
                  Find podcasts for CEO guest appearances
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button
                  disabled={isScanning}
                  className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Radar className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
                  {isScanning ? 'Scanning...' : 'AI Discover'}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    onClick={() => handleScan('finance')}
                    disabled={isScanning}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    Finance Podcasts
                  </button>
                  <button
                    onClick={() => handleScan('ai_data')}
                    disabled={isScanning}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    AI/Data Podcasts
                  </button>
                  <button
                    onClick={() => handleScan()}
                    disabled={isScanning}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
                  >
                    <Target className="h-4 w-4 text-gray-600" />
                    All Categories
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Research Podcast
              </button>
              <button
                onClick={loadPodcasts}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium bg-white border border-[hsl(210,20%,88%)] rounded-md hover:border-purple-500 hover:text-purple-500 transition-all flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Scan Progress */}
        {isScanning && scanProgress && (
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Radar className="h-5 w-5 text-purple-600 animate-pulse" />
                <span className="text-sm font-medium text-purple-800">{scanProgress.message}</span>
              </div>
              {scanProgress.current && scanProgress.total && (
                <span className="text-xs text-purple-600">{scanProgress.current}/{scanProgress.total}</span>
              )}
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${scanProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Scan Error */}
        {scanError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">Scan failed: {scanError}</span>
            </div>
            <button onClick={() => setScanError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && !isScanning && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800">
                Discovery complete: Found {scanResult.discovered} podcasts, saved {scanResult.saved} new
              </span>
            </div>
            <button onClick={() => setScanResult(null)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, icon: <Mic className="h-5 w-5" />, color: '#6b7280' },
            { label: 'Finance', value: stats.finance, icon: <BarChart3 className="h-5 w-5" />, color: '#059669' },
            { label: 'AI/Data', value: stats.aiData, icon: <Sparkles className="h-5 w-5" />, color: '#8b5cf6' },
            { label: 'Strong Yes', value: stats.strongYes, icon: <TrendingUp className="h-5 w-5" />, color: '#3b82f6' },
            { label: 'Avg. Score', value: stats.avgScore, icon: <Target className="h-5 w-5" />, color: '#f59e0b' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg border border-[hsl(210,20%,90%)] p-4 hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[hsl(220,10%,50%)]">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                </div>
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              categoryFilter === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-[hsl(210,20%,90%)] text-[hsl(220,20%,30%)] hover:border-gray-400'
            }`}
          >
            <Mic className="h-4 w-4" />
            All Podcasts
          </button>
          <button
            onClick={() => setCategoryFilter('finance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              categoryFilter === 'finance'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-[hsl(210,20%,90%)] text-[hsl(220,20%,30%)] hover:border-green-400'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Finance Focused
          </button>
          <button
            onClick={() => setCategoryFilter('ai_data')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              categoryFilter === 'ai_data'
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-[hsl(210,20%,90%)] text-[hsl(220,20%,30%)] hover:border-purple-400'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI/Data Focused
          </button>
        </div>

        {/* Podcasts Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : podcasts.length === 0 ? (
          <div className="bg-[hsl(210,20%,98%)] rounded-xl border border-[hsl(210,20%,90%)] p-12 text-center">
            <Mic className="h-12 w-12 text-[hsl(210,20%,80%)] mx-auto mb-4" />
            <h3 className="font-cyber text-lg font-bold text-[hsl(220,10%,60%)] mb-2">No Podcasts Yet</h3>
            <p className="text-sm text-[hsl(220,10%,55%)] mb-4">
              Click &quot;Research Podcast&quot; or &quot;AI Discover&quot; to find podcasts
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition-all"
            >
              Research First Podcast
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[hsl(210,20%,90%)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[hsl(210,20%,98%)] border-b border-[hsl(210,20%,92%)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Podcast</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Paid?</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Recommendation</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[hsl(220,10%,45%)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(210,20%,95%)]">
                {podcasts.map((podcast) => {
                  const recConfig = getRecommendationConfig(podcast.recommendation);
                  const statusConfig = STATUS_CONFIG[podcast.status];
                  const catConfig = podcast.podcast_category ? CATEGORY_CONFIG[podcast.podcast_category] : null;
                  return (
                    <tr
                      key={podcast.id}
                      className="hover:bg-[hsl(210,20%,99%)] cursor-pointer transition-colors"
                      onClick={() => setSelectedPodcast(podcast)}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-[hsl(220,20%,20%)]">{podcast.podcast_name}</div>
                        <div className="text-xs text-[hsl(220,10%,55%)]">
                          {podcast.host_name || 'Unknown host'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {catConfig && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                            style={{ background: `${catConfig.color}15`, color: catConfig.color }}
                          >
                            <catConfig.icon className="h-3 w-3" />
                            {catConfig.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm ${podcast.is_paid ? 'text-orange-600' : 'text-green-600'}`}>
                          {podcast.is_paid === true ? '💰 Paid' : podcast.is_paid === false ? '✓ Free' : '?'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-2xl font-bold" style={{ color: recConfig.color }}>
                          {podcast.overall_score ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: recConfig.bg, color: recConfig.color }}
                        >
                          {recConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                          style={{ background: statusConfig.bg, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedPodcast(podcast); }}
                            className="p-2 hover:bg-[hsl(210,20%,95%)] rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-[hsl(220,10%,50%)]" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(podcast.id); }}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* New Analysis Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !isAnalyzing && setShowForm(false)}>
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[hsl(210,20%,92%)] flex items-center justify-between">
              <h2 className="font-cyber text-lg font-bold text-[hsl(220,20%,20%)]">Research Podcast</h2>
              <button onClick={() => !isAnalyzing && setShowForm(false)} className="p-2 hover:bg-[hsl(210,20%,95%)] rounded-lg" disabled={isAnalyzing}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[hsl(220,20%,30%)] mb-2">Podcast Name *</label>
                <input
                  type="text"
                  value={podcastName}
                  onChange={(e) => setPodcastName(e.target.value)}
                  placeholder="e.g., AI in Business Podcast"
                  className="w-full px-4 py-3 border border-[hsl(210,20%,88%)] rounded-lg focus:outline-none focus:border-purple-500"
                  disabled={isAnalyzing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[hsl(220,20%,30%)] mb-2">Host Name</label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-3 border border-[hsl(210,20%,88%)] rounded-lg focus:outline-none focus:border-purple-500"
                    disabled={isAnalyzing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[hsl(220,20%,30%)] mb-2">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as PodcastCategory)}
                    className="w-full px-4 py-3 border border-[hsl(210,20%,88%)] rounded-lg focus:outline-none focus:border-purple-500"
                    disabled={isAnalyzing}
                  >
                    <option value="finance">Finance Focused</option>
                    <option value="ai_data">AI/Data Focused</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(220,20%,30%)] mb-2">
                  <LinkIcon className="h-4 w-4 inline mr-1" /> Podcast URL
                </label>
                <input
                  type="url"
                  value={podcastUrl}
                  onChange={(e) => setPodcastUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 border border-[hsl(210,20%,88%)] rounded-lg focus:outline-none focus:border-purple-500"
                  disabled={isAnalyzing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[hsl(220,20%,30%)] mb-2">Description / Notes</label>
                <textarea
                  value={podcastDescription}
                  onChange={(e) => setPodcastDescription(e.target.value)}
                  placeholder="Any additional info about the podcast..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[hsl(210,20%,88%)] rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                  disabled={isAnalyzing}
                />
              </div>

              {/* Media Kit Upload */}
              <div>
                <label className="block text-sm font-medium text-[hsl(220,20%,30%)] mb-2">
                  <FileText className="h-4 w-4 inline mr-1" /> Media Kit (PDF)
                </label>
                <div className="relative">
                  {!mediaKit ? (
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[hsl(210,20%,88%)] rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-colors ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">
                          <span className="font-medium text-purple-600">Upload media kit</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF (max 10MB)</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={isAnalyzing}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              setError('Media kit must be under 10MB');
                              return;
                            }
                            setMediaKit(file);
                            setMediaKitPreview(file.name);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-900">{mediaKitPreview}</p>
                          <p className="text-xs text-purple-600">{(mediaKit.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaKit(null);
                          setMediaKitPreview(null);
                        }}
                        disabled={isAnalyzing}
                        className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4 text-purple-600" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Upload podcast's media kit for more accurate analysis (audience demographics, sponsorship rates, etc.)
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Progress Display */}
              {isAnalyzing && analysisProgress && (
                <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-purple-200" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-purple-900">{analysisProgress.message}</div>
                      {analysisProgress.detail && (
                        <div className="text-sm text-purple-600">{analysisProgress.detail}</div>
                      )}
                    </div>
                    <div className="text-sm font-mono font-bold text-purple-700">
                      {analysisProgress.progress}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out"
                      style={{ width: `${analysisProgress.progress}%` }}
                    />
                  </div>

                  {/* Stage indicators */}
                  <div className="flex justify-between mt-3 text-xs">
                    {[
                      { key: 'searching', label: 'Search', icon: '🔍' },
                      { key: 'audience', label: 'Audience', icon: '👥' },
                      { key: 'contact', label: 'Contact', icon: '📧' },
                      { key: 'strategy', label: 'Strategy', icon: '🎯' },
                      { key: 'saving', label: 'Save', icon: '💾' },
                    ].map((stage) => {
                      const stageOrder = ['searching', 'audience', 'contact', 'strategy', 'finalizing', 'saving', 'complete'];
                      const currentIndex = stageOrder.indexOf(analysisProgress.stage);
                      const stageIndex = stageOrder.indexOf(stage.key);
                      const isActive = stage.key === analysisProgress.stage;
                      const isComplete = stageIndex < currentIndex;

                      return (
                        <div
                          key={stage.key}
                          className={`flex flex-col items-center gap-1 transition-all ${
                            isActive ? 'text-purple-700 scale-110' : isComplete ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          <span className="text-base">{isComplete ? '✓' : stage.icon}</span>
                          <span className={`font-medium ${isActive ? 'text-purple-700' : ''}`}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[hsl(210,20%,92%)] flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[hsl(210,20%,88%)] rounded-lg hover:bg-[hsl(210,20%,98%)]"
                disabled={isAnalyzing}
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !podcastName.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {analysisProgress?.message || 'Researching...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Research Podcast
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Podcast Detail Modal */}
      {selectedPodcast && selectedRecConfig && selectedStatusConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPodcast(null)}>
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
                <>
                  <div className="p-6 border-b border-[hsl(210,20%,92%)] flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                      <h2 className="font-cyber text-xl font-bold text-[hsl(220,20%,20%)]">{selectedPodcast.podcast_name}</h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[hsl(220,10%,50%)]">
                        {selectedPodcast.host_name && <span>Host: {selectedPodcast.host_name}</span>}
                        {selectedPodcast.podcast_url && (
                          <a
                            href={selectedPodcast.podcast_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Website
                          </a>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedPodcast(null)} className="p-2 hover:bg-[hsl(210,20%,95%)] rounded-lg">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Score Card */}
                    <div className="flex gap-4">
                      <div
                        className="flex-1 rounded-xl border-2 p-6"
                        style={{ borderColor: selectedRecConfig.color, background: selectedRecConfig.bg }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-[hsl(220,10%,40%)]">Overall Score</div>
                            <div className="text-5xl font-cyber font-bold" style={{ color: selectedRecConfig.color }}>
                              {selectedPodcast.overall_score ?? '-'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2" style={{ color: selectedRecConfig.color }}>
                              <selectedRecConfig.icon className="h-8 w-8" />
                              <div className="text-lg font-bold">{selectedRecConfig.label}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="w-48 rounded-xl border border-[hsl(210,20%,90%)] p-4">
                        <div className="text-sm font-medium text-[hsl(220,10%,40%)] mb-2">Status</div>
                        <select
                          value={selectedPodcast.status}
                          onChange={(e) => handleStatusChange(selectedPodcast.id, e.target.value as PodcastStatus)}
                          className="w-full px-3 py-2 border border-[hsl(210,20%,88%)] rounded-lg text-sm"
                          style={{ background: selectedStatusConfig.bg, color: selectedStatusConfig.color }}
                        >
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Enhance with Media Kit */}
                    <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-purple-900">Enhance with Media Kit</div>
                            <div className="text-xs text-purple-600">
                              Upload the podcast's media kit for more accurate audience data, pricing, and contacts
                            </div>
                          </div>
                        </div>
                        {!enhanceMediaKit ? (
                          <label className={`px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 cursor-pointer transition-colors ${isEnhancing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Upload className="h-4 w-4 inline mr-2" />
                            Upload PDF
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              disabled={isEnhancing}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    alert('Media kit must be under 10MB');
                                    return;
                                  }
                                  setEnhanceMediaKit(file);
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                              {enhanceMediaKit.name}
                            </div>
                            {isEnhancing ? (
                              <div className="flex items-center gap-2 text-purple-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">{enhanceProgress}</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={handleEnhanceWithMediaKit}
                                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
                                >
                                  <Sparkles className="h-4 w-4 inline mr-1" />
                                  Enhance
                                </button>
                                <button
                                  onClick={() => setEnhanceMediaKit(null)}
                                  className="p-2 hover:bg-purple-100 rounded-lg"
                                >
                                  <X className="h-4 w-4 text-purple-600" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Business Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-[hsl(210,20%,90%)] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[hsl(220,20%,20%)] mb-2">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          Business Model
                        </div>
                        <div className="text-lg font-semibold">
                          {selectedPodcast.is_paid ? '💰 Paid Sponsorship' : '✓ Free Guest Spot'}
                        </div>
                        {selectedPodcast.estimated_cost && (
                          <div className="text-sm text-[hsl(220,10%,50%)]">
                            Est. cost: {selectedPodcast.estimated_cost}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-[hsl(210,20%,90%)] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[hsl(220,20%,20%)] mb-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          Audience
                        </div>
                        <div className="text-sm text-[hsl(220,10%,45%)]">
                          {selectedPodcast.audience_description || 'Not analyzed'}
                        </div>
                        {selectedPodcast.audience_size ? (
                          <div className="text-xs text-[hsl(220,10%,55%)] mt-1">
                            Size: {selectedPodcast.audience_size}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Contact Info */}
                    {(selectedPodcast.contact_email || selectedPodcast.contact_linkedin || selectedPodcast.contact_name) && (
                      <div className="rounded-xl border border-[hsl(210,20%,90%)] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[hsl(220,20%,20%)] mb-3">
                          <Mail className="h-4 w-4 text-green-500" />
                          Contact Information
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {selectedPodcast.contact_name && (
                            <div>
                              <div className="text-xs text-[hsl(220,10%,55%)]">Contact</div>
                              <div className="font-medium">{selectedPodcast.contact_name}</div>
                            </div>
                          )}
                          {selectedPodcast.contact_email && (
                            <div>
                              <div className="text-xs text-[hsl(220,10%,55%)]">Email</div>
                              <a href={`mailto:${selectedPodcast.contact_email}`} className="font-medium text-purple-600 hover:underline">
                                {selectedPodcast.contact_email}
                              </a>
                            </div>
                          )}
                          {selectedPodcast.contact_linkedin && (
                            <div>
                              <div className="text-xs text-[hsl(220,10%,55%)]">LinkedIn</div>
                              <a
                                href={selectedPodcast.contact_linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-purple-600 hover:underline flex items-center gap-1"
                              >
                                <Linkedin className="h-3 w-3" /> Profile
                              </a>
                            </div>
                          )}
                        </div>
                        {selectedPodcast.contact_method && (
                          <div className="mt-2 text-xs text-[hsl(220,10%,55%)]">
                            Best method: {selectedPodcast.contact_method}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pitch Strategy */}
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-800 mb-3">
                        <MessageSquare className="h-4 w-4" />
                        Pitch Strategy
                      </div>

                      {selectedPodcast.pitch_angle && (
                        <div className="mb-4">
                          <div className="text-xs text-purple-600 mb-1">Pitch Angle</div>
                          <div className="text-sm text-purple-900">{selectedPodcast.pitch_angle}</div>
                        </div>
                      )}

                      {selectedPodcast.keboola_story && (
                        <div className="mb-4">
                          <div className="text-xs text-purple-600 mb-1">Best Keboola Story</div>
                          <div className="text-sm text-purple-900">{selectedPodcast.keboola_story}</div>
                        </div>
                      )}

                      {selectedPodcast.suggested_topics && selectedPodcast.suggested_topics.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-purple-600 mb-2">Suggested Episode Topics</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedPodcast.suggested_topics.map((topic, i) => (
                              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPodcast.value_proposition && (
                        <div>
                          <div className="text-xs text-purple-600 mb-1">Value for Their Audience</div>
                          <div className="text-sm text-purple-900">{selectedPodcast.value_proposition}</div>
                        </div>
                      )}
                    </div>

                    {/* Full Analysis */}
                    {fullAnalysisText && (
                      <div className="bg-[hsl(210,20%,98%)] rounded-xl border border-[hsl(210,20%,90%)] p-5">
                        <h3 className="font-cyber text-sm font-bold text-[hsl(220,20%,20%)] mb-3">Full Analysis</h3>
                        <div className="text-sm text-[hsl(220,10%,40%)] whitespace-pre-wrap">
                          {fullAnalysisText}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-[hsl(210,20%,92%)] flex justify-end">
                    <button
                      onClick={() => setSelectedPodcast(null)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Close
                    </button>
                  </div>
                </>
          </div>
        </div>
      )}
    </div>
  );
}
