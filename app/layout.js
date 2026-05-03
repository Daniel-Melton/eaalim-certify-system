import './globals.css';
import Layout from '@/components/Layout';

export const metadata = {
  title: 'Elite Certify — Certificate Designer',
  description: 'Premium certificate design suite by Ahmad Ismael',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
