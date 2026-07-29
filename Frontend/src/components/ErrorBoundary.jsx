import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
          <div className="max-w-lg rounded-3xl border border-border bg-card p-8 shadow-luxe text-center">
            <h1 className="font-display text-3xl font-bold">Something went wrong</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The page hit a frontend error instead of going blank. Refresh the page after clearing old session data.
            </p>
            <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error?.message || "Unknown error"}
            </pre>
            <button
              type="button"
              className="mt-5 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-[color:var(--gold-royal)]"
              onClick={() => {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                sessionStorage.removeItem("access_token");
                sessionStorage.removeItem("refresh_token");
                window.location.href = "/";
              }}
            >
              Clear Session & Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
