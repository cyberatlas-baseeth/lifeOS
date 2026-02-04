import type { Metadata } from "next";
import { WalletProvider } from "@/lib/wallet/WalletContext";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
    title: "LifeOS - Digital Avatar",
    description: "A personal life operating system that tracks, analyzes, and generates a unique digital avatar for you.",
    keywords: ["life tracking", "personal dashboard", "health", "finance", "digital avatar", "web3"],
    authors: [{ name: "LifeOS Team" }],
    openGraph: {
        title: "LifeOS - Digital Avatar",
        description: "Your personal life operating system",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased">
                <ThemeProvider>
                    <WalletProvider>
                        {children}
                    </WalletProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
