import { Component } from "react";
import { AppRoutes } from "./routes";

class ErrorBoundary extends Component<{ children: React.ReactNode }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error("React Error Boundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return <div className="flex items-center justify-center min-h-screen bg-red-50 p-8">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-red-600 text-sm mb-4 font-mono">{this.state.error.message}</p>
          <details className="text-left text-xs text-red-500 max-h-60 overflow-auto">
            <summary className="cursor-pointer font-medium">Stack trace</summary>
            <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            Reload page
          </button>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

export default function App() {
  return <ErrorBoundary><AppRoutes /></ErrorBoundary>;
}
