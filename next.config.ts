import type {NextConfig} from 'next';

const isStaticExport = process.env.STATIC_EXPORT === 'true';

const staticExportConfig: NextConfig = {
  output: 'export',
  basePath: process.env.PAGES_BASE_PATH ?? '',
  trailingSlash: true,
  pageExtensions: ['tsx', 'jsx'],
};

const nextConfig: NextConfig = {
  /* config options here */
  ...(isStaticExport ? staticExportConfig : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // The default image loader needs a server, so serve images as-is in a
    // static export.
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
