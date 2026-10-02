import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'black', background: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: 'red' }}>App Crashed</h1>
          <p><strong>Error:</strong> {this.state.error?.message}</p>
          <pre style={{ background: '#eee', padding: 10, overflowX: 'auto', fontSize: 12 }}>
            {this.state.error?.stack}
          </pre>
          <p><strong>Component Stack:</strong></p>
          <pre style={{ background: '#eee', padding: 10, overflowX: 'auto', fontSize: 12 }}>
            {this.state.errorInfo?.componentStack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
