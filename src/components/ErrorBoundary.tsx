import React, { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center bg-background text-foreground">
          <div className="mx-auto max-w-md space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-lg">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected interface error occurred. You can reload the page or return to the dashboard.
              </p>
            </div>
            {this.state.error && (
              <pre className="max-h-32 overflow-auto rounded bg-muted/80 p-3 text-start font-mono text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button onClick={this.handleReload} size="sm" className="gap-2">
                <RefreshCw className="size-4" />
                <span>Reload Page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.assign('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
