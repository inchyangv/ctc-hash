export const metadata = {
  title: 'Minder Credit',
  description: 'Hashrate Credit Event - USC Hackathon MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
