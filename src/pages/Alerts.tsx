import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Eye, Check } from "lucide-react";

// Updated interface to include all data
interface Alert {
  alert_id: number;
  alert_type: string;
  alert_title: string;
  alert_message: string;
  severity: string | null;
  is_read: boolean | null;
  is_resolved: boolean | null;
  created_at: string | null;
  product_id: number | null;
  product_name: string | null; // From the joined 'products' table
}

// Helper component for styling severity
const SeverityBadge = ({ severity }: { severity: string | null }) => {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "high":
      return <Badge variant="destructive" className="bg-orange-600">High</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500 text-black">Medium</Badge>;
    default:
      return <Badge variant="secondary">{severity || "Info"}</Badge>;
  }
};

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // State for the "Resolve" dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [alertToResolve, setAlertToResolve] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("alerts")
      .select(
        `
        alert_id, 
        alert_type, 
        alert_title, 
        alert_message, 
        severity, 
        is_read, 
        created_at,
        is_resolved,
        product_id,
        products ( product_name )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      // Map the data to flatten the joined product name
      const mappedData = data.map((alert: any) => ({
        ...alert,
        product_name: alert.products?.product_name || null,
      }));
      setAlerts(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Filter alerts for the tabs
  const openAlerts = alerts.filter((a) => !a.is_resolved);
  const resolvedAlerts = alerts.filter((a) => a.is_resolved);

  // --- ACTIONS ---

  const handleMarkAsRead = async (alert: Alert) => {
    if (alert.is_read) return; // Don't re-mark if already read

    // Optimistically update the UI
    setAlerts((prevAlerts) =>
      prevAlerts.map((a) =>
        a.alert_id === alert.alert_id ? { ...a, is_read: true } : a
      )
    );

    // Update the database
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("alert_id", alert.alert_id);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to mark as read: ${error.message}`,
        variant: "destructive",
      });
      // Revert UI if update fails
      fetchAlerts();
    }
  };

const handleViewProduct = (productId: number | null) => {
    if (productId) {
      navigate(`/inventory`); // 
    }
  };

  const handleOpenResolveDialog = (
    e: React.MouseEvent,
    alert: Alert
  ) => {
    e.stopPropagation(); // Stop the row's onClick from firing
    setAlertToResolve(alert);
    setResolutionNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolveSubmit = async () => {
    if (!alertToResolve) return;
    setFormLoading(true);

    const { error } = await supabase
      .from("alerts")
      .update({
        is_resolved: true,
        is_read: true, // Resolving an alert should also mark it as read
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
        // resolved_by: auth.uid() // You would add this if you have auth context
      })
      .eq("alert_id", alertToResolve.alert_id);

    setFormLoading(false);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Alert has been resolved." });
      setResolveDialogOpen(false);
      fetchAlerts(); // Re-fetch all alerts
    }
  };

  const renderAlertsTable = (alertsToShow: Alert[]) => {
    return (
      <div className="overflow-x-auto">
        <Table className="min-w-full border rounded-xl bg-card">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead className="w-[10px]"></TableHead>
              <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Severity</TableHead>
              <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Title</TableHead>
              <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Message</TableHead>
              <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Product</TableHead>
              <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Created At</TableHead>
              <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertsToShow.length === 0 ? (
              <TableRow>
                <TableCell
                  className="px-6 py-4 text-center text-muted-foreground"
                  colSpan={7}
                >
                  No alerts found.
                </TableCell>
              </TableRow>
            ) : (
              alertsToShow.map((alert) => (
                <TableRow
                  key={alert.alert_id}
                  onClick={() => handleMarkAsRead(alert)}
                  className={`hover:bg-muted/20 transition ${
                    !alert.is_read ? "bg-blue-50/50" : ""
                  } cursor-pointer`}
                >
                  <TableCell>
                    {!alert.is_read && (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <SeverityBadge severity={alert.severity} />
                  </TableCell>
                  <TableCell className="px-6 py-4 font-medium">
                    {alert.alert_title}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {alert.alert_message}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {alert.product_name || "N/A"}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {alert.created_at
                      ? new Date(alert.created_at).toLocaleString()
                      : "N/A"}
                  </TableCell>
                  <TableCell className="px-6 py-4 space-x-2">
                    {!alert.is_resolved && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => handleOpenResolveDialog(e, alert)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!alert.product_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProduct(alert.product_id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Alerts</h2>
          <p className="text-muted-foreground">
            View system alerts and notifications
          </p>
        </div>
      </div>
      <Tabs defaultValue="open">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <Card className="shadow-xl rounded-xl">
            <CardHeader className="bg-muted/40 rounded-t-xl">
              <CardTitle className="text-lg font-semibold">
                Open Alerts
              </CardTitle>
              <CardDescription>
                Alerts that require your attention. Click an alert to mark it as
                read.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="animate-pulse text-muted-foreground">
                    Loading alerts...
                  </span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-destructive">Error: {error}</span>
                </div>
              ) : (
                renderAlertsTable(openAlerts)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resolved">
          <Card className="shadow-xl rounded-xl">
            <CardHeader className="bg-muted/40 rounded-t-xl">
              <CardTitle className="text-lg font-semibold">
                Resolved Alerts
              </CardTitle>
              <CardDescription>
                A history of all resolved alerts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="animate-pulse text-muted-foreground">
                    Loading alerts...
                  </span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-destructive">Error: {error}</span>
                </div>
              ) : (
                renderAlertsTable(resolvedAlerts)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolve Alert Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              {alertToResolve?.alert_title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="resolution_notes">Resolution Notes</Label>
              <Textarea
                id="resolution_notes"
                placeholder="e.g., Ordered new stock, corrected inventory count..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                disabled={formLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleResolveSubmit}
              disabled={formLoading}
            >
              {formLoading ? "Resolving..." : "Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlertsPage;