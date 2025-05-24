// src/components/invoice/ViewInvoicesModal.jsx
import React, { useState } from "react";
import { Search, X, Eye } from "lucide-react";

const ViewInvoicesModal = ({
  isViewModalOpen,
  setIsViewModalOpen,
  invoicesList,
  handleViewSelectedInvoice,
}) => {
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState("");
  const filteredInvoiceList = searchInvoiceQuery
    ? invoicesList.filter(
        (invoice) =>
          (invoice.invoice_name || "")
            .toLowerCase()
            .includes(searchInvoiceQuery.toLowerCase()) ||
          (invoice.invoice_date || "").includes(searchInvoiceQuery)
      )
    : invoicesList.slice(0, 3);

  return (
    <div
      className={`${
        isViewModalOpen
          ? "fixed inset-0 z-50 flex items-center justify-center"
          : "hidden"
      }`}
    >
      {isViewModalOpen && (
        <div
          className="absolute inset-0 modal-backdrop bg-black"
          onClick={() => setIsViewModalOpen(false)}
        />
      )}
      <div
        className="relative bg-white rounded shadow-lg max-w-md w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-bold">เลือก Invoice</h5>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setIsViewModalOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded"
              placeholder="ค้นหาตามชื่อหรือวันที่..."
              value={searchInvoiceQuery}
              onChange={(e) => setSearchInvoiceQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto mb-4">
          {filteredInvoiceList.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              ไม่พบ Invoice ที่ตรงกับคำค้นหา
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoiceList.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => handleViewSelectedInvoice(invoice.id)}
                  className="p-3 border rounded cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">
                      {invoice.invoice_name || "ไม่มีชื่อ"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoice.invoice_date || "ไม่มีวันที่"}
                    </div>
                  </div>
                  <Eye size={18} className="text-blue-500" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={() => setIsViewModalOpen(false)}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoicesModal;
