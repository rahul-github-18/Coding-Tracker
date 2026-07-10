import './globals.css';

export const metadata = {
  title: 'CodeDiary',
  description: 'Organize your daily coding journey, save programming questions, write notes, format code snippets, and export summaries as PDF documents.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
