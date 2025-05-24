import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

const OrderStatusBadge = ({ completed }) => {
  return completed ? (
    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
      <CheckCircle size={14} className="mr-1" />
      เรียบร้อย
    </span>
  ) : (
    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
      <XCircle size={14} className="mr-1" />
      ยังไม่เรียบร้อย
    </span>
  );
};

export default OrderStatusBadge;
