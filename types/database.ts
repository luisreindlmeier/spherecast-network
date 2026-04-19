export type Database = {
  public: {
    Tables: {
      company: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      product: {
        Row: {
          id: number
          sku: string
          company_id: number
          type: 'finished-good' | 'raw-material'
        }
        Insert: {
          id: number
          sku: string
          company_id: number
          type: 'finished-good' | 'raw-material'
        }
        Update: {
          id?: number
          sku?: string
          company_id?: number
          type?: 'finished-good' | 'raw-material'
        }
      }
      bom: {
        Row: {
          id: number
          produced_product_id: number
        }
        Insert: {
          id: number
          produced_product_id: number
        }
        Update: {
          id?: number
          produced_product_id?: number
        }
      }
      bom_component: {
        Row: {
          bom_id: number
          consumed_product_id: number
        }
        Insert: {
          bom_id: number
          consumed_product_id: number
        }
        Update: {
          bom_id?: number
          consumed_product_id?: number
        }
      }
      supplier: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
      }
      supplier_product: {
        Row: {
          supplier_id: number
          product_id: number
        }
        Insert: {
          supplier_id: number
          product_id: number
        }
        Update: {
          supplier_id?: number
          product_id?: number
        }
      }
      supplier_facility: {
        Row: {
          id: number
          supplier_id: number
          facility_name: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string
          fda_reg_number: string | null
          lat: number | null
          lng: number | null
          created_at: string
        }
        Insert: {
          id?: number
          supplier_id: number
          facility_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string
          fda_reg_number?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          supplier_id?: number
          facility_name?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string
          fda_reg_number?: string | null
          lat?: number | null
          lng?: number | null
          created_at?: string
        }
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
  }
}

// Convenience types
export type Company = Database['public']['Tables']['company']['Row']
export type Product = Database['public']['Tables']['product']['Row']
export type Bom = Database['public']['Tables']['bom']['Row']
export type BomComponent = Database['public']['Tables']['bom_component']['Row']
export type Supplier = Database['public']['Tables']['supplier']['Row']
export type SupplierProduct =
  Database['public']['Tables']['supplier_product']['Row']
export type ProductType = Database['public']['Tables']['product']['Row']['type']
export type SupplierFacility =
  Database['public']['Tables']['supplier_facility']['Row']
