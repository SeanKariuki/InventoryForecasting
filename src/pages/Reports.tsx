import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface ReportRow {
  id: number;
  report_type: string;
  generated_at: string;
  summary: string;
}

const ReportsPage = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo: fetch report-like data from forecasts table
    const fetchReports = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("forecasts")
        .select("forecast_id, forecast_period, generated_at, product_name")
        .order("generated_at", { ascending: false });
      if (data) {
        setReports(
          data.map((row: any) => ({
            id: row.forecast_id,
            report_type: row.forecast_period,
            generated_at: row.generated_at ?? row.forecast_date,
            summary: row.product_name,
          }))
        );
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-8 bg-background">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Reports</h2>
        <p className="text-muted-foreground">View and analyze system reports.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>All available reports in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="animate-pulse text-muted-foreground">Loading reports...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.report_type}</TableCell>
                      <TableCell>{new Date(r.generated_at).toLocaleString()}</TableCell>
                      <TableCell>{r.summary}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
