export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          name: string;
          opening_balance_minor: number;
          type: Database["public"]["Enums"]["account_type"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          currency: string;
          id?: string;
          name: string;
          opening_balance_minor?: number;
          type: Database["public"]["Enums"]["account_type"];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          opening_balance_minor?: number;
          type?: Database["public"]["Enums"]["account_type"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          amount_minor: number;
          category_id: string;
          created_at: string;
          currency: string;
          id: string;
          month: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          category_id: string;
          created_at?: string;
          currency: string;
          id?: string;
          month: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          amount_minor?: number;
          category_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          month?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          hidden: boolean;
          icon: string;
          id: string;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          hidden?: boolean;
          icon?: string;
          id?: string;
          kind: Database["public"]["Enums"]["category_kind"];
          name: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          hidden?: boolean;
          icon?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["category_kind"];
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          default_currency: string;
          display_name: string | null;
          id: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_currency?: string;
          display_name?: string | null;
          id: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_currency?: string;
          display_name?: string | null;
          id?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          account_id: string;
          amount_minor: number;
          category_id: string | null;
          category_source: Database["public"]["Enums"]["category_source"];
          created_at: string;
          date: string;
          description: string;
          id: string;
          normalized_description: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_id: string;
          amount_minor: number;
          category_id?: string | null;
          category_source?: Database["public"]["Enums"]["category_source"];
          created_at?: string;
          date: string;
          description: string;
          id?: string;
          normalized_description?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          account_id?: string;
          amount_minor?: number;
          category_id?: string | null;
          category_source?: Database["public"]["Enums"]["category_source"];
          created_at?: string;
          date?: string;
          description?: string;
          id?: string;
          normalized_description?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "account_balances";
            referencedColumns: ["account_id", "user_id"];
          },
          {
            foreignKeyName: "transactions_account_id_user_id_fkey";
            columns: ["account_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_category_id_user_id_fkey";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string | null;
          balance_minor: number | null;
          currency: string | null;
          user_id: string | null;
        };
        Insert: {
          account_id?: string | null;
          balance_minor?: never;
          currency?: string | null;
          user_id?: string | null;
        };
        Update: {
          account_id?: string | null;
          balance_minor?: never;
          currency?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_ai_run: { Args: Record<PropertyKey, never>; Returns: boolean };
      health_check: { Args: Record<PropertyKey, never>; Returns: string };
    };
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "credit_card"
        | "cash"
        | "investment"
        | "loan"
        | "other";
      category_kind: "income" | "expense";
      category_source: "none" | "ai" | "manual";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
      account_type: [
        "checking",
        "savings",
        "credit_card",
        "cash",
        "investment",
        "loan",
        "other",
      ],
      category_kind: ["income", "expense"],
      category_source: ["none", "ai", "manual"],
    },
  },
} as const;
