// src/components/invoice/PaymentSelectionModal.jsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const PaymentSelectionModal = ({
  isSelectModalOpen,
  setIsSelectModalOpen,
  paymentsByMonth,
  selectedPaymentIds,
  setSelectedPaymentIds,
  handleConfirmSelection,
}) => {
  // Get current month in format "YYYY-MM" or match the format used in paymentsByMonth
  const getCurrentMonthKey = () => {
    const months = Object.keys(paymentsByMonth).sort();
    if (months.length === 0) return "";

    // Find current month in the available months
    const now = new Date();
    const currentMonthStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // If current month exists in data, return it
    const currentMonth = months.find(m => m === currentMonthStr);
    if (currentMonth) return currentMonth;

    // Otherwise return the latest month
    return months[months.length - 1];
  };

  const [selectedMonth, setSelectedMonth] = useState("");

  // Initialize selected month when modal opens or paymentsByMonth changes
  useEffect(() => {
    if (isSelectModalOpen && paymentsByMonth) {
      setSelectedMonth(getCurrentMonthKey());
    }
  }, [isSelectModalOpen, paymentsByMonth]);

  const renderPaymentsByMonth = () => {
    const months = Object.keys(paymentsByMonth).sort();
    if (months.length === 0) {
      return (
        <div className="text-yellow-600 bg-yellow-100 p-3 rounded">
          No Payment data found
        </div>
      );
    }

    // Filter payments by selected month
    const paymentsToShow = selectedMonth && paymentsByMonth[selectedMonth]
      ? { [selectedMonth]: paymentsByMonth[selectedMonth] }
      : {};

    if (Object.keys(paymentsToShow).length === 0) {
      return (
        <div className="text-gray-600 bg-gray-100 p-3 rounded">
          No payments available for selected month
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {Object.keys(paymentsToShow).map((month) => (
          <div key={month}>
            <h5 className="pb-2 border-b text-blue-600 font-medium">{month}</h5>
            {paymentsToShow[month].map((payment) => (
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
            Select Payments to Create Invoice
          </h5>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setIsSelectModalOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Month Selection Dropdown */}
        {Object.keys(paymentsByMonth).length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month:
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Object.keys(paymentsByMonth).sort().map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto">
          {renderPaymentsByMonth()}
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={() => setIsSelectModalOpen(false)}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleConfirmSelection}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelectionModal;
