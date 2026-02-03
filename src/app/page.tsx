'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/lib/wallet/WalletContext';
import {
    Sparkles,
    Activity,
    Brain,
    Wallet,
    ArrowRight,
    Shield,
    Zap,
    BarChart3
} from 'lucide-react';
import { useEffect } from 'react';

export default function HomePage() {
    const router = useRouter();
    const { session, isLoading, connectWallet } = useWallet();

    // Redirect if already connected
    useEffect(() => {
        if (session?.isConnected) {
            router.push('/dashboard');
        }
    }, [session, router]);

    const handleConnect = async () => {
        await connectWallet();
    };

    const features = [
        {
            icon: Activity,
            title: 'Health Tracking',
            description: 'Record your sleep, activity, and overall health status daily',
            color: 'primary',
        },
        {
            icon: Brain,
            title: 'Psychology',
            description: 'Track your mood, stress, and motivation levels',
            color: 'accent',
        },
        {
            icon: Wallet,
            title: 'Financial Status',
            description: 'Manage your assets, income, expenses, and investments',
            color: 'primary',
        },
    ];

    const benefits = [
        {
            icon: Shield,
            title: 'Web3 Security',
            description: 'Secure, passwordless login with MetaMask',
        },
        {
            icon: Zap,
            title: 'Real-Time',
            description: 'Instant data analysis and alerts',
        },
        {
            icon: BarChart3,
            title: 'Detailed Analysis',
            description: 'Comprehensive charts and reports',
        },
    ];

    return (
        <main className="min-h-screen">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/50 via-transparent to-transparent" />

                {/* Animated orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />

                <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold gradient-text">LifeOS</h1>
                    </div>

                    {/* Headline */}
                    <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
                        Your Life&apos;s
                        <br />
                        <span className="gradient-text">Digital Avatar</span>
                    </h2>

                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Track your health, psychology, and financial data on a single platform.
                        Visualize your performance with a personal digital avatar.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {session?.isConnected ? (
                            <Link href="/dashboard" className="btn btn-primary btn-lg">
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={isLoading}
                                className="btn btn-primary btn-lg"
                            >
                                <Wallet className="w-5 h-5" />
                                {isLoading ? 'Connecting...' : 'Connect with MetaMask'}
                            </button>
                        )}
                        <Link href="#features" className="btn btn-secondary btn-lg">
                            Learn More
                        </Link>
                    </div>

                    {/* Web3 Badge */}
                    <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200">
                        <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                        <span className="text-sm text-primary-700">Web3 Powered - MetaMask Login</span>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 rounded-full border-2 border-primary-300 flex items-start justify-center p-2">
                        <div className="w-1 h-2 bg-primary-400 rounded-full" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                            Track Every Aspect of Your Life
                        </h3>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Record and analyze your data across 6 core metrics. Watch your digital avatar&apos;s
                            status change in real-time.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={feature.title}
                                className="glass-dark rounded-2xl p-8 hover:scale-105 transition-transform duration-300"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center mb-6">
                                    <feature.icon className="w-7 h-7 text-primary-600" />
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h4>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Avatar Section */}
            <section className="py-24 px-6 bg-gradient-to-br from-primary-50 to-accent-50">
                <div className="max-w-6xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h3 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                                Dynamic Digital Avatar
                            </h3>
                            <p className="text-gray-600 mb-8">
                                Understand your status at a glance with an avatar that changes in real-time
                                based on your data. Your energy, morale, and balance scores are constantly updated.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <span className="text-2xl">🌟</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Thriving</p>
                                        <p className="text-sm text-gray-500">All metrics are excellent</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                        <span className="text-2xl">⚡</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Energetic</p>
                                        <p className="text-sm text-gray-500">Positive trend</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                        <span className="text-2xl">😴</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Tired</p>
                                        <p className="text-sm text-gray-500">Rest needed</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <div className="w-64 h-64 rounded-full gradient-primary opacity-20 blur-3xl absolute" />
                                <div className="relative w-64 h-64 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                                    <span className="text-8xl">🧬</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                            Why LifeOS?
                        </h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {benefits.map((benefit) => (
                            <div key={benefit.title} className="text-center">
                                <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-6 flex items-center justify-center shadow-glow">
                                    <benefit.icon className="w-8 h-8 text-white" />
                                </div>
                                <h4 className="text-xl font-semibold mb-3 text-gray-900">{benefit.title}</h4>
                                <p className="text-gray-600">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 bg-gradient-to-br from-primary-500 to-accent-500">
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                        Create Your Digital Avatar
                    </h3>
                    <p className="text-white/80 mb-10 max-w-2xl mx-auto">
                        Get started by connecting your MetaMask wallet. No passwords, no email verification.
                        Just your wallet and your data.
                    </p>

                    {session?.isConnected ? (
                        <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg">
                            Go to Dashboard
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    ) : (
                        <button
                            onClick={handleConnect}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg"
                        >
                            <Wallet className="w-5 h-5" />
                            {isLoading ? 'Connecting...' : 'Get Started with MetaMask'}
                        </button>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 bg-white border-t border-gray-200">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary-500" />
                        <span className="font-semibold text-gray-900">LifeOS</span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Made with ❤️ using Next.js, Supabase & Web3
                    </p>
                </div>
            </footer>
        </main>
    );
}
