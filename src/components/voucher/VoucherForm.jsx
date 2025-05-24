import React from "react";

// Component ช่องกรอกข้อมูล Voucher
export const VoucherInput = ({
  name,
  value,
  onChange,
  disabled = false,
  width = "w-4/5",
  placeholder = "",
  className = "", // เพิ่ม prop className
}) => (
  <input
    type="text"
    name={name}
    value={value || ""}
    onChange={onChange}
    disabled={disabled}
    placeholder={placeholder}
    className={`border-b border-gray-500 focus:outline-none ${width} text-center ${
      disabled ? "bg-gray-100 text-gray-400" : ""
    } font-kanit ${className}`} // เพิ่ม className ที่รับเข้ามา
  />
);

// Component สำหรับแสดงรายการใน Service Option
export const ServiceItem = ({ label, name, value, onChange, disabled }) => {
  return (
    <div className="flex items-start mb-3 font-kanit">
      <span className="min-w-[80px] inline-block text-left">{label}:</span>
      <input
        type="text"
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className={`border-b border-gray-500 focus:outline-none w-4/5 text-center ${
          disabled ? "bg-gray-100 text-gray-400" : ""
        } font-kanit`}
      />
    </div>
  );
};
