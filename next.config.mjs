/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔴 Add fullcalendar packages to transpilePackages so Next.js compiles them properly
  transpilePackages: [
    "@fullcalendar/common",
    "@fullcalendar/core",
    "@fullcalendar/daygrid",
    "@fullcalendar/interaction",
    "@fullcalendar/react",
    "@fullcalendar/timegrid",
    "@fullcalendar/list",
  ],
};

export default nextConfig;