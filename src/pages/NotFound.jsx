// src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <span className="text-9xl font-bold text-blue-500">404</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-800">
            ไม่พบหน้าที่คุณต้องการ
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            หน้าที่คุณกำลังค้นหาไม่มีอยู่หรืออาจถูกย้ายไปยังตำแหน่งอื่น
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-5 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition"
          >
            <Home className="w-5 h-5 mr-2" />
            กลับไปหน้าหลัก
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center w-full px-5 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            กลับไปหน้าก่อนหน้า
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">Seven Smile Tour And Ticket</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
