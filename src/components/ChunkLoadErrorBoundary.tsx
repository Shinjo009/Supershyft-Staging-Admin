import { Component, type ErrorInfo, type ReactNode } from "react";

const RELOAD_FLAG = "admin_chunk_reload_once";

function isChunkLoadError(error: Error): boolean {
  const msg = error.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
}

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Recover from stale caches after deploy when lazy route chunks 404. */
export class ChunkLoadErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (!isChunkLoadError(error)) return;
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    window.location.reload();
  }

  componentDidMount() {
    sessionStorage.removeItem(RELOAD_FLAG);
  }

  render() {
    const { error } = this.state;
    if (error && isChunkLoadError(error)) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-8 text-center bg-zinc-50">
          <p className="text-sm font-medium text-zinc-800">The admin app was updated.</p>
          <p className="text-sm text-zinc-500 max-w-md">
            Your browser still has an older script cached. Refresh to load the latest version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800"
          >
            Refresh page
          </button>
        </div>
      );
    }
    if (error) throw error;
    return this.props.children;
  }
}