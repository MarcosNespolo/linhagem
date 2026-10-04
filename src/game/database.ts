/**
 * Tipos das tabelas do jogo no Supabase, no formato que o `supabase gen types` gera. O projeto é
 * compartilhado com outros projetos pessoais, então aqui ficam só as tabelas do Linhagem.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      linhagem_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      linhagem_saves: {
        Row: {
          device_id: string | null
          game_time_seconds: number
          previous_state: Json | null
          revision: number
          saved_at: string
          schema_version: number
          state: Json
          user_id: string
        }
        Insert: {
          device_id?: string | null
          game_time_seconds?: number
          previous_state?: Json | null
          revision?: number
          saved_at?: string
          schema_version: number
          state: Json
          user_id: string
        }
        Update: {
          device_id?: string | null
          game_time_seconds?: number
          previous_state?: Json | null
          revision?: number
          saved_at?: string
          schema_version?: number
          state?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
