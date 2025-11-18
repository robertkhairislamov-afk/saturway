import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-red-500/30 bg-red-500/5">
              <div className="rounded-full bg-red-500/10 p-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>

              <h2 className="text-xl font-semibold text-center">
                Что-то пошло не так
              </h2>

              <p className="text-center text-muted-foreground text-sm">
                Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
              </p>

              {this.state.error && process.env.NODE_ENV === 'development' && (
                <details className="w-full mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Детали ошибки (только для разработки)
                  </summary>
                  <pre className="mt-2 p-4 text-xs overflow-auto bg-muted rounded-lg">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <button
                onClick={this.handleReset}
                className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white font-semibold hover:opacity-90 transition-all"
              >
                Попробовать снова
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 rounded-xl border-2 border-border/50 hover:bg-muted/50 transition-all"
              >
                Перезагрузить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
