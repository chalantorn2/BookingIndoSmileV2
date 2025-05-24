/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  // เพิ่ม variants สำหรับการพิมพ์
  variants: {
    extend: {
      display: ["print"],
      colors: {
        // กำหนดสีที่ใช้ในโปรเจกต์ในรูปแบบ hex เพื่อหลีกเลี่ยง oklch
        "gray-50": "#f9fafb",
        "gray-100": "#f3f4f6",
        "gray-200": "#e5e7eb",
        "gray-600": "#4b5563",
        "gray-700": "#374151",
        "gray-800": "#1f2937",
        "blue-100": "#dbeafe",
        "blue-500": "#3b82f6",
        "blue-600": "#2563eb",
        "blue-800": "#1e40af",
        "green-100": "#dcfce7",
        "green-200": "#bbf7d0",
        "green-500": "#22c55e",
        "green-600": "#16a34a",
        "green-800": "#166534",
        "yellow-100": "#fef9c3",
        "yellow-600": "#d97706",
        "yellow-800": "#92400e",
        "red-600": "#dc2626",
        // เพิ่มสีอื่น ๆ ถ้าคุณใช้สีเพิ่มเติมในโปรเจกต์
      },
    },
  },
  // เพิ่ม media queries สำหรับการพิมพ์
  corePlugins: {
    preflight: true,
    // ...
  },
  experimental: {
    // ปิดการ optimize ที่อาจใช้ oklch
    optimizeUniversalDefaults: false,
  },
  // กำหนด media queries ใหม่สำหรับ print
  future: {
    purgeLayersByDefault: true,
  },
  // เพิ่ม modifiers สำหรับการพิมพ์
  modifiers: {
    print: "@media print",
  },
};
