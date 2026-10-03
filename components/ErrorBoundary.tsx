'use client';

import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  /** Label shown in the fallback heading, e.g. "Checkout". */
  label: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
  retryCount: number;
}

/**
 * Catches render-time crashes in the wrapped tree and shows an inline error
 * with a retry button instead of letting the Next.js app-wide error page
 * ("Application error: a client-side exception has occurred") take over.
 *
 * try/catch in event handlers and async code cannot catch render errors —
 * only an error boundary can. All async paths already report via their own
 * catch handlers; this is the safety net for everything that throws while
 * React is rendering (e.g. unexpected nulls in API response shapes).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack);
  }

  private retry = () => {
    // Bump the key so children remount fresh (refetching their data)
    // instead of re-rendering into the same broken state.
    this.setState((s) => ({ error: null, retryCount: s.retryCount + 1 }));
  };

  render() {
    const { error, retryCount } = this.state;
    if (error) {
      return (
        <div className={styles.box} role="alert">
          <h2 className={styles.title}>{this.props.label} ran into a problem</h2>
          <p className={styles.message}>
            {error.message || 'Something went wrong while showing this section.'}
          </p>
          <p className={styles.hint}>
            Your bag is safe — nothing was charged. Try again, or come back in a moment.
          </p>
          <button type="button" className={styles.retry} onClick={this.retry}>
            Try again
          </button>
        </div>
      );
    }
    return <div key={retryCount}>{this.props.children}</div>;
  }
}
