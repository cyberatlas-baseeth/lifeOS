'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BrowserProvider, verifyMessage } from 'ethers';
import { createClient } from '@/lib/supabase/client';
import { WalletSession, Profile } from '@/types/database';

interface WalletContextType {
    session: WalletSession | null;
    profile: Profile | null;
    isLoading: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
    error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = 'lifeos_wallet_session';

export function WalletProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<WalletSession | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async (walletAddress: string) => {
        const supabase = createClient();
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', walletAddress.toLowerCase())
            .single();

        if (data) {
            setProfile(data as Profile);
        }
    };

    const disconnectWallet = useCallback(() => {
        setSession(null);
        setProfile(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const connectWallet = useCallback(async () => {
        setError(null);
        setIsLoading(true);

        try {
            // Check if MetaMask is installed
            if (typeof window === 'undefined' || !window.ethereum) {
                throw new Error('MetaMask yüklü değil. Lütfen MetaMask tarayıcı eklentisini yükleyin.');
            }

            // Request account access
            const provider = new BrowserProvider(window.ethereum);
            const accounts = await provider.send('eth_requestAccounts', []) as string[];

            if (!accounts || accounts.length === 0) {
                throw new Error('Cüzdan bağlantısı reddedildi.');
            }

            const walletAddress = accounts[0].toLowerCase();
            const signer = await provider.getSigner();
            const supabase = createClient();

            // Get or create nonce for this wallet
            const { data: nonceResult } = await supabase.rpc('get_or_create_nonce', {
                p_wallet_address: walletAddress
            });

            const nonce = nonceResult as string;

            // Create message to sign
            const message = `LifeOS'a Hoşgeldiniz!\n\nBu mesajı imzalayarak cüzdanınızla giriş yapıyorsunuz.\n\nNonce: ${nonce}\nTarih: ${new Date().toISOString()}`;

            // Request signature
            const signature = await signer.signMessage(message);

            // Verify signature (client-side for now, would be server-side in production)
            const recoveredAddress = verifyMessage(message, signature);

            if (recoveredAddress.toLowerCase() !== walletAddress) {
                throw new Error('İmza doğrulaması başarısız.');
            }

            // Rotate nonce after successful auth
            await supabase.rpc('rotate_nonce', { p_wallet_address: walletAddress });

            // Check if profile exists, if not create one
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();

            let userProfile = existingProfile as Profile | null;

            if (!existingProfile) {
                // Create new profile
                const { data: newProfile, error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        wallet_address: walletAddress,
                        display_name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
                    })
                    .select()
                    .single();

                if (profileError) throw profileError;
                userProfile = newProfile as Profile;
            }

            // Create session
            const newSession: WalletSession = {
                walletAddress,
                displayName: userProfile?.display_name || null,
                isConnected: true,
            };

            setSession(newSession);
            setProfile(userProfile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));

        } catch (err) {
            console.error('Wallet connection error:', err);
            setError(err instanceof Error ? err.message : 'Cüzdan bağlantısı başarısız.');
            setSession(null);
            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsedSession = JSON.parse(stored) as WalletSession;

                    // Verify wallet is still connected
                    if (typeof window !== 'undefined' && window.ethereum) {
                        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
                        if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === parsedSession.walletAddress.toLowerCase()) {
                            setSession(parsedSession);
                            await fetchProfile(parsedSession.walletAddress);
                        } else {
                            localStorage.removeItem(STORAGE_KEY);
                        }
                    }
                }
            } catch (err) {
                console.error('Session check error:', err);
                localStorage.removeItem(STORAGE_KEY);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    // Listen for account changes
    useEffect(() => {
        if (typeof window !== 'undefined' && window.ethereum) {
            const handleAccountsChanged = (...args: unknown[]) => {
                const accounts = args[0] as string[];
                if (!accounts || accounts.length === 0) {
                    disconnectWallet();
                } else if (session && accounts[0].toLowerCase() !== session.walletAddress.toLowerCase()) {
                    disconnectWallet();
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            return () => {
                window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, [session, disconnectWallet]);

    return (
        <WalletContext.Provider value={{ session, profile, isLoading, connectWallet, disconnectWallet, error }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

// Type declaration for window.ethereum
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, callback: (...args: unknown[]) => void) => void;
            removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
        };
    }
}
