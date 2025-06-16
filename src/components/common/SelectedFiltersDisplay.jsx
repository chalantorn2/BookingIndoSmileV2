import React from "react";
import { X } from "lucide-react";

/**
 * SelectedFiltersDisplay - แสดงรายการ filters ที่เลือกไว้ในแนวนอน
 *
 * @param {Object} props
 * @param {Array} props.selectedAgents - รายการ Agent ที่เลือก
 * @param {Array} props.selectedTourRecipients - รายการผู้รับ Tour ที่เลือก
 * @param {Array} props.selectedTransferRecipients - รายการผู้รับ Transfer ที่เลือก
 * @param {Function} props.onRemove - เมื่อต้องการลบ filter (type, value) => void
 */
const SelectedFiltersDisplay = ({
  selectedAgents = [],
  selectedTourRecipients = [],
  selectedTransferRecipients = [],
  onRemove,
}) => {
  // ตรวจสอบว่ามี filter อยู่หรือไม่
  const hasFilters =
    selectedAgents.length > 0 ||
    selectedTourRecipients.length > 0 ||
    selectedTransferRecipients.length > 0;

  if (!hasFilters) {
    return null;
  }

  // ฟังก์ชันสำหรับสร้าง filter tags
  const renderFilterGroup = (items, type, icon, label) => {
    if (items.length === 0) return null;

    const displayLabel = items.length === 1 ? label : `${label}s`;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 flex items-center">
          {icon} {displayLabel}:
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          {items.map((item, index) => (
            <span
              key={`${type}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(type, item)}
                className="flex items-center justify-center w-4 h-4 bg-blue-200 hover:bg-blue-300 rounded-full transition-colors"
                title={`ลบ ${item}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-6 flex-wrap">
        <span className="text-sm font-semibold text-gray-700">
          Selected Filters:
        </span>

        {/* Agent Filters */}
        {renderFilterGroup(selectedAgents, "agent", "🏢", "Agent")}

        {/* Tour Recipient Filters */}
        {renderFilterGroup(
          selectedTourRecipients,
          "tour_recipient",
          "🎯",
          "Tour Recipient"
        )}

        {/* Transfer Recipient Filters */}
        {renderFilterGroup(
          selectedTransferRecipients,
          "transfer_recipient",
          "🚗",
          "Transfer Recipient"
        )}
      </div>
    </div>
  );
};

export default SelectedFiltersDisplay;
