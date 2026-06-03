import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<Props>, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = (this as any).props;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      let isFirestoreError = false;

      try {
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database Error: ${parsed.error} during ${parsed.operationType}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#fdfbf7] text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-serif italic text-[#0a3610] mb-4">Oops!</h2>
          <p className="text-gray-600 mb-8 max-w-xs">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-[#0a3610] text-white rounded-xl font-bold shadow-lg hover:bg-[#082a0c] transition-colors"
          >
            <RefreshCcw size={18} />
            Reload App
          </button>
          
          {isFirestoreError && (
            <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest">
              Please check your connection or permissions
            </p>
          )}
        </div>
      );
    }

    return children;
  }
}
