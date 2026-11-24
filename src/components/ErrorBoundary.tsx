import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false, message: '' };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Terjadi kesalahan saat memuat halaman.',
    };
  }

  public componentDidCatch(error: Error): void {
    console.error('Application boundary caught error:', error);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#080808] px-6 text-center text-white">
          <p className="font-script text-4xl text-[#B8A88A]">Simanten</p>
          <h1 className="mt-4 font-ui text-lg font-medium text-white">
            Terjadi Kendala Sementara
          </h1>
          <p className="mt-2 max-w-md font-ui text-sm text-[#A0A0A0]">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full border border-[#303030] bg-[#171717] px-6 py-2.5 font-ui text-xs font-medium uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black"
          >
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
