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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_id: number
          alert_message: string
          alert_title: string
          alert_type: string
          created_at: string | null
          current_value: number | null
          expires_at: string | null
          is_read: boolean | null
          is_resolved: boolean | null
          product_id: number | null
          read_at: string | null
          read_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          threshold_value: number | null
        }
        Insert: {
          alert_id?: number
          alert_message: string
          alert_title: string
          alert_type: string
          created_at?: string | null
          current_value?: number | null
          expires_at?: string | null
          is_read?: boolean | null
          is_resolved?: boolean | null
          product_id?: number | null
          read_at?: string | null
          read_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          threshold_value?: number | null
        }
        Update: {
          alert_id?: number
          alert_message?: string
          alert_title?: string
          alert_type?: string
          created_at?: string | null
          current_value?: number | null
          expires_at?: string | null
          is_read?: boolean | null
          is_resolved?: boolean | null
          product_id?: number | null
          read_at?: string | null
          read_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "alerts_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          ip_address: string | null
          log_id: number
          new_values: Json | null
          old_values: Json | null
          record_id: number | null
          table_affected: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          ip_address?: string | null
          log_id?: number
          new_values?: Json | null
          old_values?: Json | null
          record_id?: number | null
          table_affected?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          ip_address?: string | null
          log_id?: number
          new_values?: Json | null
          old_values?: Json | null
          record_id?: number | null
          table_affected?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_id: number
          category_name: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          parent_category_id: number | null
        }
        Insert: {
          category_id?: number
          category_name: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          parent_category_id?: number | null
        }
        Update: {
          category_id?: number
          category_name?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          parent_category_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          is_visible: boolean | null
          position: number
          settings: Json | null
          size: string | null
          user_id: string
          widget_id: number
          widget_type: string
        }
        Insert: {
          is_visible?: boolean | null
          position: number
          settings?: Json | null
          size?: string | null
          user_id: string
          widget_id?: number
          widget_type: string
        }
        Update: {
          is_visible?: boolean | null
          position?: number
          settings?: Json | null
          size?: string | null
          user_id?: string
          widget_id?: number
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          accuracy_percentage: number | null
          actual_quantity: number | null
          actual_revenue: number | null
          confidence_lower: number | null
          confidence_upper: number | null
          forecast_date: string
          forecast_id: number
          forecast_period: string
          generated_at: string | null
          mae: number | null
          model_version: string | null
          predicted_quantity: number
          predicted_revenue: number | null
          product_id: number
          rmse: number | null
        }
        Insert: {
          accuracy_percentage?: number | null
          actual_quantity?: number | null
          actual_revenue?: number | null
          confidence_lower?: number | null
          confidence_upper?: number | null
          forecast_date: string
          forecast_id?: number
          forecast_period: string
          generated_at?: string | null
          mae?: number | null
          model_version?: string | null
          predicted_quantity: number
          predicted_revenue?: number | null
          product_id: number
          rmse?: number | null
        }
        Update: {
          accuracy_percentage?: number | null
          actual_quantity?: number | null
          actual_revenue?: number | null
          confidence_lower?: number | null
          confidence_upper?: number | null
          forecast_date?: string
          forecast_id?: number
          forecast_period?: string
          generated_at?: string | null
          mae?: number | null
          model_version?: string | null
          predicted_quantity?: number
          predicted_revenue?: number | null
          product_id?: number
          rmse?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      historical_data: {
        Row: {
          average_daily_sales: number | null
          closing_stock: number | null
          created_at: string | null
          data_source: string | null
          history_id: number
          is_validated: boolean | null
          opening_stock: number | null
          period_date: string
          period_type: string | null
          product_id: number
          sales_quantity: number | null
          sales_revenue: number | null
          stockout_days: number | null
        }
        Insert: {
          average_daily_sales?: number | null
          closing_stock?: number | null
          created_at?: string | null
          data_source?: string | null
          history_id?: number
          is_validated?: boolean | null
          opening_stock?: number | null
          period_date: string
          period_type?: string | null
          product_id: number
          sales_quantity?: number | null
          sales_revenue?: number | null
          stockout_days?: number | null
        }
        Update: {
          average_daily_sales?: number | null
          closing_stock?: number | null
          created_at?: string | null
          data_source?: string | null
          history_id?: number
          is_validated?: boolean | null
          opening_stock?: number | null
          period_date?: string
          period_type?: string | null
          product_id?: number
          sales_quantity?: number | null
          sales_revenue?: number | null
          stockout_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historical_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory: {
        Row: {
          inventory_id: number
          last_restock_date: string | null
          location: string | null
          product_id: number
          quantity_available: number | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          updated_at: string | null
        }
        Insert: {
          inventory_id?: number
          last_restock_date?: string | null
          location?: string | null
          product_id: number
          quantity_available?: number | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          updated_at?: string | null
        }
        Update: {
          inventory_id?: number
          last_restock_date?: string | null
          location?: string | null
          product_id?: number
          quantity_available?: number | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          notes: string | null
          performed_by: string | null
          product_id: number
          quantity: number
          reference_id: number | null
          reference_type: string | null
          transaction_date: string | null
          transaction_id: number
          transaction_type: string
          unit_price: number | null
        }
        Insert: {
          notes?: string | null
          performed_by?: string | null
          product_id: number
          quantity: number
          reference_id?: number | null
          reference_type?: string | null
          transaction_date?: string | null
          transaction_id?: number
          transaction_type: string
          unit_price?: number | null
        }
        Update: {
          notes?: string | null
          performed_by?: string | null
          product_id?: number
          quantity?: number
          reference_id?: number | null
          reference_type?: string | null
          transaction_date?: string | null
          transaction_id?: number
          transaction_type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      model_metrics: {
        Row: {
          created_at: string | null
          evaluation_date: string
          evaluation_period: string | null
          mean_absolute_error: number | null
          metric_id: number
          model_version: string | null
          notes: string | null
          overall_accuracy: number | null
          products_evaluated: number | null
          root_mean_square_error: number | null
        }
        Insert: {
          created_at?: string | null
          evaluation_date: string
          evaluation_period?: string | null
          mean_absolute_error?: number | null
          metric_id?: number
          model_version?: string | null
          notes?: string | null
          overall_accuracy?: number | null
          products_evaluated?: number | null
          root_mean_square_error?: number | null
        }
        Update: {
          created_at?: string | null
          evaluation_date?: string
          evaluation_period?: string | null
          mean_absolute_error?: number | null
          metric_id?: number
          model_version?: string | null
          notes?: string | null
          overall_accuracy?: number | null
          products_evaluated?: number | null
          root_mean_square_error?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          alert_type: string
          is_enabled: boolean | null
          min_severity: string | null
          preference_id: number
          user_id: string
        }
        Insert: {
          alert_type: string
          is_enabled?: boolean | null
          min_severity?: string | null
          preference_id?: number
          user_id: string
        }
        Update: {
          alert_type?: string
          is_enabled?: boolean | null
          min_severity?: string | null
          preference_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          is_active: boolean | null
          product_id: number
          product_name: string
          reorder_level: number | null
          reorder_quantity: number | null
          sku: string
          supplier_id: number | null
          unit_of_measure: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean | null
          product_id?: number
          product_name: string
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku: string
          supplier_id?: number | null
          unit_of_measure?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean | null
          product_id?: number
          product_name?: string
          reorder_level?: number | null
          reorder_quantity?: number | null
          sku?: string
          supplier_id?: number | null
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      sales: {
        Row: {
          created_by: string | null
          discount_amount: number | null
          invoice_number: string
          net_amount: number | null
          notes: string | null
          payment_method: string | null
          sale_date: string | null
          sale_status: string | null
          sales_id: number
          tax_amount: number | null
          total_amount: number
        }
        Insert: {
          created_by?: string | null
          discount_amount?: number | null
          invoice_number: string
          net_amount?: number | null
          notes?: string | null
          payment_method?: string | null
          sale_date?: string | null
          sale_status?: string | null
          sales_id?: number
          tax_amount?: number | null
          total_amount: number
        }
        Update: {
          created_by?: string | null
          discount_amount?: number | null
          invoice_number?: string
          net_amount?: number | null
          notes?: string | null
          payment_method?: string | null
          sale_date?: string | null
          sale_status?: string | null
          sales_id?: number
          tax_amount?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_items: {
        Row: {
          discount: number | null
          product_id: number
          quantity: number
          sales_id: number
          sales_item_id: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          discount?: number | null
          product_id: number
          quantity: number
          sales_id: number
          sales_item_id?: number
          total_price?: number | null
          unit_price: number
        }
        Update: {
          discount?: number | null
          product_id?: number
          quantity?: number
          sales_id?: number
          sales_item_id?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_items_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["sales_id"]
          },
        ]
      }
      sales_uploads: {
        Row: {
          error_log: string | null
          file_name: string
          file_path: string | null
          records_failed: number | null
          records_processed: number | null
          status: string | null
          upload_date: string | null
          upload_id: number
          uploaded_by: string | null
        }
        Insert: {
          error_log?: string | null
          file_name: string
          file_path?: string | null
          records_failed?: number | null
          records_processed?: number | null
          status?: string | null
          upload_date?: string | null
          upload_id?: number
          uploaded_by?: string | null
        }
        Update: {
          error_log?: string | null
          file_name?: string
          file_path?: string | null
          records_failed?: number | null
          records_processed?: number | null
          status?: string | null
          upload_date?: string | null
          upload_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          chart_type: string | null
          created_at: string | null
          created_by: string | null
          filters: Json | null
          is_favorite: boolean | null
          last_accessed: string | null
          report_id: number
          report_name: string
          report_type: string
        }
        Insert: {
          chart_type?: string | null
          created_at?: string | null
          created_by?: string | null
          filters?: Json | null
          is_favorite?: boolean | null
          last_accessed?: string | null
          report_id?: number
          report_name: string
          report_type: string
        }
        Update: {
          chart_type?: string | null
          created_at?: string | null
          created_by?: string | null
          filters?: Json | null
          is_favorite?: boolean | null
          last_accessed?: string | null
          report_id?: number
          report_name?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          is_active: boolean | null
          lead_time_days: number | null
          phone: string | null
          supplier_id: number
          supplier_name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          lead_time_days?: number | null
          phone?: string | null
          supplier_id?: number
          supplier_name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          lead_time_days?: number | null
          phone?: string | null
          supplier_id?: number
          supplier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          errors_logged: number | null
          metric_date: string
          metric_id: number
          peak_memory_usage_mb: number | null
          total_forecasts_generated: number | null
          total_sales_recorded: number | null
          total_users_active: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          errors_logged?: number | null
          metric_date: string
          metric_id?: number
          peak_memory_usage_mb?: number | null
          total_forecasts_generated?: number | null
          total_sales_recorded?: number | null
          total_users_active?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          errors_logged?: number | null
          metric_date?: string
          metric_id?: number
          peak_memory_usage_mb?: number | null
          total_forecasts_generated?: number | null
          total_sales_recorded?: number | null
          total_users_active?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          is_editable: boolean | null
          setting_id: number
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          is_editable?: boolean | null
          setting_id?: number
          setting_key: string
          setting_type: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          is_editable?: boolean | null
          setting_id?: number
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
