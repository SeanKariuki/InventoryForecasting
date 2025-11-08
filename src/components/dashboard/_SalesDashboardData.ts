import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSalesDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalValue: 0,
    itemsSold: 0,
    availableProducts: 0,
    transactions: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        // Fetch total value of products
        const { data: inventoryData, error: inventoryError } = await supabase
          .from("inventory")
          .select("quantity_on_hand, products(cost_price)");
        if (inventoryError) throw inventoryError;
        const totalValue = (inventoryData || []).reduce((sum, item) => {
          const qty = item.quantity_on_hand || 0;
          const cost = item.products?.cost_price || 0;
          return sum + qty * cost;
        }, 0);

        // Fetch today's sales for transactions and items sold
        const today = new Date().toISOString().split("T")[0];
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("sales_id, sale_date")
          .gte("sale_date", today)
          .lte("sale_date", today);
        if (salesError) throw salesError;
        const transactions = (salesData || []).length;

        // Fetch items sold today
        const { data: itemsData, error: itemsError } = await supabase
          .from("sales_items")
          .select("quantity, sales_id, sales(sale_date)");
        if (itemsError) throw itemsError;
        const itemsSold = (itemsData || []).filter(i => {
          const saleDate = i.sales?.sale_date?.split("T")[0];
          return saleDate === today;
        }).reduce((sum, i) => sum + (i.quantity || 0), 0);

        // Fetch available products
        const { data: productsData, error: productsError } = await supabase
          .from("inventory")
          .select("quantity_on_hand");
        if (productsError) throw productsError;
        const availableProducts = (productsData || []).reduce((sum, p) => sum + (p.quantity_on_hand || 0), 0);

        setStats({
          totalValue,
          itemsSold,
          availableProducts,
          transactions,
        });

        // Fetch top 5 recent sales
        const { data: recentSalesData, error: recentSalesError } = await supabase
          .from("sales")
          .select("invoice_number, total_amount, sale_date, sales_id")
          .order("sale_date", { ascending: false })
          .limit(5);
        if (recentSalesError) throw recentSalesError;

        // Fetch items count for each sale
        const salesIds = (recentSalesData || []).map((s: any) => s.sales_id);
        let itemsCountMap: Record<number, number> = {};
        if (salesIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from("sales_items")
            .select("sales_id, quantity");
          if (itemsError) throw itemsError;
          for (const saleId of salesIds) {
            itemsCountMap[saleId] = (itemsData || [])
              .filter((i: any) => i.sales_id === saleId)
              .reduce((sum, i) => sum + (i.quantity || 0), 0);
          }
        }
        setRecentSales((recentSalesData || []).map((s: any) => ({
          invoice_number: s.invoice_number,
          total_amount: s.total_amount,
          sale_date: s.sale_date,
          items_count: itemsCountMap[s.sales_id] || 0,
        })));
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard stats.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return { ...stats, recentSales, loading, error };
}
