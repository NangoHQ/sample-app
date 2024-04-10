import './globals.css';

import { Suspense } from 'react';
import Nav from './nav';

export const metadata = {
  title: 'Wolf CRM',
  description: 'The best CRM. Built by Nango.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full">
        <Suspense>
          <Nav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
