// src/components/invoice/SummarySection.jsx
import React from "react";

const SummarySection = ({
  showCostProfit,
  selectedPaymentIds,
  totalCost,
  totalSellingPrice,
  totalProfit,
  formatNumberWithCommas,
}) => {
  if (!showCostProfit || selectedPaymentIds.length === 0) return null;

  return (
    <div className="print:hidden mt-6">
      <div className="flex flex-wrap text-center">
        <div className="w-full md:w-1/3 mb-4">
          <p>
            <strong>รวมต้นทุนทั้งหมด:</strong>
            <br />
            <span className="text-2xl font-bold text-blue-500">
              {formatNumberWithCommas(totalCost)}
            </span>
          </p>
        </div>
        <div className="w-full md:w-1/3 mb-4">
          <p>
            <strong>รวมราคาขายทั้งหมด:</strong>
            <br />
            <span className="text-2xl font-bold text-blue-700">
              {formatNumberWithCommas(totalSellingPrice)}
            </span>
          </p>
        </div>
        <div className="w-full md:w-1/3 mb-4">
          <p>
            <strong>กำไรรวมทั้งหมด:</strong>
            <br />
            <span className="text-2xl font-bold text-green-600">
              {formatNumberWithCommas(totalProfit)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
