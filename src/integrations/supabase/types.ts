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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          attachments: string[] | null
          author_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          author_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admin_user_passwords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_deals: {
        Row: {
          affiliate_id: string
          country: string
          cpa_usd: number
          created_at: string
          created_by: string | null
          crg_pct: number
          funnel: string
          id: string
          max_invalid_pct: number | null
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          country: string
          cpa_usd: number
          created_at?: string
          created_by?: string | null
          crg_pct?: number
          funnel: string
          id?: string
          max_invalid_pct?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          country?: string
          cpa_usd?: number
          created_at?: string
          created_by?: string | null
          crg_pct?: number
          funnel?: string
          id?: string
          max_invalid_pct?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_deals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_deals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_balances"
            referencedColumns: ["affiliate_id"]
          },
        ]
      }
      affiliate_topups: {
        Row: {
          affiliate_id: string
          amount_usd: number
          created_at: string
          created_by: string | null
          fees_pct: number
          id: string
          notes: string | null
          reference: string | null
          sent_at: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount_usd: number
          created_at?: string
          created_by?: string | null
          fees_pct?: number
          id?: string
          notes?: string | null
          reference?: string | null
          sent_at?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount_usd?: number
          created_at?: string
          created_by?: string | null
          fees_pct?: number
          id?: string
          notes?: string | null
          reference?: string | null
          sent_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_topups_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_topups_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_balances"
            referencedColumns: ["affiliate_id"]
          },
        ]
      }
      affiliates: {
        Row: {
          allowed_ips: string[]
          api_key: string
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          password: string | null
          status: string
          telegram_group_id: string | null
          username: string | null
          visible_fields: Json
        }
        Insert: {
          allowed_ips?: string[]
          api_key?: string
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          password?: string | null
          status?: string
          telegram_group_id?: string | null
          username?: string | null
          visible_fields?: Json
        }
        Update: {
          allowed_ips?: string[]
          api_key?: string
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          password?: string | null
          status?: string
          telegram_group_id?: string | null
          username?: string | null
          visible_fields?: Json
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          agent_id: string | null
          agent_response: string | null
          alternate_at: string | null
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          preferred_at: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_response?: string | null
          alternate_at?: string | null
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          preferred_at: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_response?: string | null
          alternate_at?: string | null
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          preferred_at?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          agent_id: string
          client_id: string | null
          color: string | null
          created_at: string
          description: string | null
          end_at: string
          id: string
          notifications_enabled: boolean
          notify_agent: boolean
          notify_client: boolean
          reminded: boolean
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          notifications_enabled?: boolean
          notify_agent?: boolean
          notify_client?: boolean
          reminded?: boolean
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          client_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          notifications_enabled?: boolean
          notify_agent?: boolean
          notify_client?: boolean
          reminded?: boolean
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          enabled: boolean
          icon_url: string | null
          id: string
          leverage_max: number
          market_days: number[] | null
          market_hours_end: string | null
          market_hours_start: string | null
          name: string
          symbol: string
          type: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          icon_url?: string | null
          id?: string
          leverage_max?: number
          market_days?: number[] | null
          market_hours_end?: string | null
          market_hours_start?: string | null
          name: string
          symbol: string
          type?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          icon_url?: string | null
          id?: string
          leverage_max?: number
          market_days?: number[] | null
          market_hours_end?: string | null
          market_hours_start?: string | null
          name?: string
          symbol?: string
          type?: string
        }
        Relationships: []
      }
      backup_runs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          tables_backed_up: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tables_backed_up?: number
          total_rows?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tables_backed_up?: number
          total_rows?: number
        }
        Relationships: []
      }
      blocked_email_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip: string
          reason: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip: string
          reason: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip?: string
          reason?: string
        }
        Relationships: []
      }
      btc_address_pool: {
        Row: {
          address: string
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          currency: string
          external_id: string | null
          id: string
          is_used: boolean
          label: string | null
          network: string
        }
        Insert: {
          address: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_id?: string | null
          id?: string
          is_used?: boolean
          label?: string | null
          network?: string
        }
        Update: {
          address?: string
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          external_id?: string | null
          id?: string
          is_used?: boolean
          label?: string | null
          network?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          file_url: string | null
          id: string
          room_id: string
          sender_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          room_id: string
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          room_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: []
      }
      chat_room_reads: {
        Row: {
          last_read_at: string
          room_id: string
          staff_id: string
        }
        Insert: {
          last_read_at?: string
          room_id: string
          staff_id: string
        }
        Update: {
          last_read_at?: string
          room_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_reads_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          agent_id: string | null
          client_last_read_at: string | null
          created_at: string
          id: string
          mode: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          client_last_read_at?: string | null
          created_at?: string
          id?: string
          mode?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          client_last_read_at?: string | null
          created_at?: string
          id?: string
          mode?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_bank_details: {
        Row: {
          account_holder: string
          bank_name: string
          created_at: string
          iban: string
          id: string
          notes: string | null
          reference: string | null
          swift_bic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string
          bank_name?: string
          created_at?: string
          iban?: string
          id?: string
          notes?: string | null
          reference?: string | null
          swift_bic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          bank_name?: string
          created_at?: string
          iban?: string
          id?: string
          notes?: string | null
          reference?: string | null
          swift_bic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_bank_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_user_passwords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_bank_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_crypto_addresses: {
        Row: {
          address: string
          created_at: string
          currency: string
          id: string
          label: string | null
          last_checked_at: string | null
          network: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          currency: string
          id?: string
          label?: string | null
          last_checked_at?: string | null
          network?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          currency?: string
          id?: string
          label?: string | null
          last_checked_at?: string | null
          network?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_crypto_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_passwords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_crypto_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_email_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          sender_name: string | null
          sender_user_id: string | null
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          sender_name?: string | null
          sender_user_id?: string | null
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          sender_name?: string | null
          sender_user_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_email_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "client_email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_email_threads: {
        Row: {
          agent_email: string | null
          agent_name: string | null
          agent_unread_count: number
          agent_user_id: string | null
          body_text: string
          client_email: string
          client_name: string | null
          client_user_id: string
          created_at: string
          from_address: string | null
          from_label: string | null
          id: string
          last_reply_at: string | null
          reply_token: string
          subject: string
          updated_at: string
        }
        Insert: {
          agent_email?: string | null
          agent_name?: string | null
          agent_unread_count?: number
          agent_user_id?: string | null
          body_text: string
          client_email: string
          client_name?: string | null
          client_user_id: string
          created_at?: string
          from_address?: string | null
          from_label?: string | null
          id?: string
          last_reply_at?: string | null
          reply_token?: string
          subject: string
          updated_at?: string
        }
        Update: {
          agent_email?: string | null
          agent_name?: string | null
          agent_unread_count?: number
          agent_user_id?: string | null
          body_text?: string
          client_email?: string
          client_name?: string | null
          client_user_id?: string
          created_at?: string
          from_address?: string | null
          from_label?: string | null
          id?: string
          last_reply_at?: string | null
          reply_token?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_page_visits: {
        Row: {
          id: string
          path: string
          title: string | null
          user_id: string
          visited_at: string
        }
        Insert: {
          id?: string
          path: string
          title?: string | null
          user_id: string
          visited_at?: string
        }
        Update: {
          id?: string
          path?: string
          title?: string | null
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_page_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_passwords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_page_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copied_trades: {
        Row: {
          created_at: string | null
          id: string
          source_trade_id: string | null
          status: string | null
          subscription_id: string
          trade_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_trade_id?: string | null
          status?: string | null
          subscription_id: string
          trade_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_trade_id?: string | null
          status?: string | null
          subscription_id?: string
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copied_trades_source_trade_id_fkey"
            columns: ["source_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copied_trades_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "copy_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copied_trades_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_subscriptions: {
        Row: {
          created_at: string | null
          fixed_amount: number | null
          id: string
          invested_capital: number
          is_active: boolean | null
          last_trade_at: string | null
          mode: string
          next_trade_at: string | null
          trader_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          invested_capital?: number
          is_active?: boolean | null
          last_trade_at?: string | null
          mode?: string
          next_trade_at?: string | null
          trader_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          fixed_amount?: number | null
          id?: string
          invested_capital?: number
          is_active?: boolean | null
          last_trade_at?: string | null
          mode?: string
          next_trade_at?: string | null
          trader_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_subscriptions_trader_id_fkey"
            columns: ["trader_id"]
            isOneToOne: false
            referencedRelation: "copy_traders"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_traders: {
        Row: {
          allowed_asset_types: string[]
          allowed_symbols: string[]
          avatar_url: string | null
          created_at: string | null
          description: string | null
          display_name: string
          followers_count: number | null
          id: string
          is_admin_managed: boolean | null
          is_visible: boolean | null
          total_pnl: number | null
          total_trades: number | null
          user_id: string | null
          win_rate: number | null
        }
        Insert: {
          allowed_asset_types?: string[]
          allowed_symbols?: string[]
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          followers_count?: number | null
          id?: string
          is_admin_managed?: boolean | null
          is_visible?: boolean | null
          total_pnl?: number | null
          total_trades?: number | null
          user_id?: string | null
          win_rate?: number | null
        }
        Update: {
          allowed_asset_types?: string[]
          allowed_symbols?: string[]
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          followers_count?: number | null
          id?: string
          is_admin_managed?: boolean | null
          is_visible?: boolean | null
          total_pnl?: number | null
          total_trades?: number | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      crypto_inbound_tx: {
        Row: {
          address: string
          amount: number
          block_time: string | null
          confirmations: number
          currency: string
          deposit_id: string | null
          detected_at: string
          id: string
          network: string
          raw: Json | null
          status: string
          tx_hash: string
          user_id: string | null
        }
        Insert: {
          address: string
          amount: number
          block_time?: string | null
          confirmations?: number
          currency: string
          deposit_id?: string | null
          detected_at?: string
          id?: string
          network: string
          raw?: Json | null
          status?: string
          tx_hash: string
          user_id?: string | null
        }
        Update: {
          address?: string
          amount?: number
          block_time?: string | null
          confirmations?: number
          currency?: string
          deposit_id?: string | null
          detected_at?: string
          id?: string
          network?: string
          raw?: Json | null
          status?: string
          tx_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crypto_wallet_requests: {
        Row: {
          agent_id: string
          asset: string
          created_at: string
          exchange: string
          fulfilled_at: string | null
          id: string
          network: string | null
          status: string
          telegram_message_id: number | null
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          agent_id: string
          asset: string
          created_at?: string
          exchange: string
          fulfilled_at?: string | null
          id?: string
          network?: string | null
          status?: string
          telegram_message_id?: number | null
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          agent_id?: string
          asset?: string
          created_at?: string
          exchange?: string
          fulfilled_at?: string | null
          id?: string
          network?: string | null
          status?: string
          telegram_message_id?: number | null
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          method: string
          network: string | null
          processed_by: string | null
          proof_url: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          network?: string | null
          processed_by?: string | null
          proof_url?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          method?: string
          network?: string | null
          processed_by?: string | null
          proof_url?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      internal_secrets: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          admin_notes: string | null
          created_at: string
          document_type: string
          file_url: string
          id: string
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      news: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_admin_post: boolean
          published_at: string
          source: string | null
          source_url: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin_post?: boolean
          published_at?: string
          source?: string | null
          source_url?: string | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin_post?: boolean
          published_at?: string
          source?: string | null
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          priority: number
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          priority?: number
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          priority?: number
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_link_presets: {
        Row: {
          amount: number
          created_at: string
          currency: string
          enabled: boolean
          id: string
          label: string | null
          provider: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          label?: string | null
          provider?: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          enabled?: boolean
          id?: string
          label?: string | null
          provider?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      payment_link_requests: {
        Row: {
          agent_id: string
          amount: number
          country: string | null
          created_at: string
          currency: string
          fulfilled_at: string | null
          full_name: string
          id: string
          payment_link: string | null
          status: string
          telegram_message_id: number | null
          user_id: string
        }
        Insert: {
          agent_id: string
          amount: number
          country?: string | null
          created_at?: string
          currency?: string
          fulfilled_at?: string | null
          full_name: string
          id?: string
          payment_link?: string | null
          status?: string
          telegram_message_id?: number | null
          user_id: string
        }
        Update: {
          agent_id?: string
          amount?: number
          country?: string | null
          created_at?: string
          currency?: string
          fulfilled_at?: string | null
          full_name?: string
          id?: string
          payment_link?: string | null
          status?: string
          telegram_message_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pending_retention: {
        Row: {
          amount: number
          bank: string | null
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string | null
          provider: string | null
          sent_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          provider?: string | null
          sent_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string | null
          provider?: string | null
          sent_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_retention_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "admin_user_passwords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_retention_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          id: string
          key: string
          label: string
        }
        Insert: {
          category: string
          id?: string
          key: string
          label: string
        }
        Update: {
          category?: string
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      phone_call_log: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string
          disposition: string | null
          duration_seconds: number | null
          id: string
          pbx_call_id: string | null
          pbx_uniqueid: string | null
          phone_number: string
          prefix: string | null
          recording_available: boolean
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string
          disposition?: string | null
          duration_seconds?: number | null
          id?: string
          pbx_call_id?: string | null
          pbx_uniqueid?: string | null
          phone_number: string
          prefix?: string | null
          recording_available?: boolean
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string
          disposition?: string | null
          duration_seconds?: number | null
          id?: string
          pbx_call_id?: string | null
          pbx_uniqueid?: string | null
          phone_number?: string
          prefix?: string | null
          recording_available?: boolean
        }
        Relationships: []
      }
      phone_prefix_roles: {
        Row: {
          prefix_id: string
          role_id: string
        }
        Insert: {
          prefix_id: string
          role_id: string
        }
        Update: {
          prefix_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_prefix_roles_prefix_id_fkey"
            columns: ["prefix_id"]
            isOneToOne: false
            referencedRelation: "phone_prefixes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_prefix_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_prefixes: {
        Row: {
          country_code: string
          created_at: string
          id: string
          label: string
          phone_number: string | null
          prefix: string
          sort_order: number
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          label: string
          phone_number?: string | null
          prefix: string
          sort_order?: number
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          label?: string
          phone_number?: string | null
          prefix?: string
          sort_order?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          asset_id: string
          created_at: string
          direction: string
          id: string
          target_price: number
          triggered: boolean
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          direction?: string
          id?: string
          target_price: number
          triggered?: boolean
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          direction?: string
          id?: string
          target_price?: number
          triggered?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_cache: {
        Row: {
          id: string
          price: number
          source: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          id?: string
          price: number
          source?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          id?: string
          price?: number
          source?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_approved: boolean
          account_tier: number
          account_type: string
          admin_visible_password: string | null
          affiliate: string | null
          assigned_agent: string | null
          assigned_at: string | null
          auto_login_expires_at: string | null
          auto_login_token: string | null
          avatar_url: string | null
          being_called: boolean
          country: string | null
          created_at: string
          created_via_affiliate_api: boolean
          current_page: string | null
          current_page_since: string | null
          display_id: number
          email: string | null
          email_notifications: boolean | null
          first_deposit_at: string | null
          force_chat_open: boolean
          force_home_redirect: boolean
          force_redirect_url: string | null
          ftd_agent: string | null
          full_name: string | null
          funnel: string | null
          id: string
          is_lead: boolean | null
          kyc_status: string | null
          last_seen_at: string | null
          original_email: string | null
          pbx_extension: string | null
          phone: string | null
          secondary_phone: string | null
          shaved_from: string | null
          shaved_to: string | null
          status: string | null
          thomas_notified_at: string | null
          timezone: string | null
          two_factor_enabled: boolean | null
          updated_at: string
          verification_code: string
        }
        Insert: {
          access_approved?: boolean
          account_tier?: number
          account_type?: string
          admin_visible_password?: string | null
          affiliate?: string | null
          assigned_agent?: string | null
          assigned_at?: string | null
          auto_login_expires_at?: string | null
          auto_login_token?: string | null
          avatar_url?: string | null
          being_called?: boolean
          country?: string | null
          created_at?: string
          created_via_affiliate_api?: boolean
          current_page?: string | null
          current_page_since?: string | null
          display_id?: number
          email?: string | null
          email_notifications?: boolean | null
          first_deposit_at?: string | null
          force_chat_open?: boolean
          force_home_redirect?: boolean
          force_redirect_url?: string | null
          ftd_agent?: string | null
          full_name?: string | null
          funnel?: string | null
          id: string
          is_lead?: boolean | null
          kyc_status?: string | null
          last_seen_at?: string | null
          original_email?: string | null
          pbx_extension?: string | null
          phone?: string | null
          secondary_phone?: string | null
          shaved_from?: string | null
          shaved_to?: string | null
          status?: string | null
          thomas_notified_at?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          verification_code?: string
        }
        Update: {
          access_approved?: boolean
          account_tier?: number
          account_type?: string
          admin_visible_password?: string | null
          affiliate?: string | null
          assigned_agent?: string | null
          assigned_at?: string | null
          auto_login_expires_at?: string | null
          auto_login_token?: string | null
          avatar_url?: string | null
          being_called?: boolean
          country?: string | null
          created_at?: string
          created_via_affiliate_api?: boolean
          current_page?: string | null
          current_page_since?: string | null
          display_id?: number
          email?: string | null
          email_notifications?: boolean | null
          first_deposit_at?: string | null
          force_chat_open?: boolean
          force_home_redirect?: boolean
          force_redirect_url?: string | null
          ftd_agent?: string | null
          full_name?: string | null
          funnel?: string | null
          id?: string
          is_lead?: boolean | null
          kyc_status?: string | null
          last_seen_at?: string | null
          original_email?: string | null
          pbx_extension?: string | null
          phone?: string | null
          secondary_phone?: string | null
          shaved_from?: string | null
          shaved_to?: string | null
          status?: string | null
          thomas_notified_at?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          verification_code?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number | null
          created_at: string
          deposit_id: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_amount?: number | null
          created_at?: string
          deposit_id?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_amount?: number | null
          created_at?: string
          deposit_id?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      report_settings: {
        Row: {
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          last_sent_at: string | null
          sections: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          sections?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_sent_at?: string | null
          sections?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_user_passwords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      sheets_ftd_log: {
        Row: {
          created_at: string
          deposit_id: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          tab_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deposit_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          tab_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deposit_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          tab_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signup_ip_log: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip?: string
        }
        Relationships: []
      }
      staff_tasks: {
        Row: {
          admin_notes: string | null
          admin_unread: boolean
          assigned_to: string | null
          attachments: string[]
          completed_at: string | null
          created_at: string
          created_by: string
          creator_unread: boolean
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_unread?: boolean
          assigned_to?: string | null
          attachments?: string[]
          completed_at?: string | null
          created_at?: string
          created_by: string
          creator_unread?: boolean
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_unread?: boolean
          assigned_to?: string | null
          attachments?: string[]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          creator_unread?: boolean
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staking_plans: {
        Row: {
          apy: number
          asset: string
          created_at: string
          enabled: boolean
          id: string
          lock_period_days: number
          min_amount: number
          name: string
        }
        Insert: {
          apy: number
          asset: string
          created_at?: string
          enabled?: boolean
          id?: string
          lock_period_days: number
          min_amount?: number
          name: string
        }
        Update: {
          apy?: number
          asset?: string
          created_at?: string
          enabled?: boolean
          id?: string
          lock_period_days?: number
          min_amount?: number
          name?: string
        }
        Relationships: []
      }
      stripe_checkout_intents: {
        Row: {
          amount_eur: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          source: string | null
          status: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_eur: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          source?: string | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_eur?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          source?: string | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      swaps: {
        Row: {
          amount: number
          created_at: string
          from_currency: string
          id: string
          received_amount: number | null
          to_currency: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_currency: string
          id?: string
          received_amount?: number | null
          to_currency: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_currency?: string
          id?: string
          received_amount?: number | null
          to_currency?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          team_id: string
          user_id: string
        }
        Insert: {
          team_id: string
          user_id: string
        }
        Update: {
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: []
      }
      telegram_expenses: {
        Row: {
          amount_usd: number
          chat_id: string
          created_at: string
          id: string
          label: string
          raw_text: string | null
          sent_at: string
          telegram_message_id: number
        }
        Insert: {
          amount_usd: number
          chat_id: string
          created_at?: string
          id?: string
          label?: string
          raw_text?: string | null
          sent_at?: string
          telegram_message_id: number
        }
        Update: {
          amount_usd?: number
          chat_id?: string
          created_at?: string
          id?: string
          label?: string
          raw_text?: string | null
          sent_at?: string
          telegram_message_id?: number
        }
        Relationships: []
      }
      telegram_message_log: {
        Row: {
          chat_id: string
          created_at: string
          error_message: string | null
          id: string
          message_preview: string | null
          metadata: Json | null
          notification_type: string
          status: string
          telegram_message_id: number | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          notification_type: string
          status?: string
          telegram_message_id?: number | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_preview?: string | null
          metadata?: Json | null
          notification_type?: string
          status?: string
          telegram_message_id?: number | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
          is_default: boolean
          rating: number
          visible: boolean
        }
        Insert: {
          author: string
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          rating?: number
          visible?: boolean
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          rating?: number
          visible?: boolean
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_trade_limits: {
        Row: {
          daily_copy_trade_limit: number | null
          daily_trade_limit: number | null
          tier: string
          updated_at: string
          yield_max_pct: number | null
          yield_min_pct: number | null
        }
        Insert: {
          daily_copy_trade_limit?: number | null
          daily_trade_limit?: number | null
          tier: string
          updated_at?: string
          yield_max_pct?: number | null
          yield_min_pct?: number | null
        }
        Update: {
          daily_copy_trade_limit?: number | null
          daily_trade_limit?: number | null
          tier?: string
          updated_at?: string
          yield_max_pct?: number | null
          yield_min_pct?: number | null
        }
        Relationships: []
      }
      trade_overrides: {
        Row: {
          applied_by: string | null
          created_at: string
          finish_at: string | null
          id: string
          is_active: boolean
          override_mode: string
          target_value: number | null
          trade_id: string
          updated_at: string
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          finish_at?: string | null
          id?: string
          is_active?: boolean
          override_mode?: string
          target_value?: number | null
          trade_id: string
          updated_at?: string
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          finish_at?: string | null
          id?: string
          is_active?: boolean
          override_mode?: string
          target_value?: number | null
          trade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_overrides_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: true
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          asset_id: string
          closed_at: string | null
          current_price: number | null
          direction: string
          display_id: number
          entry_price: number
          id: string
          leverage: number
          opened_at: string
          order_type: string
          pnl: number | null
          size: number
          status: string
          stop_loss: number | null
          take_profit: number | null
          user_id: string
        }
        Insert: {
          asset_id: string
          closed_at?: string | null
          current_price?: number | null
          direction?: string
          display_id?: number
          entry_price: number
          id?: string
          leverage?: number
          opened_at?: string
          order_type?: string
          pnl?: number | null
          size: number
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          user_id: string
        }
        Update: {
          asset_id?: string
          closed_at?: string | null
          current_price?: number | null
          direction?: string
          display_id?: number
          entry_price?: number
          id?: string
          leverage?: number
          opened_at?: string
          order_type?: string
          pnl?: number | null
          size?: number
          status?: string
          stop_loss?: number | null
          take_profit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stakes: {
        Row: {
          amount: number
          claimed: boolean | null
          id: string
          plan_id: string
          rewards_earned: number | null
          started_at: string
          unlocks_at: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed?: boolean | null
          id?: string
          plan_id: string
          rewards_earned?: number | null
          started_at?: string
          unlocks_at: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed?: boolean | null
          id?: string
          plan_id?: string
          rewards_earned?: number | null
          started_at?: string
          unlocks_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stakes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "staking_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_bank_accounts: {
        Row: {
          account_holder: string
          bank_name: string
          bic: string | null
          country: string
          created_at: string
          created_by: string | null
          enabled: boolean
          iban: string
          id: string
          label: string | null
          reference: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_holder: string
          bank_name: string
          bic?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          iban: string
          id?: string
          label?: string | null
          reference?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_holder?: string
          bank_name?: string
          bic?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          iban?: string
          id?: string
          label?: string | null
          reference?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      welcome_page_visits: {
        Row: {
          country: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          landed_at: string
          left_at: string | null
          referrer: string | null
          time_spent_seconds: number | null
          timer_expired: boolean | null
          user_agent: string | null
          user_id: string | null
          visitor_email: string | null
          visitor_name: string | null
        }
        Insert: {
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          landed_at?: string
          left_at?: string | null
          referrer?: string | null
          time_spent_seconds?: number | null
          timer_expired?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
        }
        Update: {
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          landed_at?: string
          left_at?: string | null
          referrer?: string | null
          time_spent_seconds?: number | null
          timer_expired?: boolean | null
          user_agent?: string | null
          user_id?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          destination: string | null
          id: string
          method: string
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          method?: string
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          destination?: string | null
          id?: string
          method?: string
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_user_passwords: {
        Row: {
          admin_visible_password: string | null
          id: string | null
        }
        Insert: {
          admin_visible_password?: string | null
          id?: string | null
        }
        Update: {
          admin_visible_password?: string | null
          id?: string | null
        }
        Relationships: []
      }
      v_affiliate_balances: {
        Row: {
          affiliate_id: string | null
          affiliate_name: string | null
          balance_usd: number | null
          billable_ftds: number | null
          cpa_after_shave: number | null
          cpa_before_shave: number | null
          shaved_ftds: number | null
          spent_usd: number | null
          total_topups: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      affiliate_crg_check: {
        Args: { _profile_id: string }
        Returns: {
          affiliate_id: string
          affiliate_name: string
          country: string
          cpa_usd: number
          crg_pct: number
          deal_id: string
          effective_leads: number
          funnel: string
          guaranteed: number
          max_invalid_pct: number
          week_ftds: number
          week_invalids: number
          week_leads: number
          would_exceed: boolean
        }[]
      }
      affiliate_period_stats: {
        Args: {
          _affiliate_id: string
          _from: string
          _include_shaved?: boolean
          _to: string
        }
        Returns: {
          counted_invalids: number
          country: string
          cpa_usd: number
          crg_pct: number
          effective_leads: number
          extra_owed: number
          ftds: number
          funnel: string
          guaranteed: number
          invalids: number
          leads: number
          max_invalid_pct: number
          period_charge: number
        }[]
      }
      affiliate_weekly_stats: {
        Args: { _affiliate_id: string; _include_shaved?: boolean }
        Returns: {
          counted_invalids: number
          country: string
          cpa_usd: number
          crg_pct: number
          effective_leads: number
          extra_owed: number
          ftds: number
          funnel: string
          guaranteed: number
          invalids: number
          leads: number
          max_invalid_pct: number
          week_charge: number
          week_start: string
        }[]
      }
      backup_auth_password_hashes: {
        Args: never
        Returns: {
          created_at: string
          email: string
          encrypted_password: string
          id: string
        }[]
      }
      can_view_all_trades: { Args: { _user_id: string }; Returns: boolean }
      copy_user_password: {
        Args: { _source_user_id: string; _target_user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_verification_code: { Args: never; Returns: string }
      get_email_thread_by_token: {
        Args: { _token: string }
        Returns: {
          agent_email: string
          agent_name: string
          body_text: string
          client_email: string
          client_name: string
          created_at: string
          replies: Json
          subject: string
          thread_id: string
        }[]
      }
      get_followup_status: {
        Args: { _scope?: string }
        Returns: {
          agent_id: string
          agent_name: string
          customer_id: string
          display_id: number
          email: string
          full_name: string
          has_comment: boolean
          hours_since: number
          is_lead: boolean
          last_activity_at: string
          status: string
        }[]
      }
      get_my_account_manager: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          phone: string
        }[]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role_by_name: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      is_agent_like: { Args: { _user_id: string }; Returns: boolean }
      is_conversion_only: { Args: { _user_id: string }; Returns: boolean }
      is_staff_member: { Args: { _user_id: string }; Returns: boolean }
      is_thomas_full_access: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      open_trade_atomic: {
        Args: {
          p_asset_id: string
          p_direction: string
          p_entry_price: number
          p_leverage: number
          p_order_type?: string
          p_size: number
          p_stop_loss?: number
          p_take_profit?: number
          p_user_id: string
        }
        Returns: {
          entry_price: number
          trade_id: string
          wallet_balance: number
        }[]
      }
      parse_bonus_note: {
        Args: { _content: string }
        Returns: {
          amount: number
          currency: string
        }[]
      }
      post_client_reply_by_token: {
        Args: { _body: string; _token: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      restore_auth_password_hash: {
        Args: { _hash: string; _user_id: string }
        Returns: undefined
      }
      subscribe_copy_trader: {
        Args: { _amount: number; _mode?: string; _trader_id: string }
        Returns: string
      }
      swap_verification_codes: {
        Args: { _new_id: string; _orig_id: string }
        Returns: string
      }
      trigger_backup_to_sheets: { Args: never; Returns: undefined }
      unsubscribe_copy_trader: {
        Args: { _subscription_id: string }
        Returns: undefined
      }
      update_copy_subscription_capital: {
        Args: {
          _new_capital: number
          _new_mode: string
          _subscription_id: string
        }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
