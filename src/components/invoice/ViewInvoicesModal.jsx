// src/components/invoice/ViewInvoicesModal.jsx
import React, { useState, useEffect } from "react";
import { Search, X, Eye } from "lucide-react";

const ViewInvoicesModal = ({
  isViewModalOpen,
  setIsViewModalOpen,
  invoicesList,
  handleViewSelectedInvoice,
}) => {
  const [searchInvoiceQuery, setSearchInvoiceQuery] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // แสดง 3 รายการล่าสุดเมื่อไม่มีการค้นหา
  const recentInvoices = invoicesList
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  // จัดการการค้นหา
  useEffect(() => {
    if (searchInvoiceQuery.trim()) {
      const filtered = invoicesList.filter(
        (invoice) =>
          (invoice.invoice_name || "")
            .toLowerCase()
            .includes(searchInvoiceQuery.toLowerCase()) ||
          (invoice.invoice_date || "").includes(searchInvoiceQuery)
      );
      setFilteredInvoices(filtered);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
      setFilteredInvoices([]);
    }
  }, [searchInvoiceQuery, invoicesList]);

  const displayInvoices = showSearchResults ? filteredInvoices : recentInvoices;
  const displayTitle = showSearchResults
    ? `ผลการค้นหา (${filteredInvoices.length} รายการ)`
    : "Invoice ล่าสุด (3 รายการ)";

  if (!isViewModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={() => setIsViewModalOpen(false)}
      />
      <div
        className="relative bg-white rounded shadow-lg max-w-md w-full p-4 mx-4"
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

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ค้นหาตามชื่อหรือวันที่..."
              value={searchInvoiceQuery}
              onChange={(e) => setSearchInvoiceQuery(e.target.value)}
            />
          </div>
          {searchInvoiceQuery && (
            <button
              onClick={() => setSearchInvoiceQuery("")}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              ล้างการค้นหา
            </button>
          )}
        </div>

        {/* Invoice List */}
        <div className="max-h-60 overflow-y-auto mb-4">
          <h6 className="text-sm font-medium text-gray-600 mb-2">
            {displayTitle}
          </h6>

          {displayInvoices.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              {showSearchResults
                ? "ไม่พบ Invoice ที่ตรงกับคำค้นหา"
                : "ไม่พบข้อมูล Invoice"}
            </div>
          ) : (
            <div className="space-y-2">
              {displayInvoices.map((invoice) => (
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
                    <div className="text-xs text-gray-400 mt-1">
                      ยอดรวม:{" "}
                      {parseFloat(invoice.total_amount || 0).toLocaleString()}{" "}
                      บาท
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <Eye size={18} className="text-blue-500" />

                    {/* แสดงสถานะ */}
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        invoice.status
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {invoice.status ? "เรียบร้อย" : "ไม่เรียบร้อย"}
                    </span>

                    {/* แสดงจำนวนไฟล์แนบ */}
                    {invoice.attachments && invoice.attachments.length > 0 && (
                      <span className="text-xs text-blue-600">
                        {invoice.attachments.length} ไฟล์
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
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
