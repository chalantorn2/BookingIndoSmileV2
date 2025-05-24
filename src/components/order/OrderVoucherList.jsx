import React from "react";
import { Ticket } from "lucide-react";

const OrderVoucherList = ({ vouchers }) => {
  if (!vouchers || vouchers.length === 0) {
    return <span className="text-gray-500">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {vouchers.map((voucher, index) => (
        <span
          key={index}
          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
        >
          <Ticket size={14} className="mr-1" />
          {voucher.year_number}-{voucher.sequence_number}
        </span>
      ))}
    </div>
  );
};

export default OrderVoucherList;
