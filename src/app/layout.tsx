import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CÓDIGOS ISRAEL | Monitor de Webhooks',
  description: 'Monitoramento de webhooks em tempo real com processamento inteligente.',
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
