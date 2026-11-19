import { Component, type ErrorInfo, type ReactNode } from "react";
import LoadError from "@/components/LoadError";

interface State {
  failed: boolean;
}

/**
 * Última rede de proteção das rotas: um erro de render (ou um chunk que não
 * carregou) mostra "tentar de novo" em vez de deixar a tela em branco.
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <LoadError onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
