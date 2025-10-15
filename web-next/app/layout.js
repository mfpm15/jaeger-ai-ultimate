import './globals.css';

export const metadata = {
  title: 'Jaeger AI Web Interface',
  description: 'Next.js interface for Jaeger AI v5.0'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
