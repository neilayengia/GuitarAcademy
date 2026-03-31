/**
 * ErrorBoundary.jsx — Catches render errors and shows a recovery UI
 */
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
        this.handleRetry = this.handleRetry.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    handleRetry() {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="hardware-card p-8 max-w-md text-center">
                        <div className="w-16 h-16 rounded-full bg-[#F87171]/10 border border-[#F87171]/30 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={32} className="text-[#F87171]" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                            {this.props.fallbackTitle || 'Something went wrong'}
                        </h3>
                        <p className="text-[#71717A] text-sm mb-6 leading-relaxed">
                            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <button
                            onClick={this.handleRetry}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#C8A96E] text-white hover:bg-[#D4B87A] transition-all mx-auto font-medium"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
