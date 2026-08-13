/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@fullcalendar/common",
    "@fullcalendar/daygrid",
    "@fullcalendar/interaction",
    "@fullcalendar/react",
    "@fullcalendar/timegrid",
  ],
};

export default nextConfig;