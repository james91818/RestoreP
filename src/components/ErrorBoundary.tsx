import React from "react";

interface State {
  hasError: boolean;
  recoverableDomError: boolean;
  resetKey: number;
}

const isRecoverableDomMutationError = (error: Error) => {
  const msg = error.message || "";
  return (
    msg.includes("NotFoundError") ||
    msg.includes("removeChild") ||
    msg.includes("insertBefore") ||
    msg.includes("The node to be removed is not a child") ||
    msg.includes("The node before which the new node is to be inserted is not a child") ||
    msg.includes("Failed to execute 'removeChild' on 'Node'") ||
    msg.includes("Failed to execute 'insertBefore' on 'Node'")
  );
};

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, recoverableDomError: false, resetKey: 0 };
  private resetTimer: number | null = null;

  static getDerivedStateFromError(error: Error) {
    if (isRecoverableDomMutationError(error)) {
      return { hasError: false, recoverableDomError: true };
    }

    return { hasError: true, recoverableDomError: false };
  }

  componentDidCatch(error: Error) {
    if (isRecoverableDomMutationError(error)) {
      // Visual Edits / browser translation can mutate DOM nodes that React owns.
      // Remount the subtree so the page recovers without getting stuck on a blank screen.
      if (this.resetTimer) window.clearTimeout(this.resetTimer);
      this.resetTimer = window.setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          recoverableDomError: false,
          resetKey: prev.resetKey + 1,
        }));
      }, 0);
      return;
    }

    console.error("ErrorBoundary caught:", error);
  }

  componentWillUnmount() {
    if (this.resetTimer) window.clearTimeout(this.resetTimer);
  }

  render() {
    if (this.state.recoverableDomError) {
      return <div className="min-h-screen bg-background" aria-hidden="true" />;
    }

    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-8 text-center">
          <div>
            <h1 className="text-2xl font-bold mb-4">Etwas ist schiefgelaufen</h1>
            <p className="text-muted-foreground mb-6">
              Bitte laden Sie die Seite neu. Falls Sie eine Browser-Übersetzung verwenden, deaktivieren Sie diese bitte.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;
