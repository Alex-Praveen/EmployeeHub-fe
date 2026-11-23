import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backend = process.env.EMPLOYEE_HUB_API_URL || "http://127.0.0.1:8070";
    return [
      "employees",
      "departments",
      "attendance",
      "leave-requests",
      "projects",
      "performance-reviews",
      "salaries",
    ].map((resource) => ({
      source: `/api/${resource}/:path*`,
      destination: `${backend}/${resource}/:path*`,
    }));
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};

export default nextConfig;
