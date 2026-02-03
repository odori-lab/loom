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
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      looms: {
        Row: {
          id: string
          user_id: string
          thread_username: string
          thread_display_name: string | null
          post_count: number
          pdf_path: string
          cover_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          thread_username: string
          thread_display_name?: string | null
          post_count: number
          pdf_path: string
          cover_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          thread_username?: string
          thread_display_name?: string | null
          post_count?: number
          pdf_path?: string
          cover_data?: Json | null
          created_at?: string
        }
      }
    }
  }
}
