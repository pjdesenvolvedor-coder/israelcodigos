
import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RECEPTOR ISRAEL | Monitor de Sinais',
  description: 'Sistema em tempo real para monitoramento de códigos e webhooks.',
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
