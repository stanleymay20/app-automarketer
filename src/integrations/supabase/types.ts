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
      content: {
        Row: {
          app_id: string
          clicks: number | null
          content_text: string
          created_at: string
          engagements: number | null
          external_post_id: string | null
          external_url: string | null
          failure_reason: string | null
          id: string
          impressions: number | null
          platform: string
          published_at: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          clicks?: number | null
          content_text: string
          created_at?: string
          engagements?: number | null
          external_post_id?: string | null
          external_url?: string | null
          failure_reason?: string | null
          id?: string
          impressions?: number | null
          platform: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          clicks?: number | null
          content_text?: string
          created_at?: string
          engagements?: number | null
          external_post_id?: string | null
          external_url?: string | null
          failure_reason?: string | null
          id?: string
          impressions?: number | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string | null
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
      platform_connections: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
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
      [_ in never]: never
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
