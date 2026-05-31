export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_snapshots: {
        Row: {
          app_id: string | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          platform: string | null
          posts_count: number | null
          total_clicks: number | null
          total_engagements: number | null
          total_impressions: number | null
          user_id: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type?: string
          platform?: string | null
          posts_count?: number | null
          total_clicks?: number | null
          total_engagements?: number | null
          total_impressions?: number | null
          user_id: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          platform?: string | null
          posts_count?: number | null
          total_clicks?: number | null
          total_engagements?: number | null
          total_impressions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          brand_tone: string | null
          created_at: string
          description: string | null
          engagements_count: number | null
          id: string
          landing_brand_color: string | null
          landing_cta_label: string | null
          landing_enabled: boolean
          landing_features: Json
          landing_headline: string | null
          landing_objections: Json
          landing_persona_id: string | null
          landing_proof: Json
          landing_slug: string | null
          landing_subheadline: string | null
          landing_template: string
          name: string
          platforms: string[] | null
          posts_count: number | null
          primary_goal: string | null
          target_audience: string | null
          traffic_count: number | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          brand_tone?: string | null
          created_at?: string
          description?: string | null
          engagements_count?: number | null
          id?: string
          landing_brand_color?: string | null
          landing_cta_label?: string | null
          landing_enabled?: boolean
          landing_features?: Json
          landing_headline?: string | null
          landing_objections?: Json
          landing_persona_id?: string | null
          landing_proof?: Json
          landing_slug?: string | null
          landing_subheadline?: string | null
          landing_template?: string
          name: string
          platforms?: string[] | null
          posts_count?: number | null
          primary_goal?: string | null
          target_audience?: string | null
          traffic_count?: number | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          brand_tone?: string | null
          created_at?: string
          description?: string | null
          engagements_count?: number | null
          id?: string
          landing_brand_color?: string | null
          landing_cta_label?: string | null
          landing_enabled?: boolean
          landing_features?: Json
          landing_headline?: string | null
          landing_objections?: Json
          landing_persona_id?: string | null
          landing_proof?: Json
          landing_slug?: string | null
          landing_subheadline?: string | null
          landing_template?: string
          name?: string
          platforms?: string[] | null
          posts_count?: number | null
          primary_goal?: string | null
          target_audience?: string | null
          traffic_count?: number | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      audience_profiles: {
        Row: {
          app_id: string
          created_at: string
          id: string
          last_generated_at: string | null
          raw_research: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          last_generated_at?: string | null
          raw_research?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          last_generated_at?: string | null
          raw_research?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_audit_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_policies: {
        Row: {
          auto_approve_enabled: boolean
          auto_publish_enabled: boolean
          auto_publish_time: string | null
          created_at: string
          escalation_mode: string
          id: string
          max_posts_per_day: number
          min_quality_score: number
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_approve_enabled?: boolean
          auto_publish_enabled?: boolean
          auto_publish_time?: string | null
          created_at?: string
          escalation_mode?: string
          id?: string
          max_posts_per_day?: number
          min_quality_score?: number
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_approve_enabled?: boolean
          auto_publish_enabled?: boolean
          auto_publish_time?: string | null
          created_at?: string
          escalation_mode?: string
          id?: string
          max_posts_per_day?: number
          min_quality_score?: number
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_assets: {
        Row: {
          app_id: string
          asset_type: string
          body: string | null
          campaign_id: string
          created_at: string
          id: string
          metadata: Json
          ref_id: string | null
          ref_table: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          asset_type: string
          body?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          metadata?: Json
          ref_id?: string | null
          ref_table?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          asset_type?: string
          body?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          ref_id?: string | null
          ref_table?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          active: boolean
          app_id: string
          campaign_name: string
          created_at: string
          goal_id: string | null
          id: string
          platform_mix: string[] | null
          posting_frequency: number
          seed_distribution_action_id: string | null
          seed_distribution_source_type: string | null
          seed_distribution_target_id: string | null
          seed_recommendation_id: string | null
          strategy_summary: string | null
          themes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          app_id: string
          campaign_name: string
          created_at?: string
          goal_id?: string | null
          id?: string
          platform_mix?: string[] | null
          posting_frequency?: number
          seed_distribution_action_id?: string | null
          seed_distribution_source_type?: string | null
          seed_distribution_target_id?: string | null
          seed_recommendation_id?: string | null
          strategy_summary?: string | null
          themes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          app_id?: string
          campaign_name?: string
          created_at?: string
          goal_id?: string | null
          id?: string
          platform_mix?: string[] | null
          posting_frequency?: number
          seed_distribution_action_id?: string | null
          seed_distribution_source_type?: string | null
          seed_distribution_target_id?: string | null
          seed_recommendation_id?: string | null
          strategy_summary?: string | null
          themes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "growth_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      click_events: {
        Row: {
          app_id: string | null
          content_id: string | null
          created_at: string
          distribution_target_id: string | null
          id: string
          ip_hash: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_id?: string | null
          content_id?: string | null
          created_at?: string
          distribution_target_id?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_id?: string | null
          content_id?: string | null
          created_at?: string
          distribution_target_id?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_signals: {
        Row: {
          app_id: string | null
          competitor_name: string
          created_at: string
          description: string | null
          detected_at: string
          id: string
          impact_score: number
          metadata: Json
          recommended_response: string | null
          signal_type: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          app_id?: string | null
          competitor_name: string
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          impact_score?: number
          metadata?: Json
          recommended_response?: string | null
          signal_type: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          app_id?: string | null
          competitor_name?: string
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          impact_score?: number
          metadata?: Json
          recommended_response?: string | null
          signal_type?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          app_id: string
          campaign_id: string | null
          clicks: number | null
          content_text: string
          created_at: string
          distribution_action_id: string | null
          distribution_source_type: string | null
          distribution_target_id: string | null
          engagements: number | null
          external_post_id: string | null
          external_url: string | null
          failure_reason: string | null
          id: string
          image_url: string | null
          impressions: number | null
          journey_stage: string | null
          messaging_angle: string | null
          persona_id: string | null
          platform: string
          published_at: string | null
          scheduled_for: string | null
          seed_recommendation_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          campaign_id?: string | null
          clicks?: number | null
          content_text: string
          created_at?: string
          distribution_action_id?: string | null
          distribution_source_type?: string | null
          distribution_target_id?: string | null
          engagements?: number | null
          external_post_id?: string | null
          external_url?: string | null
          failure_reason?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          journey_stage?: string | null
          messaging_angle?: string | null
          persona_id?: string | null
          platform: string
          published_at?: string | null
          scheduled_for?: string | null
          seed_recommendation_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          campaign_id?: string | null
          clicks?: number | null
          content_text?: string
          created_at?: string
          distribution_action_id?: string | null
          distribution_source_type?: string | null
          distribution_target_id?: string | null
          engagements?: number | null
          external_post_id?: string | null
          external_url?: string | null
          failure_reason?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          journey_stage?: string | null
          messaging_angle?: string | null
          persona_id?: string | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
          seed_recommendation_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      content_scores: {
        Row: {
          auto_approved: boolean
          brand_score: number
          clarity_score: number
          content_id: string
          conversion_score: number
          created_at: string
          id: string
          quality_score: number
          reasons: string | null
          risk_score: number
        }
        Insert: {
          auto_approved?: boolean
          brand_score?: number
          clarity_score?: number
          content_id: string
          conversion_score?: number
          created_at?: string
          id?: string
          quality_score?: number
          reasons?: string | null
          risk_score?: number
        }
        Update: {
          auto_approved?: boolean
          brand_score?: number
          clarity_score?: number
          content_id?: string
          conversion_score?: number
          created_at?: string
          id?: string
          quality_score?: number
          reasons?: string | null
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_scores_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          amount: number
          app_id: string
          created_at: string
          currency: string
          distribution_target_id: string | null
          id: string
          lead_id: string
          notes: string | null
          source: string
          source_content_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          app_id: string
          created_at?: string
          currency?: string
          distribution_target_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          source?: string
          source_content_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          app_id?: string
          created_at?: string
          currency?: string
          distribution_target_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          source?: string
          source_content_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_source_content_id_fkey"
            columns: ["source_content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_signals: {
        Row: {
          app_id: string | null
          audience: string
          created_at: string
          id: string
          metadata: Json
          recommendation: string | null
          sentiment: string | null
          topic: string
          trend_score: number
          user_id: string
        }
        Insert: {
          app_id?: string | null
          audience: string
          created_at?: string
          id?: string
          metadata?: Json
          recommendation?: string | null
          sentiment?: string | null
          topic: string
          trend_score?: number
          user_id: string
        }
        Update: {
          app_id?: string | null
          audience?: string
          created_at?: string
          id?: string
          metadata?: Json
          recommendation?: string | null
          sentiment?: string | null
          topic?: string
          trend_score?: number
          user_id?: string
        }
        Relationships: []
      }
      distribution_actions: {
        Row: {
          action_type: string
          body: string | null
          campaign_id: string | null
          channel: string | null
          content_id: string | null
          created_at: string
          id: string
          metadata: Json
          subject: string | null
          target_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          subject?: string | null
          target_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          subject?: string | null
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      distribution_recommendations: {
        Row: {
          app_id: string | null
          basis: string
          confidence: number
          created_at: string
          id: string
          insight: string
          original_confidence: number | null
          recommendation: string | null
          related_platform: string | null
          status: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          basis?: string
          confidence?: number
          created_at?: string
          id?: string
          insight: string
          original_confidence?: number | null
          recommendation?: string | null
          related_platform?: string | null
          status?: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          basis?: string
          confidence?: number
          created_at?: string
          id?: string
          insight?: string
          original_confidence?: number | null
          recommendation?: string | null
          related_platform?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      distribution_targets: {
        Row: {
          activated_at: string | null
          app_id: string | null
          audience: string | null
          audience_fit: number
          clicks_count: number
          competition_level: number
          contacted_at: string | null
          conversion_potential: number
          conversions_count: number
          cost_score: number
          created_at: string
          description: string | null
          distribution_score: number
          event_date: string | null
          id: string
          leads_count: number
          metadata: Json
          name: string
          platform: string | null
          posts_count: number
          rationale: string | null
          reach_potential: number
          revenue_attributed: number
          saved_at: string | null
          signals: Json
          source: string
          status: string
          target_type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          app_id?: string | null
          audience?: string | null
          audience_fit?: number
          clicks_count?: number
          competition_level?: number
          contacted_at?: string | null
          conversion_potential?: number
          conversions_count?: number
          cost_score?: number
          created_at?: string
          description?: string | null
          distribution_score?: number
          event_date?: string | null
          id?: string
          leads_count?: number
          metadata?: Json
          name: string
          platform?: string | null
          posts_count?: number
          rationale?: string | null
          reach_potential?: number
          revenue_attributed?: number
          saved_at?: string | null
          signals?: Json
          source?: string
          status?: string
          target_type: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          app_id?: string | null
          audience?: string | null
          audience_fit?: number
          clicks_count?: number
          competition_level?: number
          contacted_at?: string | null
          conversion_potential?: number
          conversions_count?: number
          cost_score?: number
          created_at?: string
          description?: string | null
          distribution_score?: number
          event_date?: string | null
          id?: string
          leads_count?: number
          metadata?: Json
          name?: string
          platform?: string | null
          posts_count?: number
          rationale?: string | null
          reach_potential?: number
          revenue_attributed?: number
          saved_at?: string | null
          signals?: Json
          source?: string
          status?: string
          target_type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      grant_applications: {
        Row: {
          answers_json: Json | null
          app_id: string | null
          created_at: string
          generated_pitch: string | null
          grant_id: string
          id: string
          notes: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers_json?: Json | null
          app_id?: string | null
          created_at?: string
          generated_pitch?: string | null
          grant_id: string
          id?: string
          notes?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers_json?: Json | null
          app_id?: string | null
          created_at?: string
          generated_pitch?: string | null
          grant_id?: string
          id?: string
          notes?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_applications_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "grants"
            referencedColumns: ["id"]
          },
        ]
      }
      grants: {
        Row: {
          app_id: string | null
          country: string | null
          created_at: string
          deadline: string | null
          description: string | null
          eligibility_summary: string | null
          enriched_at: string | null
          fit_reasoning: string | null
          fit_score: number
          funding_amount: string | null
          id: string
          provider: string | null
          source: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility_summary?: string | null
          enriched_at?: string | null
          fit_reasoning?: string | null
          fit_score?: number
          funding_amount?: string | null
          id?: string
          provider?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          country?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          eligibility_summary?: string | null
          enriched_at?: string | null
          fit_reasoning?: string | null
          fit_score?: number
          funding_amount?: string | null
          id?: string
          provider?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      growth_goals: {
        Row: {
          app_id: string
          created_at: string
          current_value: number
          end_date: string
          goal_type: string
          id: string
          start_date: string
          status: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          current_value?: number
          end_date?: string
          goal_type?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          current_value?: number
          end_date?: string
          goal_type?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_goals_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_recommendations: {
        Row: {
          accepted_at: string | null
          angle: string | null
          app_id: string | null
          campaign_id: string | null
          confidence_score: number
          conversions_count: number
          created_at: string
          creative_count: number
          dismissed_at: string | null
          evidence_summary: string | null
          expected_impact: string | null
          explanation: string | null
          id: string
          journey_stage: string | null
          landing_app_id: string | null
          persona_id: string | null
          published_count: number
          recommendation_type: string
          revenue_attributed: number
          status: string
          suggested_platform: string | null
          supporting_signal_ids: Json
          title: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          angle?: string | null
          app_id?: string | null
          campaign_id?: string | null
          confidence_score?: number
          conversions_count?: number
          created_at?: string
          creative_count?: number
          dismissed_at?: string | null
          evidence_summary?: string | null
          expected_impact?: string | null
          explanation?: string | null
          id?: string
          journey_stage?: string | null
          landing_app_id?: string | null
          persona_id?: string | null
          published_count?: number
          recommendation_type: string
          revenue_attributed?: number
          status?: string
          suggested_platform?: string | null
          supporting_signal_ids?: Json
          title: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          angle?: string | null
          app_id?: string | null
          campaign_id?: string | null
          confidence_score?: number
          conversions_count?: number
          created_at?: string
          creative_count?: number
          dismissed_at?: string | null
          evidence_summary?: string | null
          expected_impact?: string | null
          explanation?: string | null
          id?: string
          journey_stage?: string | null
          landing_app_id?: string | null
          persona_id?: string | null
          published_count?: number
          recommendation_type?: string
          revenue_attributed?: number
          status?: string
          suggested_platform?: string | null
          supporting_signal_ids?: Json
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      icps: {
        Row: {
          app_id: string
          company_size: string | null
          created_at: string
          id: string
          industry: string | null
          notes: string | null
          segment: string
          signals: string[] | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          notes?: string | null
          segment: string
          signals?: string[] | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          company_size?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          notes?: string | null
          segment?: string
          signals?: string[] | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journey_stages: {
        Row: {
          app_id: string
          best_content: string | null
          best_cta: string | null
          channels: string[] | null
          created_at: string
          customer_thinking: string | null
          id: string
          pains: string[] | null
          stage: string
          stage_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          best_content?: string | null
          best_cta?: string | null
          channels?: string[] | null
          created_at?: string
          customer_thinking?: string | null
          id?: string
          pains?: string[] | null
          stage: string
          stage_order: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          best_content?: string | null
          best_cta?: string | null
          channels?: string[] | null
          created_at?: string
          customer_thinking?: string | null
          id?: string
          pains?: string[] | null
          stage?: string
          stage_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          app_id: string
          created_at: string
          distribution_target_id: string | null
          email: string
          id: string
          lead_score: number
          name: string | null
          notes: string | null
          platform: string | null
          source_content_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          distribution_target_id?: string | null
          email: string
          id?: string
          lead_score?: number
          name?: string | null
          notes?: string | null
          platform?: string | null
          source_content_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          distribution_target_id?: string | null
          email?: string
          id?: string
          lead_score?: number
          name?: string | null
          notes?: string | null
          platform?: string | null
          source_content_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_content_id_fkey"
            columns: ["source_content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_insights: {
        Row: {
          app_id: string
          confidence: number
          created_at: string
          id: string
          insight_text: string
          insight_type: string
          platform: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          confidence?: number
          created_at?: string
          id?: string
          insight_text: string
          insight_type?: string
          platform?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          confidence?: number
          created_at?: string
          id?: string
          insight_text?: string
          insight_type?: string
          platform?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_insights_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      market_signals: {
        Row: {
          app_id: string | null
          confidence_score: number
          created_at: string
          description: string | null
          detected_at: string
          id: string
          impact_score: number
          metadata: Json
          signal_type: string
          source: string | null
          title: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          confidence_score?: number
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          impact_score?: number
          metadata?: Json
          signal_type: string
          source?: string | null
          title: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          confidence_score?: number
          created_at?: string
          description?: string | null
          detected_at?: string
          id?: string
          impact_score?: number
          metadata?: Json
          signal_type?: string
          source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      messaging_angles: {
        Row: {
          angle_name: string
          app_id: string
          created_at: string
          example: string | null
          hook_template: string | null
          id: string
          sort_order: number
          updated_at: string
          user_id: string
          when_to_use: string | null
        }
        Insert: {
          angle_name: string
          app_id: string
          created_at?: string
          example?: string | null
          hook_template?: string | null
          id?: string
          sort_order?: number
          updated_at?: string
          user_id: string
          when_to_use?: string | null
        }
        Update: {
          angle_name?: string
          app_id?: string
          created_at?: string
          example?: string | null
          hook_template?: string | null
          id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
          when_to_use?: string | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          app_id: string | null
          category: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          metadata: Json
          recommendation: string | null
          relevance_score: number
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          app_id?: string | null
          category: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          recommendation?: string | null
          relevance_score?: number
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          app_id?: string | null
          category?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          recommendation?: string | null
          relevance_score?: number
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_signals: {
        Row: {
          captured_at: string
          clicks: number
          comments: number
          content_id: string
          conversions: number
          id: string
          impressions: number
          likes: number
          platform: string
          reposts: number
        }
        Insert: {
          captured_at?: string
          clicks?: number
          comments?: number
          content_id: string
          conversions?: number
          id?: string
          impressions?: number
          likes?: number
          platform: string
          reposts?: number
        }
        Update: {
          captured_at?: string
          clicks?: number
          comments?: number
          content_id?: string
          conversions?: number
          id?: string
          impressions?: number
          likes?: number
          platform?: string
          reposts?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_signals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          app_id: string
          channels: string[] | null
          company_size: string | null
          content_style: string | null
          created_at: string
          goals: string[] | null
          icp_id: string | null
          id: string
          objections: string[] | null
          pains: string[] | null
          responsibilities: string[] | null
          sort_order: number
          title: string
          triggers: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          channels?: string[] | null
          company_size?: string | null
          content_style?: string | null
          created_at?: string
          goals?: string[] | null
          icp_id?: string | null
          id?: string
          objections?: string[] | null
          pains?: string[] | null
          responsibilities?: string[] | null
          sort_order?: number
          title: string
          triggers?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          channels?: string[] | null
          company_size?: string | null
          content_style?: string | null
          created_at?: string
          goals?: string[] | null
          icp_id?: string | null
          id?: string
          objections?: string[] | null
          pains?: string[] | null
          responsibilities?: string[] | null
          sort_order?: number
          title?: string
          triggers?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          app_id: string | null
          connected: boolean
          connected_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          platform: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          app_id?: string | null
          connected?: boolean
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          platform: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          app_id?: string | null
          connected?: boolean
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          platform?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          angle_coverage: Json
          app_id: string | null
          coach_action: string | null
          coach_headline: string | null
          coach_impact: string | null
          computed_at: string
          coverage_score: number
          created_at: string
          format_coverage: Json
          id: string
          opportunities: Json
          revenue_coverage: Json
          stage_coverage: Json
          totals: Json
          user_id: string
        }
        Insert: {
          angle_coverage?: Json
          app_id?: string | null
          coach_action?: string | null
          coach_headline?: string | null
          coach_impact?: string | null
          computed_at?: string
          coverage_score?: number
          created_at?: string
          format_coverage?: Json
          id?: string
          opportunities?: Json
          revenue_coverage?: Json
          stage_coverage?: Json
          totals?: Json
          user_id: string
        }
        Update: {
          angle_coverage?: Json
          app_id?: string | null
          coach_action?: string | null
          coach_headline?: string | null
          coach_impact?: string | null
          computed_at?: string
          coverage_score?: number
          created_at?: string
          format_coverage?: Json
          id?: string
          opportunities?: Json
          revenue_coverage?: Json
          stage_coverage?: Json
          totals?: Json
          user_id?: string
        }
        Relationships: []
      }
      prospect_actions: {
        Row: {
          action_type: string
          body: string | null
          campaign_id: string | null
          channel: string | null
          created_at: string
          id: string
          metadata: Json
          prospect_id: string
          subject: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          prospect_id: string
          subject?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          body?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          prospect_id?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          app_id: string | null
          category: string
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          evidence: Json
          fit_score: number
          id: string
          location: string | null
          match_reason: string | null
          matched_icp_id: string | null
          matched_persona_id: string | null
          name: string
          opportunity_score: number
          prospect_score: number
          reachability_score: number
          responded_at: string | null
          revenue_attributed: number
          saved_at: string | null
          signals: Json
          source: string
          status: string
          updated_at: string
          urgency_score: number
          url: string | null
          user_id: string
        }
        Insert: {
          app_id?: string | null
          category: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          evidence?: Json
          fit_score?: number
          id?: string
          location?: string | null
          match_reason?: string | null
          matched_icp_id?: string | null
          matched_persona_id?: string | null
          name: string
          opportunity_score?: number
          prospect_score?: number
          reachability_score?: number
          responded_at?: string | null
          revenue_attributed?: number
          saved_at?: string | null
          signals?: Json
          source?: string
          status?: string
          updated_at?: string
          urgency_score?: number
          url?: string | null
          user_id: string
        }
        Update: {
          app_id?: string | null
          category?: string
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          evidence?: Json
          fit_score?: number
          id?: string
          location?: string | null
          match_reason?: string | null
          matched_icp_id?: string | null
          matched_persona_id?: string | null
          name?: string
          opportunity_score?: number
          prospect_score?: number
          reachability_score?: number
          responded_at?: string | null
          revenue_attributed?: number
          saved_at?: string | null
          signals?: Json
          source?: string
          status?: string
          updated_at?: string
          urgency_score?: number
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          approval_mode: boolean | null
          autopilot_mode: boolean | null
          billing_period_start: string | null
          created_at: string
          default_brand_tone: string | null
          id: string
          notification_content_ready: boolean | null
          notification_engagement_alerts: boolean | null
          notification_post_published: boolean | null
          notification_weekly_report: boolean | null
          plan: string
          posts_this_month: number
          smart_scheduling: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_mode?: boolean | null
          autopilot_mode?: boolean | null
          billing_period_start?: string | null
          created_at?: string
          default_brand_tone?: string | null
          id?: string
          notification_content_ready?: boolean | null
          notification_engagement_alerts?: boolean | null
          notification_post_published?: boolean | null
          notification_weekly_report?: boolean | null
          plan?: string
          posts_this_month?: number
          smart_scheduling?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_mode?: boolean | null
          autopilot_mode?: boolean | null
          billing_period_start?: string | null
          created_at?: string
          default_brand_tone?: string | null
          id?: string
          notification_content_ready?: boolean | null
          notification_engagement_alerts?: boolean | null
          notification_post_published?: boolean | null
          notification_weekly_report?: boolean | null
          plan?: string
          posts_this_month?: number
          smart_scheduling?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string
          email_sent: boolean
          engagement_rate: number | null
          id: string
          period_end: string
          period_start: string
          posts_published: number
          sent_at: string | null
          top_app_id: string | null
          top_app_name: string | null
          top_platform: string | null
          total_clicks: number
          total_engagements: number
          total_impressions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          engagement_rate?: number | null
          id?: string
          period_end: string
          period_start: string
          posts_published?: number
          sent_at?: string | null
          top_app_id?: string | null
          top_app_name?: string | null
          top_platform?: string | null
          total_clicks?: number
          total_engagements?: number
          total_impressions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          engagement_rate?: number | null
          id?: string
          period_end?: string
          period_start?: string
          posts_published?: number
          sent_at?: string | null
          top_app_id?: string | null
          top_app_name?: string | null
          top_platform?: string | null
          total_clicks?: number
          total_engagements?: number
          total_impressions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decay_distribution_recommendations: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
