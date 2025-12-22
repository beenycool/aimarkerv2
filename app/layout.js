import './globals.css';

export const metadata = {
  title: 'GCSE Planner + AI Marker',
  description: 'A calm GCSE study planner with an AI-powered paper marker.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}