import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.archive.org' },
      { protocol: 'https', hostname: 'archive.org' },
      { protocol: 'https', hostname: 'coverartarchive.org' },
    ],
  },
};

export default withNextIntl(nextConfig);
