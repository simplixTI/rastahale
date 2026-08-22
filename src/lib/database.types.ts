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
          // Adicionadas pela migration 007. Sem elas declaradas, o login de
          // instrutor precisava de um cast `any` para compilar.
          login_email: string | null;
          login_password: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["instructors"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["instructors"]["Insert"]>;
        Relationships: [];
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
        // Obrigatórios pelo schema: id, title, duration, category, subcategory,
        // level. Os demais são nullable ou têm default (migration 001).
        Insert: Pick<
          Database["public"]["Tables"]["videos"]["Row"],
          "id" | "title" | "duration" | "category" | "subcategory" | "level"
        > &
          Partial<
            Omit<
              Database["public"]["Tables"]["videos"]["Row"],
              "id" | "title" | "duration" | "category" | "subcategory" | "level"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["videos"]["Row"]>;
        Relationships: [];
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
        Relationships: [];
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
        // Só id, email e name são obrigatórios; o resto tem default no banco
        // (migration 001). Exigir tudo fazia o insert de um perfil novo, que
        // manda apenas esses três campos, não compilar.
        Insert: Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "name"> &
          Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "name">>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
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
        Relationships: [];
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
        // progress, watched, is_favorite e last_watched_at têm default no banco:
        // marcar um vídeo como favorito não precisa enviar progresso, e vice-versa.
        Insert: Pick<Database["public"]["Tables"]["user_progress"]["Row"], "user_id" | "video_id"> &
          Partial<Omit<Database["public"]["Tables"]["user_progress"]["Row"], "user_id" | "video_id">>;
        Update: Partial<Database["public"]["Tables"]["user_progress"]["Row"]>;
        Relationships: [];
      };
      // Tabelas abaixo derivadas das migrations 008 a 012. Sem elas, o cliente
      // tipado do Supabase resolvia .from("modules") e afins como `never`, e o
      // erro cascateava por todos os hooks que as consultam.
      modules: {
        Row: {
          id: string;
          name: string;
          category: "jiu-jitsu" | "luta-livre";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["modules"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [];
      };
      modalities: {
        Row: {
          id: string;
          label: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["modalities"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["modalities"]["Insert"]>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          ends_at: string | null;
          prize_text: string;
          prize_code: string;
          started_at: string;
          baselines: Json;
          winner_id: string | null;
          winner_name: string | null;
          awarded_at: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["seasons"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Row"]>;
        Relationships: [];
      };
      store_banners: {
        Row: {
          id: string;
          image_url: string;
          link_url: string | null;
          sort_order: number;
          created_at: string;
        };
        // id e created_at têm default no banco.
        Insert: Omit<Database["public"]["Tables"]["store_banners"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_banners"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      // View da migration 011: projeção de profiles com role = 'user'.
      leaderboard: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          videos_watched: number;
        };
        Relationships: [];
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
