import React from "react";
import {
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Edit,
  Plus,
} from "lucide-react";

const VoucherTable = ({
  bookings,
  loading,
  error,
  currentPage,
  itemsPerPage,
  sortField,
  sortDirection,
  onSort,
  onCreateVoucher,
  onEditVoucher,
  formatDateDisplay,
  getCustomerName,
}) => {
  // ตัวจัดการการเรียงลำดับ
  const handleSort = (field) => {
    onSort(field);
  };

  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>ไม่พบข้อมูลการจอง</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("created_at")}
              >
                <div className="flex items-center">
                  <span>ลำดับ</span>
                  {sortField === "created_at" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("recipient")}
              >
                <div className="flex items-center">
                  <span>ส่งใคร</span>
                  {sortField === "recipient" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("customer")}
              >
                <div className="flex items-center">
                  <span>ชื่อลูกค้า</span>
                  {sortField === "customer" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("booking_type")}
              >
                <div className="flex items-center">
                  <span>ประเภท</span>
                  {sortField === "booking_type" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("booking_date")}
              >
                <div className="flex items-center">
                  <span>วันที่</span>
                  {sortField === "booking_date" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("voucher_status")}
              >
                <div className="flex items-center">
                  <span>สถานะ Voucher</span>
                  {sortField === "voucher_status" && (
                    <span className="ml-1">
                      {sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                จัดการ Voucher
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking, index) => (
              <tr
                key={`${booking.type}-${booking.id}`}
                className={
                  booking.type === "tour" ? "bg-green-50" : "bg-blue-50"
                }
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {booking.recipient || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {getCustomerName(booking)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.type === "tour"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {booking.booking_type ||
                      (booking.type === "tour" ? "Tour" : "Transfer")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {formatDateDisplay(booking.booking_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.voucher_status === "created"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    <span className="flex items-center">
                      {booking.voucher_status === "created" ? (
                        <>
                          <CheckCircle size={14} className="mr-1" />
                          สร้างแล้ว
                        </>
                      ) : (
                        <>
                          <XCircle size={14} className="mr-1" />
                          ยังไม่สร้าง
                        </>
                      )}
                    </span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => {
                      if (booking.voucher_status === "created") {
                        onEditVoucher(booking);
                      } else {
                        onCreateVoucher(booking);
                      }
                    }}
                    className={`px-3 py-1 rounded flex items-center justify-center ${
                      booking.voucher_status === "created"
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : booking.type === "tour"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {booking.voucher_status === "created" ? (
                      <>
                        <Edit size={14} className="mr-1" />
                        แก้ไข
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="mr-1" />
                        สร้าง
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default VoucherTable;
