export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      action_items: {
        Row: {
          client_id: string;
          created_at: string;
          description: string | null;
          diagnostic_id: string | null;
          due_date: string | null;
          expected_result: string | null;
          id: string;
          owner_id: string | null;
          owner_name: string | null;
          pillar: Database["public"]["Enums"]["pillar"] | null;
          position: number;
          priority: Database["public"]["Enums"]["priority"];
          status: Database["public"]["Enums"]["action_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          description?: string | null;
          diagnostic_id?: string | null;
          due_date?: string | null;
          expected_result?: string | null;
          id?: string;
          owner_id?: string | null;
          owner_name?: string | null;
          pillar?: Database["public"]["Enums"]["pillar"] | null;
          position?: number;
          priority?: Database["public"]["Enums"]["priority"];
          status?: Database["public"]["Enums"]["action_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          description?: string | null;
          diagnostic_id?: string | null;
          due_date?: string | null;
          expected_result?: string | null;
          id?: string;
          owner_id?: string | null;
          owner_name?: string | null;
          pillar?: Database["public"]["Enums"]["pillar"] | null;
          position?: number;
          priority?: Database["public"]["Enums"]["priority"];
          status?: Database["public"]["Enums"]["action_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_items_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_items_diagnostic_id_fkey";
            columns: ["diagnostic_id"];
            isOneToOne: false;
            referencedRelation: "diagnostics";
            referencedColumns: ["id"];
          },
        ];
      };
      answers: {
        Row: {
          diagnostic_id: string;
          id: string;
          pillar: Database["public"]["Enums"]["pillar"] | null;
          question_key: string;
          updated_at: string;
          value: Json | null;
        };
        Insert: {
          diagnostic_id: string;
          id?: string;
          pillar?: Database["public"]["Enums"]["pillar"] | null;
          question_key: string;
          updated_at?: string;
          value?: Json | null;
        };
        Update: {
          diagnostic_id?: string;
          id?: string;
          pillar?: Database["public"]["Enums"]["pillar"] | null;
          question_key?: string;
          updated_at?: string;
          value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "answers_diagnostic_id_fkey";
            columns: ["diagnostic_id"];
            isOneToOne: false;
            referencedRelation: "diagnostics";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          category: string | null;
          city: string | null;
          cnpj: string | null;
          company_name: string;
          contact_name: string | null;
          contact_role: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          id: string;
          instagram: string | null;
          notes: string | null;
          owner_id: string | null;
          phone: string | null;
          segment: string | null;
          start_date: string | null;
          state: string | null;
          status: Database["public"]["Enums"]["client_status"];
          trade_name: string | null;
          updated_at: string;
          website: string | null;
          whatsapp: string | null;
        };
        Insert: {
          category?: string | null;
          city?: string | null;
          cnpj?: string | null;
          company_name: string;
          contact_name?: string | null;
          contact_role?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          instagram?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          segment?: string | null;
          start_date?: string | null;
          state?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          trade_name?: string | null;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          category?: string | null;
          city?: string | null;
          cnpj?: string | null;
          company_name?: string;
          contact_name?: string | null;
          contact_role?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          instagram?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          phone?: string | null;
          segment?: string | null;
          start_date?: string | null;
          state?: string | null;
          status?: Database["public"]["Enums"]["client_status"];
          trade_name?: string | null;
          updated_at?: string;
          website?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      diagnostics: {
        Row: {
          analyzed_at: string | null;
          client_id: string;
          created_at: string;
          current_step: number;
          executive_summary: string | null;
          id: string;
          main_bottleneck: Database["public"]["Enums"]["pillar"] | null;
          main_opportunity: string | null;
          overall_score: number | null;
          status: Database["public"]["Enums"]["diagnostic_status"];
          submitted_at: string | null;
          title: string | null;
          token: string;
          updated_at: string;
          validated_at: string | null;
          validated_by: string | null;
        };
        Insert: {
          analyzed_at?: string | null;
          client_id: string;
          created_at?: string;
          current_step?: number;
          executive_summary?: string | null;
          id?: string;
          main_bottleneck?: Database["public"]["Enums"]["pillar"] | null;
          main_opportunity?: string | null;
          overall_score?: number | null;
          status?: Database["public"]["Enums"]["diagnostic_status"];
          submitted_at?: string | null;
          title?: string | null;
          token?: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Update: {
          analyzed_at?: string | null;
          client_id?: string;
          created_at?: string;
          current_step?: number;
          executive_summary?: string | null;
          id?: string;
          main_bottleneck?: Database["public"]["Enums"]["pillar"] | null;
          main_opportunity?: string | null;
          overall_score?: number | null;
          status?: Database["public"]["Enums"]["diagnostic_status"];
          submitted_at?: string | null;
          title?: string | null;
          token?: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "diagnostics_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          metric_key: string;
          period_end: string | null;
          period_start: string | null;
          target_value: number;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          metric_key: string;
          period_end?: string | null;
          period_start?: string | null;
          target_value: number;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          metric_key?: string;
          period_end?: string | null;
          period_start?: string | null;
          target_value?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      marketing_plans: {
        Row: {
          ai_warning: string | null;
          approved_at: string | null;
          approved_by: string | null;
          client_id: string;
          content: Json;
          created_at: string;
          diagnostic_id: string | null;
          id: string;
          status: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          ai_warning?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          client_id: string;
          content?: Json;
          created_at?: string;
          diagnostic_id?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          ai_warning?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          client_id?: string;
          content?: Json;
          created_at?: string;
          diagnostic_id?: string | null;
          id?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "marketing_plans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "marketing_plans_diagnostic_id_fkey";
            columns: ["diagnostic_id"];
            isOneToOne: false;
            referencedRelation: "diagnostics";
            referencedColumns: ["id"];
          },
        ];
      };
      metric_values: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          metric_key: string;
          period_date: string;
          value: number;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          metric_key: string;
          period_date: string;
          value?: number;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          metric_key?: string;
          period_date?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "metric_values_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      pillar_scores: {
        Row: {
          auto_score: number | null;
          change_reason: string | null;
          changed_at: string | null;
          changed_by: string | null;
          created_at: string;
          diagnostic_id: string;
          final_score: number | null;
          id: string;
          notes: string | null;
          opportunities: string[];
          pillar: Database["public"]["Enums"]["pillar"];
          priority: Database["public"]["Enums"]["priority"];
          problems: string[];
          risks: string[];
          strengths: string[];
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          auto_score?: number | null;
          change_reason?: string | null;
          changed_at?: string | null;
          changed_by?: string | null;
          created_at?: string;
          diagnostic_id: string;
          final_score?: number | null;
          id?: string;
          notes?: string | null;
          opportunities?: string[];
          pillar: Database["public"]["Enums"]["pillar"];
          priority?: Database["public"]["Enums"]["priority"];
          problems?: string[];
          risks?: string[];
          strengths?: string[];
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_score?: number | null;
          change_reason?: string | null;
          changed_at?: string | null;
          changed_by?: string | null;
          created_at?: string;
          diagnostic_id?: string;
          final_score?: number | null;
          id?: string;
          notes?: string | null;
          opportunities?: string[];
          pillar?: Database["public"]["Enums"]["pillar"];
          priority?: Database["public"]["Enums"]["priority"];
          problems?: string[];
          risks?: string[];
          strengths?: string[];
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pillar_scores_diagnostic_id_fkey";
            columns: ["diagnostic_id"];
            isOneToOne: false;
            referencedRelation: "diagnostics";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      action_status: "backlog" | "planejado" | "em_andamento" | "concluido";
      app_role: "admin" | "equipe";
      client_status:
        | "lead"
        | "diagnostico_pendente"
        | "diagnostico_em_analise"
        | "cliente_ativo"
        | "pausado"
        | "encerrado";
      diagnostic_status: "pendente" | "em_preenchimento" | "respondido" | "em_analise" | "validado";
      pillar: "produto" | "preco" | "praca" | "promocao" | "performance";
      priority: "alta" | "media" | "baixa";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      action_status: ["backlog", "planejado", "em_andamento", "concluido"],
      app_role: ["admin", "equipe"],
      client_status: [
        "lead",
        "diagnostico_pendente",
        "diagnostico_em_analise",
        "cliente_ativo",
        "pausado",
        "encerrado",
      ],
      diagnostic_status: ["pendente", "em_preenchimento", "respondido", "em_analise", "validado"],
      pillar: ["produto", "preco", "praca", "promocao", "performance"],
      priority: ["alta", "media", "baixa"],
    },
  },
} as const;
