import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center px-4" role="alert">
          <div className="bg-surface dark:bg-surface-dark backdrop-blur-glass border border-border dark:border-border-dark rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-3xl" aria-hidden="true">!</div>
            <h1 className="text-xl font-bold text-text-primary dark:text-text-primary-dark mb-2">Something went wrong</h1>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/login'; }}
              className="bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-focus dark:focus:ring-focus-dark"
              type="button"
            >
              Go to Login
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
