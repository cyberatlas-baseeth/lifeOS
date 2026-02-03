'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/lib/wallet/WalletContext';
import { Sparkles, Wallet, Loader2, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { useEffect } from 'react';

export default function LoginPage() {
    const router = useRouter();
    const { session, isLoading, connectWallet, error } = useWallet();

    // Redirect if already connected
    useEffect(() => {
        if (session?.isConnected) {
            router.push('/dashboard');
        }
    }, [session, router]);

    const handleConnect = async () => {
        await connectWallet();
    };

    return (
        <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-100/30 via-transparent to-transparent" />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-4">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Login with Wallet</h1>
                    <p className="text-gray-600">Connect your MetaMask wallet to sign in</p>
                </div>

                {/* Connection Card */}
                <div className="glass-dark rounded-2xl p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm mb-6 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* MetaMask Info */}
                        <div className="text-center py-4">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                                <Wallet className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect with MetaMask</h3>
                            <p className="text-gray-600 text-sm">
                                Secure and decentralized authentication
                            </p>
                        </div>

                        {/* Security Note */}
                        <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <Shield className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="text-gray-800 font-medium mb-1">Secure Connection</p>
                                <p className="text-gray-600">
                                    Only your wallet address is stored. Your private keys are never shared.
                                </p>
                            </div>
                        </div>

                        {/* Connect Button */}
                        <button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="btn btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Wallet className="w-5 h-5" />
                                    Connect with MetaMask
                                </>
                            )}
                        </button>

                        {/* How it works */}
                        <div className="text-center">
                            <details className="text-sm text-gray-600">
                                <summary className="cursor-pointer hover:text-gray-800 transition-colors">
                                    How does it work?
                                </summary>
                                <ol className="mt-4 text-left space-y-2 pl-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary-600 font-bold">1.</span>
                                        <span>Connect your MetaMask wallet</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary-600 font-bold">2.</span>
                                        <span>Sign the login message</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary-600 font-bold">3.</span>
                                        <span>You&apos;ll be redirected to the Dashboard</span>
                                    </li>
                                </ol>
                            </details>
                        </div>
                    </div>
                </div>

                {/* No Wallet Link */}
                <div className="text-center mt-6">
                    <p className="text-gray-600 text-sm">
                        Don&apos;t have MetaMask?{' '}
                        <a
                            href="https://metamask.io/download/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                        >
                            Install MetaMask
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </p>
                </div>

                {/* Home Link */}
                <p className="text-center mt-4 text-gray-500 text-sm">
                    <Link href="/" className="hover:text-gray-700 transition-colors">
                        ← Back to Home
                    </Link>
                </p>
            </div>
        </main>
    );
}
