import './globals.css';

export const metadata = {
  title: 'AI GCSE Marker',
  description: 'Upload papers and mark answers with AI assistance.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
