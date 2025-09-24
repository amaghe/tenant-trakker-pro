import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Bug, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DebugLog {
  id: string;
  function_name: string;
  level: string;
  message: string;
  metadata?: any;
  user_id?: string;
  created_at: string;
}

const DebugLogs = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedFunction !== 'all') {
        query = query.eq('function_name', selectedFunction);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedFunction]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <Bug className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'default';
      case 'info':
        return 'secondary';
      case 'debug':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const functionNames = [...new Set(logs.map(log => log.function_name))];

  const filteredLogs = logs.filter(log => 
    selectedFunction === 'all' || log.function_name === selectedFunction
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Debug Logs</h1>
          <p className="text-muted-foreground">
            View detailed logs from edge functions for debugging
          </p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={selectedFunction} onValueChange={setSelectedFunction}>
        <TabsList>
          <TabsTrigger value="all">All Functions</TabsTrigger>
          {functionNames.map(name => (
            <TabsTrigger key={name} value={name}>
              {name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedFunction} className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} log entries
          </div>

          <ScrollArea className="h-[600px] w-full">
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex items-start space-x-3 flex-1">
                      {getLevelIcon(log.level)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getLevelColor(log.level) as any}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {log.function_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{log.message}</p>
                        {log.metadata && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View metadata
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredLogs.length === 0 && !loading && (
                <Card className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <Bug className="w-8 h-8 mx-auto mb-2" />
                    <p>No debug logs found</p>
                    <p className="text-sm">Logs will appear here when functions are executed</p>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DebugLogs;