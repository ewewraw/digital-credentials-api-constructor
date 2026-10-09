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
  env: {
    // A static export can't include the issuer route handlers, so tell the
    // issuance page that its own origin can't serve the issuer endpoints.
    NEXT_PUBLIC_STATIC_EXPORT: String(isStaticExport),
  },
  // The credential endpoint reads the card art files at runtime. Include them
  // in its deployment on hosts that only deploy the files a route imports.
  outputFileTracingIncludes: {
    '/openid4vci/credential': ['./public/card-designs/*.png'],
  },
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
