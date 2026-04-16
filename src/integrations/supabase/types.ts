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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      fields: {
        Row: {
          created_at: string
          google_maps_url: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          google_maps_url?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          google_maps_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          match_id: string
          minute: number
          period: number
          player_name: string | null
          second: number
          team: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          match_id: string
          minute?: number
          period?: number
          player_name?: string | null
          second?: number
          team?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          match_id?: string
          minute?: number
          period?: number
          player_name?: string | null
          second?: number
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string
          created_at: string
          current_minute: number | null
          current_period: number | null
          current_second: number | null
          field_id: string | null
          id: string
          is_interval: boolean | null
          match_date: string
          match_start_time: string | null
          match_time: string
          mister_id: string | null
          notes: string | null
          opponent: string
          period_duration: number | null
          score_away: number | null
          score_home: number | null
          status: string
          stoppage_minutes: number | null
          total_periods: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          current_minute?: number | null
          current_period?: number | null
          current_second?: number | null
          field_id?: string | null
          id?: string
          is_interval?: boolean | null
          match_date: string
          match_start_time?: string | null
          match_time: string
          mister_id?: string | null
          notes?: string | null
          opponent: string
          period_duration?: number | null
          score_away?: number | null
          score_home?: number | null
          status?: string
          stoppage_minutes?: number | null
          total_periods?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          current_minute?: number | null
          current_period?: number | null
          current_second?: number | null
          field_id?: string | null
          id?: string
          is_interval?: boolean | null
          match_date?: string
          match_start_time?: string | null
          match_time?: string
          mister_id?: string | null
          notes?: string | null
          opponent?: string
          period_duration?: number | null
          score_away?: number | null
          score_home?: number | null
          status?: string
          stoppage_minutes?: number | null
          total_periods?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_mister_id_fkey"
            columns: ["mister_id"]
            isOneToOne: false
            referencedRelation: "misters"
            referencedColumns: ["id"]
          },
        ]
      }
      misters: {
        Row: {
          access_code: string
          category: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
        }
        Insert: {
          access_code: string
          category?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
        }
        Update: {
          access_code?: string
          category?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
        }
        Relationships: []
      }
      opponent_teams: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponent_teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          category: string | null
          created_at: string
          device_id: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          session_type: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          device_id: string
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          session_type: string
        }
        Update: {
          category?: string | null
          created_at?: string
          device_id?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          session_type?: string
        }
        Relationships: []
      }
      standings: {
        Row: {
          category_id: string
          championship_name: string
          created_at: string
          id: string
        }
        Insert: {
          category_id: string
          championship_name: string
          created_at?: string
          id?: string
        }
        Update: {
          category_id?: string
          championship_name?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      standings_entries: {
        Row: {
          created_at: string
          drawn: number
          goal_difference: number
          goals_against: number
          goals_for: number
          id: string
          lost: number
          played: number
          points: number
          position: number
          standings_id: string
          team_name: string
          won: number
        }
        Insert: {
          created_at?: string
          drawn?: number
          goal_difference?: number
          goals_against?: number
          goals_for?: number
          id?: string
          lost?: number
          played?: number
          points?: number
          position?: number
          standings_id: string
          team_name: string
          won?: number
        }
        Update: {
          created_at?: string
          drawn?: number
          goal_difference?: number
          goals_against?: number
          goals_for?: number
          id?: string
          lost?: number
          played?: number
          points?: number
          position?: number
          standings_id?: string
          team_name?: string
          won?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_entries_standings_id_fkey"
            columns: ["standings_id"]
            isOneToOne: false
            referencedRelation: "standings"
            referencedColumns: ["id"]
          },
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
