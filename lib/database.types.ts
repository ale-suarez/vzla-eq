export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      engineers: {
        Row: {
          application_status: Database["public"]["Enums"]["engineer_application_status"];
          city: string | null;
          camera_affiliation: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          is_certified: boolean;
          license_number: string | null;
          motivation: string | null;
          documents_summary: string | null;
          documents_storage_paths: string[];
          profile_url: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          specialty: string | null;
          updated_at: string;
          user_id: string | null;
          years_experience: number | null;
        };
        Insert: {
          application_status?: Database["public"]["Enums"]["engineer_application_status"];
          city?: string | null;
          camera_affiliation?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_certified?: boolean;
          license_number?: string | null;
          motivation?: string | null;
          documents_summary?: string | null;
          documents_storage_paths?: string[];
          profile_url?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          specialty?: string | null;
          updated_at?: string;
          user_id?: string | null;
          years_experience?: number | null;
        };
        Update: {
          application_status?: Database["public"]["Enums"]["engineer_application_status"];
          city?: string | null;
          camera_affiliation?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_certified?: boolean;
          license_number?: string | null;
          motivation?: string | null;
          documents_summary?: string | null;
          documents_storage_paths?: string[];
          profile_url?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          specialty?: string | null;
          updated_at?: string;
          user_id?: string | null;
          years_experience?: number | null;
        };
        Relationships: [];
      };
      reviewer_users: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      incident_photos: {
        Row: {
          confidence: number | null;
          created_at: string;
          escalated: boolean;
          finding: string | null;
          id: string;
          incident_id: string;
          position: number;
          quality: string | null;
          storage_path: string;
          verdict: Database["public"]["Enums"]["verdict_level"] | null;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string;
          escalated?: boolean;
          finding?: string | null;
          id?: string;
          incident_id: string;
          position?: number;
          quality?: string | null;
          storage_path: string;
          verdict?: Database["public"]["Enums"]["verdict_level"] | null;
        };
        Update: {
          confidence?: number | null;
          created_at?: string;
          escalated?: boolean;
          finding?: string | null;
          id?: string;
          incident_id?: string;
          position?: number;
          quality?: string | null;
          storage_path?: string;
          verdict?: Database["public"]["Enums"]["verdict_level"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "incident_photos_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          address: string | null;
          ai_verdict: Database["public"]["Enums"]["verdict_level"] | null;
          analysis_status: Database["public"]["Enums"]["analysis_status"];
          assigned_to: string | null;
          basements: number | null;
          build_year: number | null;
          building_use: string | null;
          confidence: number | null;
          contact: string | null;
          created_at: string;
          feedback: string | null;
          finding: string | null;
          id: string;
          latitude: number | null;
          levels: number | null;
          longitude: number | null;
          material: string | null;
          raw_ai: Json | null;
          severity: Database["public"]["Enums"]["verdict_level"] | null;
          state: Database["public"]["Enums"]["incident_state"];
          terrain_type: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          ai_verdict?: Database["public"]["Enums"]["verdict_level"] | null;
          analysis_status?: Database["public"]["Enums"]["analysis_status"];
          assigned_to?: string | null;
          basements?: number | null;
          build_year?: number | null;
          building_use?: string | null;
          confidence?: number | null;
          contact?: string | null;
          created_at?: string;
          feedback?: string | null;
          finding?: string | null;
          id?: string;
          latitude?: number | null;
          levels?: number | null;
          longitude?: number | null;
          material?: string | null;
          raw_ai?: Json | null;
          severity?: Database["public"]["Enums"]["verdict_level"] | null;
          state?: Database["public"]["Enums"]["incident_state"];
          terrain_type?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          ai_verdict?: Database["public"]["Enums"]["verdict_level"] | null;
          analysis_status?: Database["public"]["Enums"]["analysis_status"];
          assigned_to?: string | null;
          basements?: number | null;
          build_year?: number | null;
          building_use?: string | null;
          confidence?: number | null;
          contact?: string | null;
          created_at?: string;
          feedback?: string | null;
          finding?: string | null;
          id?: string;
          latitude?: number | null;
          levels?: number | null;
          longitude?: number | null;
          material?: string | null;
          raw_ai?: Json | null;
          severity?: Database["public"]["Enums"]["verdict_level"] | null;
          state?: Database["public"]["Enums"]["incident_state"];
          terrain_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "engineers";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_backoffice_access: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
      has_review_access: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
      is_admin_user: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
      is_engineer_user: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
      is_reviewer_user: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      analysis_status: "pending" | "complete" | "failed";
      engineer_application_status: "pending" | "approved" | "rejected";
      incident_state: "pending" | "in_review" | "resolved" | "archived";
      verdict_level: "low" | "moderate" | "severe" | "critical";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      analysis_status: ["pending", "complete", "failed"],
      incident_state: ["pending", "in_review", "resolved", "archived"],
      verdict_level: ["low", "moderate", "severe", "critical"],
    },
  },
} as const;
