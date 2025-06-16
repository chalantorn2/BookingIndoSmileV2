import React, { useState } from "react";
import { Plus } from "lucide-react";
import AutocompleteInput from "./AutocompleteInput";

/**
 * FilterInputWithAdd - AutocompleteInput พร้อมปุ่มเพิ่มสำหรับ Report
 *
 * @param {Object} props
 * @param {Array} props.options - ตัวเลือกทั้งหมด
 * @param {string} props.value - ค่าปัจจุบันใน input
 * @param {Function} props.onChange - เมื่อค่าใน input เปลี่ยน
 * @param {Function} props.onAdd - เมื่อกดปุ่มเพิ่ม (รับค่าที่จะเพิ่ม)
 * @param {Function} props.onAddNew - เมื่อต้องการเพิ่มข้อมูลใหม่ลงระบบ
 * @param {string} props.placeholder - placeholder ของ input
 * @param {Array} props.selectedItems - รายการที่เลือกไว้แล้ว (เพื่อป้องกันเลือกซ้ำ)
 * @param {boolean} props.disabled - ปิดการใช้งาน
 * @param {string} props.name - ชื่อของ input
 * @param {string} props.id - id ของ input
 */
const FilterInputWithAdd = ({
  options = [],
  value = "",
  onChange,
  onAdd,
  onAddNew,
  placeholder = "",
  selectedItems = [],
  disabled = false,
  name,
  id,
}) => {
  const [currentInputValue, setCurrentInputValue] = useState("");

  // จัดการเมื่อค่าใน AutocompleteInput เปลี่ยน
  const handleInputChange = (newValue) => {
    setCurrentInputValue(newValue);
    onChange(newValue);
  };

  // จัดการเมื่อกดปุ่มเพิ่ม
  const handleAddClick = () => {
    if (!currentInputValue.trim()) return;

    // ตรวจสอบว่าเลือกซ้ำหรือไม่
    const alreadySelected = selectedItems.some(
      (item) => item.toLowerCase() === currentInputValue.toLowerCase()
    );

    if (alreadySelected) {
      alert(`"${currentInputValue}" ถูกเลือกไว้แล้ว`);
      return;
    }

    // เรียก callback เพื่อเพิ่มลงรายการ
    onAdd(currentInputValue);

    // เคลียร์ input
    setCurrentInputValue("");
    onChange("");
  };

  // ตรวจสอบว่าควรแสดงปุ่มเพิ่มหรือไม่
  const shouldShowAddButton = currentInputValue.trim() && !disabled;

  return (
    <div className="flex items-center gap-2">
      {/* AutocompleteInput */}
      <div className="flex-1">
        <AutocompleteInput
          options={options}
          value={currentInputValue}
          onChange={handleInputChange}
          onAddNew={onAddNew}
          placeholder={placeholder}
          name={name}
          id={id}
          className={disabled ? "opacity-50 pointer-events-none" : ""}
        />
      </div>

      {/* ปุ่มเพิ่ม */}
      {shouldShowAddButton && (
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          title={`เพิ่ม "${currentInputValue}" ลงในรายการ`}
        >
          <Plus size={16} className="mr-1" />
          เพิ่ม
        </button>
      )}
    </div>
  );
};

export default FilterInputWithAdd;
