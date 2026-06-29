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
      admin_users: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      engineers: {
        Row: {
          address: string | null
          application_status: Database["public"]["Enums"]["engineer_application_status"]
          camera_affiliation: string | null
          created_at: string
          documents_storage_paths: string[]
          documents_summary: string | null
          email: string | null
          full_name: string | null
          id: string
          is_certified: boolean
          latitude: number | null
          license_number: string | null
          longitude: number | null
          motivation: string | null
          profile_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          application_status?: Database["public"]["Enums"]["engineer_application_status"]
          camera_affiliation?: string | null
          created_at?: string
          documents_storage_paths?: string[]
          documents_summary?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_certified?: boolean
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          motivation?: string | null
          profile_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          application_status?: Database["public"]["Enums"]["engineer_application_status"]
          camera_affiliation?: string | null
          created_at?: string
          documents_storage_paths?: string[]
          documents_summary?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_certified?: boolean
          latitude?: number | null
          license_number?: string | null
          longitude?: number | null
          motivation?: string | null
          profile_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      incident_photos: {
        Row: {
          confidence: number | null
          created_at: string
          escalated: boolean
          finding: string | null
          id: string
          incident_id: string
          position: number
          quality: string | null
          storage_path: string
          tier: Database["public"]["Enums"]["photo_tier"] | null
          verdict: Database["public"]["Enums"]["verdict_level"] | null
          view_type: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          escalated?: boolean
          finding?: string | null
          id?: string
          incident_id: string
          position?: number
          quality?: string | null
          storage_path: string
          tier?: Database["public"]["Enums"]["photo_tier"] | null
          verdict?: Database["public"]["Enums"]["verdict_level"] | null
          view_type?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          escalated?: boolean
          finding?: string | null
          id?: string
          incident_id?: string
          position?: number
          quality?: string | null
          storage_path?: string
          tier?: Database["public"]["Enums"]["photo_tier"] | null
          verdict?: Database["public"]["Enums"]["verdict_level"] | null
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          address: string | null
          ai_verdict: Database["public"]["Enums"]["verdict_level"] | null
          analysis_status: Database["public"]["Enums"]["analysis_status"]
          assigned_to: string | null
          basements: number | null
          build_year: number | null
          building_use: string | null
          confidence: number | null
          contact: string | null
          created_at: string
          feedback: string | null
          finding: string | null
          id: string
          latitude: number | null
          levels: number | null
          longitude: number | null
          material: string | null
          raw_ai: Json | null
          severity: Database["public"]["Enums"]["verdict_level"] | null
          source_id: string | null
          source_ref: string | null
          state: Database["public"]["Enums"]["incident_state"]
          synced_at: string | null
          terrain_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_verdict?: Database["public"]["Enums"]["verdict_level"] | null
          analysis_status?: Database["public"]["Enums"]["analysis_status"]
          assigned_to?: string | null
          basements?: number | null
          build_year?: number | null
          building_use?: string | null
          confidence?: number | null
          contact?: string | null
          created_at?: string
          feedback?: string | null
          finding?: string | null
          id?: string
          latitude?: number | null
          levels?: number | null
          longitude?: number | null
          material?: string | null
          raw_ai?: Json | null
          severity?: Database["public"]["Enums"]["verdict_level"] | null
          source_id?: string | null
          source_ref?: string | null
          state?: Database["public"]["Enums"]["incident_state"]
          synced_at?: string | null
          terrain_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_verdict?: Database["public"]["Enums"]["verdict_level"] | null
          analysis_status?: Database["public"]["Enums"]["analysis_status"]
          assigned_to?: string | null
          basements?: number | null
          build_year?: number | null
          building_use?: string | null
          confidence?: number | null
          contact?: string | null
          created_at?: string
          feedback?: string | null
          finding?: string | null
          id?: string
          latitude?: number | null
          levels?: number | null
          longitude?: number | null
          material?: string | null
          raw_ai?: Json | null
          severity?: Database["public"]["Enums"]["verdict_level"] | null
          source_id?: string | null
          source_ref?: string | null
          state?: Database["public"]["Enums"]["incident_state"]
          synced_at?: string | null
          terrain_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewer_users: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          attribution: string | null
          code: string
          created_at: string
          id: string
          license: string | null
          name: string
          url: string | null
        }
        Insert: {
          attribution?: string | null
          code: string
          created_at?: string
          id?: string
          license?: string | null
          name: string
          url?: string | null
        }
        Update: {
          attribution?: string | null
          code?: string
          created_at?: string
          id?: string
          license?: string | null
          name?: string
          url?: string | null
        }
        Relationships: []
      }
      inspections: {
        Row: {
          id: string
          planilla_no: string | null
          created_by: string | null
          inspector_ids: string[]
          address: string | null
          estado: string | null
          municipio: string | null
          parroquia: string | null
          sector: string | null
          latitude: number | null
          longitude: number | null
          coord_utm_x: number | null
          coord_utm_y: number | null
          utm_huso: string | null
          uso: string | null
          nivel_pisos: number | null
          semisotanos: number | null
          sotanos: number | null
          anio_construccion: number | null
          tipo_estructural_ai: Database["public"]["Enums"]["element_type"] | null
          tipo_estructural_final: Database["public"]["Enums"]["element_type"] | null
          ext_colapso_ai: Database["public"]["Enums"]["abc_letter"] | null
          ext_colapso_final: Database["public"]["Enums"]["abc_letter"] | null
          ext_aledanos_ai: Database["public"]["Enums"]["abc_letter"] | null
          ext_aledanos_final: Database["public"]["Enums"]["abc_letter"] | null
          ext_geologico_ai: Database["public"]["Enums"]["abc_letter"] | null
          ext_geologico_final: Database["public"]["Enums"]["abc_letter"] | null
          ext_asentamiento_final: Database["public"]["Enums"]["abc_letter"] | null
          ext_inclinacion_final: Database["public"]["Enums"]["abc_letter"] | null
          riesgo_externo: Database["public"]["Enums"]["risk_level"] | null
          riesgo_estructura: Database["public"]["Enums"]["risk_level"] | null
          riesgo_no_estructural: Database["public"]["Enums"]["risk_level"] | null
          etiqueta: Database["public"]["Enums"]["etiqueta"] | null
          etiqueta_overridden: boolean
          override_reason: string | null
          croquis_ref: string | null
          observaciones: string | null
          rubric_version: string
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          planilla_no?: string | null
          created_by?: string | null
          inspector_ids?: string[]
          address?: string | null
          estado?: string | null
          municipio?: string | null
          parroquia?: string | null
          sector?: string | null
          latitude?: number | null
          longitude?: number | null
          coord_utm_x?: number | null
          coord_utm_y?: number | null
          utm_huso?: string | null
          uso?: string | null
          nivel_pisos?: number | null
          semisotanos?: number | null
          sotanos?: number | null
          anio_construccion?: number | null
          tipo_estructural_ai?: Database["public"]["Enums"]["element_type"] | null
          tipo_estructural_final?: Database["public"]["Enums"]["element_type"] | null
          ext_colapso_ai?: Database["public"]["Enums"]["abc_letter"] | null
          ext_colapso_final?: Database["public"]["Enums"]["abc_letter"] | null
          ext_aledanos_ai?: Database["public"]["Enums"]["abc_letter"] | null
          ext_aledanos_final?: Database["public"]["Enums"]["abc_letter"] | null
          ext_geologico_ai?: Database["public"]["Enums"]["abc_letter"] | null
          ext_geologico_final?: Database["public"]["Enums"]["abc_letter"] | null
          ext_asentamiento_final?: Database["public"]["Enums"]["abc_letter"] | null
          ext_inclinacion_final?: Database["public"]["Enums"]["abc_letter"] | null
          riesgo_externo?: Database["public"]["Enums"]["risk_level"] | null
          riesgo_estructura?: Database["public"]["Enums"]["risk_level"] | null
          riesgo_no_estructural?: Database["public"]["Enums"]["risk_level"] | null
          etiqueta?: Database["public"]["Enums"]["etiqueta"] | null
          etiqueta_overridden?: boolean
          override_reason?: string | null
          croquis_ref?: string | null
          observaciones?: string | null
          rubric_version: string
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          etiqueta?: Database["public"]["Enums"]["etiqueta"] | null
          etiqueta_overridden?: boolean
          override_reason?: string | null
          observaciones?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "engineers"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_elements: {
        Row: {
          id: string
          inspection_id: string
          element_label: string | null
          source: Database["public"]["Enums"]["element_source"]
          element_type_ai: Database["public"]["Enums"]["element_type"] | null
          element_type_final: Database["public"]["Enums"]["element_type"] | null
          grade_ai: Database["public"]["Enums"]["damage_grade"] | null
          grade_final: Database["public"]["Enums"]["damage_grade"] | null
          crack_band_ai: string | null
          crack_band_final: string | null
          indicators_ai: string[]
          indicators_final: string[]
          observables_extra: Json | null
          confirmed: boolean
          was_overridden: boolean
          photo_refs: string[]
          photo_quality: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          element_label?: string | null
          source?: Database["public"]["Enums"]["element_source"]
          element_type_ai?: Database["public"]["Enums"]["element_type"] | null
          element_type_final?: Database["public"]["Enums"]["element_type"] | null
          grade_ai?: Database["public"]["Enums"]["damage_grade"] | null
          grade_final?: Database["public"]["Enums"]["damage_grade"] | null
          crack_band_ai?: string | null
          crack_band_final?: string | null
          indicators_ai?: string[]
          indicators_final?: string[]
          observables_extra?: Json | null
          confirmed?: boolean
          photo_refs?: string[]
          photo_quality?: string | null
          created_at?: string
        }
        Update: {
          element_type_final?: Database["public"]["Enums"]["element_type"] | null
          grade_final?: Database["public"]["Enums"]["damage_grade"] | null
          crack_band_final?: string | null
          indicators_final?: string[]
          confirmed?: boolean
          photo_quality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_elements_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_drafts: {
        Row: {
          id: string
          inspection_id: string | null
          raw_output: Json
          model_id: string | null
          prompt_version: string | null
          latency_ms: number | null
          token_cost: number | null
          created_at: string
        }
        Insert: {
          id?: string
          inspection_id?: string | null
          raw_output: Json
          model_id?: string | null
          prompt_version?: string | null
          latency_ms?: number | null
          token_cost?: number | null
          created_at?: string
        }
        Update: {
          inspection_id?: string | null
          raw_output?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_drafts_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_backoffice_access: { Args: { user_id?: string }; Returns: boolean }
      has_review_access: { Args: { user_id?: string }; Returns: boolean }
      is_admin_user: { Args: { user_id?: string }; Returns: boolean }
      is_engineer_user: {
        Args: { engineer_user_id?: string }
        Returns: boolean
      }
      is_reviewer_user: { Args: { user_id?: string }; Returns: boolean }
    }
    Enums: {
      abc_letter: "a" | "b" | "c"
      analysis_status: "pending" | "complete" | "failed"
      damage_grade: "sin_dano" | "menor" | "moderado" | "severo" | "completo"
      element_source: "ai_drafted" | "inspector_added"
      element_type: "concreto_armado" | "muro_concreto" | "mamposteria" | "acero"
      engineer_application_status: "pending" | "approved" | "rejected"
      etiqueta: "verde" | "amarilla" | "roja"
      incident_state: "pending" | "in_review" | "resolved" | "archived"
      photo_tier: "triad" | "supplementary"
      risk_level: "bajo" | "medio" | "alto"
      // Legacy alias: the DB type was renamed verdict_level -> damage_grade
      // (migration 20260629220000). Generated column refs still say
      // verdict_level, so keep the alias to the same union.
      verdict_level: "sin_dano" | "menor" | "moderado" | "severo" | "completo"
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
      analysis_status: ["pending", "complete", "failed"],
      engineer_application_status: ["pending", "approved", "rejected"],
      incident_state: ["pending", "in_review", "resolved", "archived"],
      photo_tier: ["triad", "supplementary"],
      verdict_level: ["sin_dano", "menor", "moderado", "severo", "completo"],
    },
  },
} as const
