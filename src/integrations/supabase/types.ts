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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json
          sender_id: string
          type: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_folders: {
        Row: {
          collection_id: string
          cover_images: string[]
          created_at: string
          id: string
          legacy_id: number | null
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          cover_images?: string[]
          created_at?: string
          id?: string
          legacy_id?: number | null
          name?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          cover_images?: string[]
          created_at?: string
          id?: string
          legacy_id?: number | null
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_folders_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_places: {
        Row: {
          address: string
          category: string
          collection_id: string
          created_at: string
          folder_id: string | null
          id: string
          image: string
          lat: number
          legacy_id: number | null
          lng: number
          metadata: Json
          name: string
          position: number
          rating: number
          review_count: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          category?: string
          collection_id: string
          created_at?: string
          folder_id?: string | null
          id?: string
          image?: string
          lat?: number
          legacy_id?: number | null
          lng?: number
          metadata?: Json
          name?: string
          position?: number
          rating?: number
          review_count?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          category?: string
          collection_id?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          image?: string
          lat?: number
          legacy_id?: number | null
          lng?: number
          metadata?: Json
          name?: string
          position?: number
          rating?: number
          review_count?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_places_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_places_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "collection_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_images: string[]
          created_at: string
          description: string
          id: string
          is_private: boolean
          item_count: number
          legacy_id: number | null
          position: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_images?: string[]
          created_at?: string
          description?: string
          id?: string
          is_private?: boolean
          item_count?: number
          legacy_id?: number | null
          position?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_images?: string[]
          created_at?: string
          description?: string
          id?: string
          is_private?: boolean
          item_count?: number
          legacy_id?: number | null
          position?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          itinerary_id: string
          legacy_id: number | null
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_id: string
          legacy_id?: number | null
          snapshot?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_id?: string
          legacy_id?: number | null
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          created_at: string
          description: string
          destinations: string[]
          end_date: string | null
          id: string
          images: string[]
          is_public: boolean
          main_tag: string
          participants: string[]
          places_count: number
          price_cents: number | null
          source_dataset_id: number | null
          start_date: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          destinations?: string[]
          end_date?: string | null
          id?: string
          images?: string[]
          is_public?: boolean
          main_tag?: string
          participants?: string[]
          places_count?: number
          price_cents?: number | null
          source_dataset_id?: number | null
          start_date?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          destinations?: string[]
          end_date?: string | null
          id?: string
          images?: string[]
          is_public?: boolean
          main_tag?: string
          participants?: string[]
          places_count?: number
          price_cents?: number | null
          source_dataset_id?: number | null
          start_date?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_activities: {
        Row: {
          category: string
          category_color: string
          created_at: string
          day: number
          end_time: string
          id: string
          image: string
          itinerary_id: string
          lat: number | null
          lng: number | null
          metadata: Json
          name: string
          note_text: string | null
          observation: string | null
          open_hours: string
          position: number
          price: string
          rating: number
          start_time: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          category_color?: string
          created_at?: string
          day: number
          end_time?: string
          id?: string
          image?: string
          itinerary_id: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name?: string
          note_text?: string | null
          observation?: string | null
          open_hours?: string
          position?: number
          price?: string
          rating?: number
          start_time?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          category_color?: string
          created_at?: string
          day?: number
          end_time?: string
          id?: string
          image?: string
          itinerary_id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name?: string
          note_text?: string | null
          observation?: string | null
          open_hours?: string
          position?: number
          price?: string
          rating?: number
          start_time?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_doc_transports: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          chegada_at: string | null
          chegada_hora: string | null
          chegada_minuto: string | null
          client_id: string
          codigo: string | null
          created_at: string
          destino: string
          id: string
          itinerary_id: string
          metadata: Json
          nome: string
          origem: string
          partida_at: string | null
          partida_hora: string | null
          partida_minuto: string | null
          position: number
          tipo: string
          updated_at: string
          user_id: string
          valor: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          chegada_at?: string | null
          chegada_hora?: string | null
          chegada_minuto?: string | null
          client_id: string
          codigo?: string | null
          created_at?: string
          destino?: string
          id?: string
          itinerary_id: string
          metadata?: Json
          nome?: string
          origem?: string
          partida_at?: string | null
          partida_hora?: string | null
          partida_minuto?: string | null
          position?: number
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          chegada_at?: string | null
          chegada_hora?: string | null
          chegada_minuto?: string | null
          client_id?: string
          codigo?: string | null
          created_at?: string
          destino?: string
          id?: string
          itinerary_id?: string
          metadata?: Json
          nome?: string
          origem?: string
          partida_at?: string | null
          partida_hora?: string | null
          partida_minuto?: string | null
          position?: number
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: string | null
        }
        Relationships: []
      }
      itinerary_expenses: {
        Row: {
          amount_cents: number
          assigned_to: string[]
          category: string
          client_id: string
          created_at: string
          currency: string
          description: string
          id: string
          itinerary_id: string
          metadata: Json
          paid_by: string | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          assigned_to?: string[]
          category?: string
          client_id: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          itinerary_id: string
          metadata?: Json
          paid_by?: string | null
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          assigned_to?: string[]
          category?: string
          client_id?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          itinerary_id?: string
          metadata?: Json
          paid_by?: string | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_invites: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          invite_token: string | null
          invitee_user_id: string | null
          inviter_id: string
          itinerary_id: string
          role: Database["public"]["Enums"]["itinerary_role"]
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invitee_user_id?: string | null
          inviter_id: string
          itinerary_id: string
          role?: Database["public"]["Enums"]["itinerary_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_token?: string | null
          invitee_user_id?: string | null
          inviter_id?: string
          itinerary_id?: string
          role?: Database["public"]["Enums"]["itinerary_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Relationships: []
      }
      itinerary_members: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          invited_by: string | null
          itinerary_id: string
          role: Database["public"]["Enums"]["itinerary_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          itinerary_id: string
          role?: Database["public"]["Enums"]["itinerary_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          itinerary_id?: string
          role?: Database["public"]["Enums"]["itinerary_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      itinerary_reservations: {
        Row: {
          atividade_at: string | null
          atividade_hora: string | null
          atividade_minuto: string | null
          attachment_name: string | null
          attachment_path: string | null
          check_in_at: string | null
          check_in_hora: string | null
          check_in_minuto: string | null
          check_out_at: string | null
          check_out_hora: string | null
          check_out_minuto: string | null
          client_id: string
          codigo: string | null
          created_at: string
          id: string
          itinerary_id: string
          localizacao: string
          metadata: Json
          nome: string
          position: number
          tipo: string
          updated_at: string
          user_id: string
          valor: string | null
        }
        Insert: {
          atividade_at?: string | null
          atividade_hora?: string | null
          atividade_minuto?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          check_in_at?: string | null
          check_in_hora?: string | null
          check_in_minuto?: string | null
          check_out_at?: string | null
          check_out_hora?: string | null
          check_out_minuto?: string | null
          client_id: string
          codigo?: string | null
          created_at?: string
          id?: string
          itinerary_id: string
          localizacao?: string
          metadata?: Json
          nome?: string
          position?: number
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: string | null
        }
        Update: {
          atividade_at?: string | null
          atividade_hora?: string | null
          atividade_minuto?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          check_in_at?: string | null
          check_in_hora?: string | null
          check_in_minuto?: string | null
          check_out_at?: string | null
          check_out_hora?: string | null
          check_out_minuto?: string | null
          client_id?: string
          codigo?: string | null
          created_at?: string
          id?: string
          itinerary_id?: string
          localizacao?: string
          metadata?: Json
          nome?: string
          position?: number
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: string | null
        }
        Relationships: []
      }
      itinerary_sales: {
        Row: {
          buyer_id: string
          created_at: string
          fee_cents: number
          gross_cents: number
          id: string
          itinerary_id: string
          net_cents: number
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          fee_cents?: number
          gross_cents?: number
          id?: string
          itinerary_id: string
          net_cents?: number
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          fee_cents?: number
          gross_cents?: number
          id?: string
          itinerary_id?: string
          net_cents?: number
          seller_id?: string
          status?: string
        }
        Relationships: []
      }
      itinerary_transports: {
        Row: {
          cost: string | null
          created_at: string
          day: number
          distance: string | null
          duration: string | null
          id: string
          itinerary_id: string
          metadata: Json
          mode: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: string | null
          created_at?: string
          day: number
          distance?: string | null
          duration?: string | null
          id?: string
          itinerary_id: string
          metadata?: Json
          mode?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: string | null
          created_at?: string
          day?: number
          distance?: string | null
          duration?: string | null
          id?: string
          itinerary_id?: string
          metadata?: Json
          mode?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      profile_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      profile_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string
          bio: string
          birthdate: string
          created_at: string
          email: string
          followers_count: number
          following_count: number
          goals: string[]
          id: string
          instagram: string
          interests: string[]
          location: string
          name: string
          onboarding_completed: boolean
          phone: string
          tiktok: string
          updated_at: string
          user_id: string
          username: string | null
          website: string
          youtube: string
        }
        Insert: {
          avatar_url?: string
          bio?: string
          birthdate?: string
          created_at?: string
          email?: string
          followers_count?: number
          following_count?: number
          goals?: string[]
          id?: string
          instagram?: string
          interests?: string[]
          location?: string
          name?: string
          onboarding_completed?: boolean
          phone?: string
          tiktok?: string
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string
          youtube?: string
        }
        Update: {
          avatar_url?: string
          bio?: string
          birthdate?: string
          created_at?: string
          email?: string
          followers_count?: number
          following_count?: number
          goals?: string[]
          id?: string
          instagram?: string
          interests?: string[]
          location?: string
          name?: string
          onboarding_completed?: boolean
          phone?: string
          tiktok?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string
          youtube?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          followers_count: number | null
          following_count: number | null
          instagram: string | null
          interests: string[] | null
          location: string | null
          name: string | null
          tiktok: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          instagram?: string | null
          interests?: string[] | null
          location?: string | null
          name?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          followers_count?: number | null
          following_count?: number | null
          instagram?: string | null
          interests?: string[] | null
          location?: string | null
          name?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_or_create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
    }
    Enums: {
      invite_status: "pending" | "accepted" | "declined" | "revoked"
      itinerary_role: "editor" | "viewer"
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
      invite_status: ["pending", "accepted", "declined", "revoked"],
      itinerary_role: ["editor", "viewer"],
    },
  },
} as const
