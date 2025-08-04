export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string
          id: string
          last_activity: string
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity?: string
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_activity?: string
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      company_website_data: {
        Row: {
          created_at: string
          id: string
          last_scraped_at: string
          scraped_content: Json
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_scraped_at?: string
          scraped_content: Json
          updated_at?: string
          user_id: string
          website_url: string
        }
        Update: {
          created_at?: string
          id?: string
          last_scraped_at?: string
          scraped_content?: Json
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_website_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      course_usage: {
        Row: {
          courses_created_today: number
          created_at: string
          id: string
          last_course_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          courses_created_today?: number
          created_at?: string
          id?: string
          last_course_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          courses_created_today?: number
          created_at?: string
          id?: string
          last_course_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          course_plan: Json
          course_title: string
          created_at: string
          creator_id: string
          id: string
          system_prompt: string
          track_type: string
        }
        Insert: {
          course_plan: Json
          course_title: string
          created_at?: string
          creator_id: string
          id?: string
          system_prompt: string
          track_type: string
        }
        Update: {
          course_plan?: Json
          course_title?: string
          created_at?: string
          creator_id?: string
          id?: string
          system_prompt?: string
          track_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      credit_limits: {
        Row: {
          additional_credits_purchased: number
          created_at: string
          credits_used_this_month: number
          id: string
          monthly_credits: number
          plan_type: string
          reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_credits_purchased?: number
          created_at?: string
          credits_used_this_month?: number
          id?: string
          monthly_credits?: number
          plan_type: string
          reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_credits_purchased?: number
          created_at?: string
          credits_used_this_month?: number
          id?: string
          monthly_credits?: number
          plan_type?: string
          reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      credit_usage: {
        Row: {
          action_type: string
          created_at: string
          credits_consumed: number
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_consumed?: number
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_consumed?: number
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      groups: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          group_name: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          group_name: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          group_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      honest_box_questions: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_active: boolean
          question_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          question_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          question_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "honest_box_questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          }
        ]
      }
      honest_box_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          response_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          response_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          response_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "honest_box_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "honest_box_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honest_box_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          group_id: string | null
          id: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          group_id?: string | null
          id?: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          group_id?: string | null
          id?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pdf_extractions: {
        Row: {
          created_at: string
          extracted_content: string
          id: string
          original_filename: string | null
          processed_at: string
          prompt_used: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_content: string
          id?: string
          original_filename?: string | null
          processed_at?: string
          prompt_used: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_content?: string
          id?: string
          original_filename?: string | null
          processed_at?: string
          prompt_used?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_extractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          company_website: string | null
          created_at: string
          email: string
          full_name: string | null
          group_id: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          role: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          group_id?: string | null
          id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          role?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          group_id?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          licenses_purchased: number
          licenses_used: number
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_tier: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          licenses_purchased?: number
          licenses_used?: number
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          licenses_purchased?: number
          licenses_used?: number
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_tier?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_performance: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          session_data: Json
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          session_data: Json
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          session_data?: Json
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_performance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_performance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      website_extractions: {
        Row: {
          created_at: string
          extracted_content: string
          id: string
          processed_at: string
          prompt_used: string
          search_query: string
          user_id: string
          website_url: string
        }
        Insert: {
          created_at?: string
          extracted_content: string
          id?: string
          processed_at?: string
          prompt_used: string
          search_query: string
          user_id: string
          website_url: string
        }
        Update: {
          created_at?: string
          extracted_content?: string
          id?: string
          processed_at?: string
          prompt_used?: string
          search_query?: string
          user_id?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_extractions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_plan: "Free" | "Standard" | "Pro" | "Business" | "Enterprise"
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
    Enums: {
      app_role: ["Admin", "Standard"],
      subscription_plan: ["Free", "Pro", "Enterprise"],
    },
  },
} as const
