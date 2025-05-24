import React, { useState, useEffect, useRef } from "react";
import { useNotification } from "../../hooks/useNotification";
import { useAlertDialogContext } from "../../contexts/AlertDialogContext";
/**
 * AutocompleteInput - คอมโพเนนต์สำหรับการค้นหาและเพิ่มข้อมูลใหม่
 *
 * @param {Object} props
 * @param {Array} props.options - ตัวเลือกทั้งหมดที่ใช้แสดง [{ id, value, description }]
 * @param {string} props.value - ค่าที่เลือกปัจจุบัน
 * @param {Function} props.onChange - ฟังก์ชันที่เรียกเมื่อค่าเปลี่ยน (value) => void
 * @param {string} props.placeholder - placeholder สำหรับ input
 * @param {Function} props.onAddNew - ฟังก์ชันที่เรียกเมื่อต้องการเพิ่มข้อมูลใหม่ (newValue) => Promise
 * @param {string} props.name - ชื่อของ input field
 * @param {string} props.id - id ของ input field
 */
const AutocompleteInput = ({
  options = [],
  value = "",
  onChange,
  placeholder = "",
  onAddNew,
  name,
  id,
  className = "",
}) => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const wrapperRef = useRef(null);

  // ตั้งค่าค่าเริ่มต้นเมื่อ value เปลี่ยน
  // แก้ไข useEffect ที่ตั้งค่า filteredOptions เริ่มต้น
  // แก้ไขในฟังก์ชัน useEffect ที่ตั้งค่า filteredOptions เริ่มต้น
  useEffect(() => {
    setInputValue(value);

    // หาตัวเลือกที่ตรงกับค่าปัจจุบัน
    if (value && options.length > 0) {
      const option = options.find((opt) => String(opt.value) === String(value));
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }

    // ตั้งค่า filteredOptions เริ่มต้น (แสดงทุกตัวเลือก)
    setFilteredOptions(options.slice(0, Math.min(10, options.length)));

    // เพิ่ม console log เพื่อดูข้อมูล
    console.log("AutocompleteInput options:", options);
  }, [value, options]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // แก้ไขฟังก์ชัน filterOptions ในไฟล์ AutocompleteInput.jsx
  const filterOptions = (input) => {
    if (!input.trim()) {
      // ถ้าไม่มีการพิมพ์ ให้แสดง 5 ข้อมูลแรกหรือข้อมูลทั้งหมดถ้ามีน้อยกว่า 5
      return options.slice(0, Math.min(5, options.length));
    }

    // ถ้ามีการพิมพ์ ให้กรองเฉพาะข้อมูลที่ตรงกับคำที่พิมพ์
    // แก้ไขตรงนี้: ปรับให้ค้นหาแบบไม่คำนึงถึงตัวพิมพ์ใหญ่-เล็ก และมีความยืดหยุ่น
    const filtered = options.filter((option) => {
      const optionValue = String(option.value || "").toLowerCase();
      const searchInput = input.toLowerCase();
      return optionValue.includes(searchInput);
    });

    return filtered.slice(0, Math.min(5, filtered.length));
  };

  const handleInputChange = (e) => {
    const newInputValue = e.target.value;
    setInputValue(newInputValue);

    // กรองตัวเลือก
    const filtered = filterOptions(newInputValue);
    setFilteredOptions(filtered);

    // เปิด dropdown เมื่อมีการพิมพ์
    setIsOpen(true);

    // ไม่ต้องเรียก onChange ทันที เพราะผู้ใช้ยังพิมพ์อยู่
    // ควรจะเรียกเมื่อเลือกจาก dropdown หรือ กดปุ่ม Enter หรือ Click นอกพื้นที่
  };

  // เมื่อเลือกตัวเลือกจาก dropdown
  const handleOptionClick = (option) => {
    setInputValue(option.value);
    setSelectedOption(option);
    setIsOpen(false);

    // เรียก onChange หลังจากอัปเดตค่าภายใน component
    onChange(option.value);
  };

  // เมื่อคลิกปุ่มเพิ่มข้อมูลใหม่
  const handleAddNewClick = async () => {
    const confirmed = await showAlert({
      title: "ยืนยันการเพิ่มข้อมูล",
      description: `คุณต้องการเพิ่ม "${inputValue}" เป็นข้อมูลใหม่ใช่หรือไม่?`,
      confirmText: "เพิ่ม",
      cancelText: "ยกเลิก",
      actionVariant: "success", // ใช้สีเขียวสำหรับปุ่มเพิ่ม
    });

    if (confirmed) {
      setIsAdding(true);
      setNewValue(inputValue);
    }
  };

  // เมื่อบันทึกข้อมูลใหม่
  const handleAddNewSubmit = async () => {
    if (!newValue.trim()) return;

    setIsLoading(true);
    try {
      // เรียกใช้ฟังก์ชัน onAddNew ที่ส่งมาจาก props
      const result = await onAddNew(newValue);

      if (result) {
        // อัปเดตเฉพาะค่าใน component นี้
        setInputValue(result.value);
        setSelectedOption(result);

        // เรียก onChange เพื่อส่งค่ากลับไปยัง parent component
        onChange(result.value);

        // แสดงข้อความแจ้งเตือน
        setTimeout(() => {
          showSuccess(
            `เพิ่มข้อมูล "${result.value}" ลงใน Information เรียบร้อยแล้ว`
          );
        }, 100);
      }
    } catch (error) {
      console.error("Error adding new item:", error);
      showError(
        `เกิดข้อผิดพลาด: ${error.message || "ไม่สามารถเพิ่มข้อมูลได้"}`
      );
    } finally {
      setIsLoading(false);
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  // จัดการเมื่อกดปุ่มบนคีย์บอร์ด
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (isAdding) {
        handleAddNewSubmit();
      } else if (filteredOptions.length > 0) {
        handleOptionClick(filteredOptions[0]);
      } else if (inputValue && !selectedOption) {
        showInfo(
          'ไม่พบข้อมูลที่ตรงกัน กรุณาคลิกที่ปุ่ม "เพิ่ม" เพื่อเพิ่มข้อมูลใหม่'
        );
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      if (isAdding) {
        setIsAdding(false);
      }
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    // แสดงตัวเลือกทั้งหมดเมื่อได้รับ focus
    setFilteredOptions(options.slice(0, Math.min(10, options.length)));
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {!isAdding ? (
        <div className="relative">
          <input
            type="text"
            id={id}
            name={name}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={`w-full border p-2 rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
            autoComplete="off"
          />
          {!isOpen && selectedOption && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  setSelectedOption(null);
                  onChange("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border p-2 rounded-md border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="พิมพ์ข้อมูลใหม่..."
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddNewSubmit}
            className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              "เพิ่ม"
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {isOpen && !isAdding && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option.id || option.value}
                  onClick={() => handleOptionClick(option)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="font-medium">{option.value}</div>
                  {option.description && (
                    <div className="text-sm text-gray-500">
                      {option.description}
                    </div>
                  )}
                </li>
              ))
            ) : inputValue ? (
              // ถ้ามีการพิมพ์แต่ไม่พบข้อมูลที่ตรงกัน
              <li className="p-4 text-center">
                <p className="text-gray-500 mb-2">ไม่พบข้อมูลที่ตรงกัน</p>
                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors inline-flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  เพิ่ม "{inputValue}"
                </button>
              </li>
            ) : (
              // ถ้าไม่มีการพิมพ์แต่ไม่มีข้อมูล
              <li className="p-4 text-center text-gray-500">
                ไม่มีข้อมูลในระบบ กรุณาเพิ่มข้อมูลใหม่
              </li>
            )}
          </ul>

          {/* ปุ่มเพิ่มข้อมูลใหม่ถ้ามีการพิมพ์ แต่ไม่ตรงกับตัวเลือกที่มีอยู่ */}
          {inputValue &&
            !filteredOptions.find(
              (opt) => opt.value.toLowerCase() === inputValue.toLowerCase()
            ) &&
            filteredOptions.length > 0 && (
              <div className="p-2 border-t">
                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-center flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  เพิ่ม "{inputValue}"
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
