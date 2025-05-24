// src/components/common/Layout.jsx
import React from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

const Layout = ({ children }) => {
  const { user } = useAuth();

  // ถ้ายังไม่ login ไม่ต้องแสดง Sidebar
  if (!user) {
    return <main>{children}</main>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* เพิ่ม class print:hidden เพื่อซ่อน Sidebar เมื่อพิมพ์ */}
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 overflow-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
