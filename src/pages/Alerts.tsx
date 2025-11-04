import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Alert {
  alert_id: number;
  alert_type: string;
  alert_title: string;
  alert_message: string;
  severity: string | null;
  is_read: boolean | null;
  created_at: string | null;
}

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("alerts")
        .select("alert_id, alert_type, alert_title, alert_message, severity, is_read, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setAlerts(data || []);
      }
      setLoading(false);
    };
    fetchAlerts();
  }, []);

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Alerts</h2>
          <p className="text-muted-foreground">View system alerts and notifications</p>
        </div>
      </div>
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="bg-muted/40 rounded-t-xl">
          <CardTitle className="text-lg font-semibold">Alerts List</CardTitle>
          <CardDescription>All alerts in your system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-pulse text-muted-foreground">Loading alerts...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-destructive">Error: {error}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full border rounded-xl bg-card">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Title</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Message</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Severity</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Read</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-4 text-center text-muted-foreground" colSpan={6}>
                        No alerts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow key={alert.alert_id} className="hover:bg-muted/20 transition">
                        <TableCell className="px-6 py-4 font-medium">{alert.alert_type}</TableCell>
                        <TableCell className="px-6 py-4">{alert.alert_title}</TableCell>
                        <TableCell className="px-6 py-4">{alert.alert_message}</TableCell>
                        <TableCell className="px-6 py-4">{alert.severity || "N/A"}</TableCell>
                        <TableCell className="px-6 py-4">{alert.is_read ? "Yes" : "No"}</TableCell>
                        <TableCell className="px-6 py-4">{alert.created_at ? new Date(alert.created_at).toLocaleString() : "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPage;
