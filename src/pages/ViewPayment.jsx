import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Search, Calendar, Eye, DollarSign } from "lucide-react";
import supabase from "../config/supabaseClient";
import { useInformation } from "../contexts/InformationContext";
import AutocompleteInput from "../components/common/AutocompleteInput";
import BookingDetailModal from "../components/booking/BookingDetailModal";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";

const ViewPayment = () => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const [selectedType, setSelectedType] = useState("tour"); // 'tour' หรือ 'transfer'
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const { tourRecipients, transferRecipients } = useInformation();

  // เลือก recipient options ตาม type
  const recipientOptions =
    selectedType === "tour" ? tourRecipients : transferRecipients;

  // โหลดข้อมูล bookings
  const fetchBookings = async (pageNumber = 1) => {
    if (!selectedRecipient) return;

    setLoading(true);
    setError(null);

    try {
      const table =
        selectedType === "tour" ? "tour_bookings" : "transfer_bookings";
      const dateField = selectedType === "tour" ? "tour_date" : "transfer_date";

      // นับจำนวนทั้งหมดก่อน
      const { count, error: countError } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("send_to", selectedRecipient)
        .gte(dateField, startDate)
        .lte(dateField, endDate);

      if (countError) throw countError;

      // Query bookings with order information และ pagination
      const { data, error: queryError } = await supabase
        .from(table)
        .select(
          `
          *,
          orders (
            first_name,
            last_name,
            reference_id
          )
        `
        )
        .eq("send_to", selectedRecipient)
        .gte(dateField, startDate)
        .lte(dateField, endDate)
        .order(dateField, { ascending: false })
        .range((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage - 1);

      if (queryError) throw queryError;

      setBookings(data || []);
      setTotalPages(Math.ceil(count / itemsPerPage));
      setCurrentPage(pageNumber);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // เปลี่ยนสถานะการจ่ายเงิน
  const handlePaymentStatusChange = async (bookingId, status) => {
    try {
      const table =
        selectedType === "tour" ? "tour_bookings" : "transfer_bookings";

      const { error } = await supabase
        .from(table)
        .update({
          payment_status: status,
          payment_date: status === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", bookingId);

      if (error) throw error;

      // รีเฟรชข้อมูล
      fetchBookings(currentPage);
    } catch (error) {
      console.error("Error updating payment status:", error);
      showError("ไม่สามารถอัพเดทสถานะได้");
    }
  };

  // เพิ่มฟังก์ชันอัพเดทหมายเหตุ
  const handleNoteChange = async (bookingId, note) => {
    try {
      const table =
        selectedType === "tour" ? "tour_bookings" : "transfer_bookings";

      const { error } = await supabase
        .from(table)
        .update({
          payment_note: note,
        })
        .eq("id", bookingId);

      if (error) throw error;

      // รีเฟรชข้อมูล
      fetchBookings(currentPage);
    } catch (error) {
      console.error("Error updating payment note:", error);
      showError("ไม่สามารถอัพเดทหมายเหตุได้");
    }
  };

  // เปิด modal ดูรายละเอียด
  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // โหลดข้อมูลเมื่อเลือกผู้รับ
  useEffect(() => {
    if (selectedRecipient) {
      fetchBookings(1);
    } else {
      setBookings([]);
      setCurrentPage(1);
      setTotalPages(1);
    }
  }, [selectedRecipient, startDate, endDate]);

  // Reset เมื่อเปลี่ยนประเภท
  useEffect(() => {
    setSelectedRecipient("");
    setBookings([]);
    setCurrentPage(1);
    setTotalPages(1);
  }, [selectedType]);

  // คำนวณยอดรวม
  const totalAmount = bookings.reduce((sum, booking) => {
    return sum + (parseFloat(booking.cost_price) || 0);
  }, 0);

  return (
    <div className="container mx-auto px-4 py-6  bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">ตรวจสอบการจ่ายเงิน</h1>
        <p className="text-gray-600">ตรวจสอบสถานะการจ่ายเงินให้กับผู้รับ</p>
      </div>

      {/* ส่วนเลือกประเภทและตัวกรอง */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* เลือกประเภท */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประเภท
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setSelectedType("tour")}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  selectedType === "tour"
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Tour
              </button>
              <button
                onClick={() => setSelectedType("transfer")}
                className={`flex-1 py-2 px-4 rounded-lg border ${
                  selectedType === "transfer"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* เลือกผู้รับ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ส่งใคร
            </label>
            <AutocompleteInput
              options={recipientOptions}
              value={selectedRecipient}
              onChange={setSelectedRecipient}
              placeholder={`เลือก ${
                selectedType === "tour" ? "Tour" : "Transfer"
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* วันที่เริ่มต้น */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่เริ่มต้น
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
          </div>

          {/* วันที่สิ้นสุด */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่สิ้นสุด
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ตารางแสดงผล */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
          {error}
        </div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold">
              รายการของ {selectedRecipient} (ทั้งหมด {bookings.length} รายการ)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              ยอดรวมทั้งหมด: {totalAmount.toLocaleString()} บาท
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    รหัสอ้างอิง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ชื่อลูกค้า
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    วันที่
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    ยอดเงิน
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    สถานะการจ่าย
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    หมายเหตุ
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    รายละเอียด
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking, index) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {booking.reference_id || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {booking.orders
                        ? `${booking.orders.first_name} ${booking.orders.last_name}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        try {
                          const dateValue =
                            selectedType === "tour"
                              ? booking.tour_date
                              : booking.transfer_date;
                          if (!dateValue) return "-";
                          const date = new Date(dateValue);
                          if (isNaN(date.getTime())) return "-";
                          return format(date, "dd/MM/yyyy");
                        } catch (error) {
                          console.error("Date format error:", error);
                          return "-";
                        }
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {booking.cost_price
                        ? parseFloat(booking.cost_price).toLocaleString()
                        : "0"}{" "}
                      บาท
                    </td>
                    <td className="px-4 py-3  whitespace-nowrap text-center">
                      <select
                        value={booking.payment_status || "not_paid"}
                        onChange={(e) =>
                          handlePaymentStatusChange(booking.id, e.target.value)
                        }
                        className={`px-2 py-1 rounded-full text-sm ${
                          booking.payment_status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <option value="not_paid">ยังไม่จ่าย</option>
                        <option value="paid">จ่ายแล้ว</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={booking.payment_note || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          // ไม่ต้องทำอะไร แค่ให้แก้ไขได้
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== booking.payment_note) {
                            handleNoteChange(booking.id, e.target.value);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.target.blur();
                          }
                        }}
                        className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none rounded transition-colors"
                        placeholder="คลิกเพื่อเพิ่มหมายเหตุ"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewBooking(booking)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center py-4 border-t bg-gray-50">
              <button
                onClick={() => fetchBookings(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
              >
                ก่อนหน้า
              </button>

              {[...Array(Math.min(5, totalPages))].map((_, index) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = index + 1;
                } else if (currentPage <= 3) {
                  pageNumber = index + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + index;
                } else {
                  pageNumber = currentPage - 2 + index;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => fetchBookings(pageNumber)}
                    className={`px-3 py-1 rounded-md mx-1 ${
                      currentPage === pageNumber
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => fetchBookings(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
          {selectedRecipient ? "ไม่พบข้อมูล" : "กรุณาเลือกผู้รับ"}
        </div>
      )}

      {/* Modal แสดงรายละเอียด */}
      {isModalOpen && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          bookingType={selectedType}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBooking(null);
          }}
          onSave={async (updatedBooking) => {
            try {
              // เรียกใช้ API เพื่ออัพเดทข้อมูลใน database
              const table =
                selectedType === "tour" ? "tour_bookings" : "transfer_bookings";
              const { error } = await supabase
                .from(table)
                .update(updatedBooking)
                .eq("id", updatedBooking.id);

              if (error) throw error;

              // รีเฟรชข้อมูลและปิด modal
              await fetchBookings(currentPage);
              setIsModalOpen(false);
              showSuccess("อัพเดทข้อมูลเรียบร้อย");
              return { success: true };
            } catch (error) {
              console.error("Error updating booking:", error);
              showError("ไม่สามารถอัพเดทข้อมูลได้");
              return { success: false, error: error.message };
            }
          }}
          onDelete={async (id) => {
            // ถ้าคุณต้องการให้ลบได้ด้วย ให้แก้ไขส่วนนี้เป็น:
            try {
              const confirmed = await showAlert({
                title: "ยืนยันการลบ",
                description: "คุณต้องการลบรายการนี้ใช่หรือไม่?",
                confirmText: "ลบ",
                cancelText: "ยกเลิก",
                actionVariant: "destructive",
              });

              if (!confirmed) return { success: false };

              const table =
                selectedType === "tour" ? "tour_bookings" : "transfer_bookings";
              const { error } = await supabase
                .from(table)
                .delete()
                .eq("id", id);

              if (error) throw error;

              // รีเฟรชข้อมูลและปิด modal
              await fetchBookings(currentPage);
              setIsModalOpen(false);
              showSuccess("ลบข้อมูลเรียบร้อย");
              return { success: true };
            } catch (error) {
              console.error("Error deleting booking:", error);
              showError("ไม่สามารถลบข้อมูลได้");
              return { success: false, error: error.message };
            }
          }}
        />
      )}
    </div>
  );
};

export default ViewPayment;
