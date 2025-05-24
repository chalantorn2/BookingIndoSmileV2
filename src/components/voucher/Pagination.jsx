import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  // คำนวณจำนวนรายการที่แสดงในหน้าปัจจุบัน
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // สร้าง array สำหรับเลขหน้า (แสดงสูงสุด 5 หน้า)
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    let startPage;
    if (totalPages <= maxPagesToShow) {
      startPage = 1;
    } else if (currentPage <= 3) {
      startPage = 1;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 4;
    } else {
      startPage = currentPage - 2;
    }

    for (let i = 0; i < Math.min(maxPagesToShow, totalPages); i++) {
      pageNumbers.push(startPage + i);
    }

    return pageNumbers;
  };

  return (
    <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
      <div className="text-sm text-gray-600">
        แสดง {startItem} ถึง {endItem} จากทั้งหมด {totalItems} รายการ
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded-md flex items-center disabled:opacity-50"
        >
          <ChevronLeft size={16} className="mr-1" />
          ก่อนหน้า
        </button>

        <div className="flex space-x-1">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 flex items-center justify-center rounded-md ${
                currentPage === pageNum
                  ? "bg-blue-600 text-white"
                  : "border text-gray-700 hover:bg-gray-100"
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded-md flex items-center disabled:opacity-50"
        >
          ถัดไป
          <ChevronRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
