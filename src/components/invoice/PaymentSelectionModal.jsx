// src/components/invoice/PaymentSelectionModal.jsx
import React from "react";
import { X } from "lucide-react";

const PaymentSelectionModal = ({
  isSelectModalOpen,
  setIsSelectModalOpen,
  paymentsByMonth,
  selectedPaymentIds,
  setSelectedPaymentIds,
  handleConfirmSelection,
}) => {
  const renderPaymentsByMonth = () => {
    const months = Object.keys(paymentsByMonth).sort();
    if (months.length === 0) {
      return (
        <div className="text-yellow-600 bg-yellow-100 p-3 rounded">
          ไม่พบข้อมูล Payment
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {months.map((month) => (
          <div key={month}>
            <h5 className="pb-2 border-b text-blue-600 font-medium">{month}</h5>
            {paymentsByMonth[month].map((payment) => (
              <label
                key={payment.id}
                className="flex items-center mb-2 pl-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mr-2 rounded"
                  value={payment.id}
                  checked={selectedPaymentIds.includes(payment.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPaymentIds([
                        ...selectedPaymentIds,
                        payment.id,
                      ]);
                    } else {
                      setSelectedPaymentIds(
                        selectedPaymentIds.filter((id) => id !== payment.id)
                      );
                    }
                  }}
                />
                <span>
                  {payment.displayName}
                  {payment.dateRangeStr}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`${
        isSelectModalOpen
          ? "fixed inset-0 z-50 flex items-center justify-center"
          : "hidden"
      }`}
    >
      {isSelectModalOpen && (
        <div
          className="absolute inset-0 modal-backdrop"
          onClick={() => setIsSelectModalOpen(false)}
        />
      )}
      <div
        className="relative bg-white rounded shadow-lg max-w-4xl w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-bold">
            เลือก Payments ที่ต้องการสร้าง Invoice
          </h5>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setIsSelectModalOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {renderPaymentsByMonth()}
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={() => setIsSelectModalOpen(false)}
          >
            ปิด
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleConfirmSelection}
          >
            ยืนยันการเลือก
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelectionModal;
