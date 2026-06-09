export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      instructors: {
        Row: {
          id: string;
          name: string;
          avatar_url: string;
          bio: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["instructors"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["instructors"]["Insert"]>;
      };
      videos: {
        Row: {
          id: string;
          title: string;
          description: string;
          thumbnail: string;
          video_url: string | null;
          duration: string;
          category: "jiu-jitsu" | "luta-livre";
          subcategory: string;
          level: "Iniciante" | "Intermediário" | "Avançado";
          instructor_id: string;
          visible: boolean;
          unlock_by_progress: boolean;
          required_progress: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["videos"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["videos"]["Insert"]>;
      };
      plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          interval: "mensal" | "trimestral" | "anual";
          features: string[];
          active: boolean;
          categories: string[];
          max_level: "Iniciante" | "Intermediário" | "Avançado";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["plans"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string;
          plan_name: string;
          status: "ativo" | "inativo" | "pendente";
          role: "user" | "admin";
          join_date: string;
          last_access: string;
          videos_watched: number;
          total_hours: number;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], never>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          amount: number;
          method: "PIX" | "Cartão" | "Boleto";
          status: "pago" | "pendente" | "falhou";
          date: string;
          plan_name: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          progress: number;
          watched: boolean;
          is_favorite: boolean;
          last_watched_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_progress"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["user_progress"]["Insert"]>;
      };
    };
    Functions: {
      get_user_overall_progress: {
        Args: { p_user_id: string };
        Returns: number;
      };
    };
  };
}
