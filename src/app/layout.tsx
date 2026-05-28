import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CÓDIGOS ISRAEL | Receptor Webhook',
  description: 'Monitoramento de sinais e códigos temporários em tempo real.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
