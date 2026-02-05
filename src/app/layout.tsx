import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vandura - Time Tracking & Actuals',
  description: 'Automated time-tracking and actuals report generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">Vandura</h1>
                    <span className="text-sm text-muted-foreground">
                      Time Tracking & Actuals
                    </span>
                  </div>
                  <nav className="flex gap-4">
                    <a href="/" className="hover:text-primary">Dashboard</a>
                    <a href="/projects" className="hover:text-primary">Projects</a>
                    <a href="/timesheets" className="hover:text-primary">Timesheets</a>
                    <a href="/reports" className="hover:text-primary">Reports</a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
