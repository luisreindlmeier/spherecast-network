import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['maplibre-gl'],
  // Allow local network host during development; prevents blocked dev-resource requests.
  allowedDevOrigins: ['192.0.0.2'],
}

export default nextConfig
