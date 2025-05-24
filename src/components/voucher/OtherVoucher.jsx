import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const OtherVoucher = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Voucher อื่นๆ</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          กลับไปหน้าก่อนหน้า
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          อยู่ในระหว่างการพัฒนา
        </h2>
        <p className="text-gray-600">
          ฟังก์ชันการสร้าง Voucher อื่นๆ (เช่น Accommodation)
          อยู่ในระหว่างการพัฒนา
          กรุณาติดต่อทีมสนับสนุนสำหรับความช่วยเหลือเพิ่มเติม
        </p>
      </div>
    </div>
  );
};

export default OtherVoucher;
