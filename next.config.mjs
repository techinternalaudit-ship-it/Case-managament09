/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  devIndicators: false,
};
export default nextConfig;
