import { Component } from "react";

/**
 * Catches render/runtime errors anywhere below it and shows a recoverable
 * fallback instead of a blank screen. Offers a config reset because the most
 * likely persistent failure is a corrupt saved scoring config.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application error:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleResetConfig = () => {
    try {
      localStorage.removeItem("devEvalConfig.v1");
    } catch {}
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-boundary">
        <div className="error-boundary__card">
          <div className="error-boundary__mark">!</div>
          <h1 className="error-boundary__title">Something went wrong</h1>
          <p className="error-boundary__desc">
            The calculator hit an unexpected error and stopped rendering. Your inputs
            for this session may be lost, but you can recover below. If the problem
            keeps happening, resetting the saved scoring configuration usually fixes it.
          </p>
          <pre className="error-boundary__detail">{String(this.state.error?.message || this.state.error)}</pre>
          <div className="error-boundary__actions">
            <button className="btn btn--primary" onClick={this.handleReload}>Reload app</button>
            <button className="btn btn--danger" onClick={this.handleResetConfig}>Reset settings &amp; reload</button>
          </div>
        </div>
      </div>
    );
  }
}
