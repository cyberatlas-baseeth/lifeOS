import type { Metadata } from "next";
import { WalletProvider } from "@/lib/wallet/WalletContext";
import "./globals.css";

export const metadata: Metadata = {
    title: "LifeOS - Dijital Avatar",
    description: "Hayatınızı takip eden, analiz eden ve size özel bir dijital avatar üreten kişisel yaşam işletim sistemi.",
    keywords: ["life tracking", "personal dashboard", "health", "finance", "digital avatar", "web3"],
    authors: [{ name: "LifeOS Team" }],
    openGraph: {
        title: "LifeOS - Dijital Avatar",
        description: "Kişisel yaşam işletim sisteminiz",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            <body className="antialiased">
                <WalletProvider>
                    {children}
                </WalletProvider>
            </body>
        </html>
    );
}
