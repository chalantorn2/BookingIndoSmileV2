import React from "react";

const BookingStatusLegend = () => {
  const statuses = [
    { name: "รอดำเนินการ", color: "bg-gray-200" },
    { name: "จองแล้ว", color: "bg-blue-200" },
    { name: "ดำเนินการอยู่", color: "bg-yellow-200" },
    { name: "เสร็จสมบูรณ์", color: "bg-green-200" },
    { name: "ยกเลิก", color: "bg-red-200" },
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-3 py-2 border-y border-gray-200">
      {statuses.map((status) => (
        <div key={status.name} className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${status.color}`}></div>
          <span className="text-sm text-gray-600">{status.name}</span>
        </div>
      ))}
    </div>
  );
};

export default BookingStatusLegend;
