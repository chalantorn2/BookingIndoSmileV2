// src/components/invoice/InvoiceFooter.jsx
import React from "react";

const InvoiceFooter = ({ grandTotal, formatNumberWithCommas }) => {
  return (
    <div className="invoice-footer mt-8 flex flex-wrap justify-between border-t border-gray-300 pt-4 print:mt-4">
      <div className="w-full md:w-1/2 text-left">
        <p className="mb-1 font-bold">PAYMENT TO SEVENSMILE</p>
        <p className="mb-1">KBank 255-2431-068</p>
        <p className="mb-1">ACCT : SEVENSMILE CO., LTD.</p>
      </div>
      <div className="w-full md:w-1/2 text-right">
        <div className="text-xl font-bold text-gray-800" id="grandTotalDisplay">
          GRAND TOTAL: {formatNumberWithCommas(grandTotal || 0)} THB
        </div>
      </div>
    </div>
  );
};

export default InvoiceFooter;
