import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RECEPTOR ISRAEL | Monitor de Sinais',
  description: 'Sistema de monitoramento de códigos e webhooks em tempo real com LocalStorage.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}