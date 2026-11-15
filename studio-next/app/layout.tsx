import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WAY UP Studio | Espacio de diseño',
  description: 'Espacio profesional de creación y edición web de WAY UP.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="antialiased">{children}</body></html>;
}