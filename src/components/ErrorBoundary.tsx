import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
    
    // Clear potentially corrupted data
    try {
      localStorage.removeItem('hasSeenGPSModal');
      if ('indexedDB' in window) {
        // Clear IndexedDB if corrupted
        indexedDB.deleteDatabase('fitness-timer-db');
      }
    } catch (e) {
      console.error('Failed to clear corrupted data:', e);
    }
  }

  private handleReload = () => {
    // Clear all app data and reload
    try {
      localStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (e) {
      console.error('Failed to clear caches:', e);
    }
    
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle size={24} />
                App Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                The app encountered an error and needs to restart. This usually fixes white screen issues.
              </p>
              
              {this.state.error && (
                <details className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded">
                  <summary>Error Details</summary>
                  <pre className="mt-2 text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Reset App
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                If this keeps happening, try clearing your browser data or reinstalling the app.
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}