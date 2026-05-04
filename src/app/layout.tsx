import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Income Navigator — Dynamic PMCC Scanner',
  description: 'Read-only Dynamic PMCC criteria scanner',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
