import './globals.css';
import PWAContainer from '@/components/PWAContainer';

export const metadata = {
  title: 'CodeDiary',
  description: 'Organize your daily coding journey, save programming questions, write notes, format code snippets, and export summaries as PDF documents.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CodeDiary',
  },
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PWAContainer />
        {children}
      </body>
    </html>
  );
}
