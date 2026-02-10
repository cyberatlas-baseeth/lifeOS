'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useWallet } from '@/lib/wallet/WalletContext';
import {
    LayoutDashboard,
    Activity,
    Brain,
    Wallet,
    TrendingUp,
    TrendingDown,
    PiggyBank,
    Target,
    LogOut,
    Menu,
    X,
    Sparkles,
    Copy,
    Check,
    Sun,
    Moon,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/lib/theme/ThemeContext';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Health', href: '/dashboard/health', icon: Activity },
    { name: 'Net Worth', href: '/dashboard/networth', icon: Wallet },
    { name: 'Income', href: '/dashboard/income', icon: TrendingUp },
    { name: 'Expenses', href: '/dashboard/expenses', icon: TrendingDown },
    { name: 'Investments', href: '/dashboard/investments', icon: PiggyBank },
    { name: 'Targets', href: '/dashboard/targets', icon: Target },
];



export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { session, profile, isLoading, disconnectWallet } = useWallet();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { theme, toggleTheme } = useTheme();

    // Redirect to login if not connected
    useEffect(() => {
        if (!isLoading && !session?.isConnected) {
            router.push('/login');
        }
    }, [isLoading, session, router]);

    const handleLogout = () => {
        disconnectWallet();
        router.push('/');
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const copyAddress = async () => {
        if (session?.walletAddress) {
            await navigator.clipboard.writeText(session.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full gradient-primary animate-pulse mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // Don't render if not connected
    if (!session?.isConnected) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:shadow-none
      `}>
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-800">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold gradient-text">LifeOS</span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }
                `}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {profile?.display_name || formatAddress(session.walletAddress)}
                            </p>
                            <button
                                onClick={copyAddress}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
                            >
                                {formatAddress(session.walletAddress)}
                                {copied ? (
                                    <Check className="w-3 h-3 text-primary-500" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Disconnect Wallet
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top header */}
                <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        {/* Connection Status */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800">
                            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            <span className="text-xs text-primary-700 dark:text-primary-400 font-medium">Connected</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
