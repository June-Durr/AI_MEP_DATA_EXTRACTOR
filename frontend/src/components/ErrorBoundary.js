import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ hasError: true, error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container">
          <div className="card" style={{ backgroundColor: '#f8d7da', border: '2px solid #dc3545' }}>
            <h2 style={{ color: '#721c24' }}>Something went wrong</h2>
            <p style={{ color: '#721c24' }}>
              {this.state.error && this.state.error.toString()}
            </p>
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
            >
              Go to Projects
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
