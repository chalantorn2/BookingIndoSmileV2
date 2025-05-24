import React, { useState, useEffect } from "react";
import { format, isValid, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import supabase from "../config/supabaseClient";
import {
  Search,
  Calendar,
  Save,
  PlusCircle,
  Trash2,
  ArrowRight,
  FileText,
  CreditCard,
} from "lucide-react";
import { formatDateForDatabase } from "../utils/dateUtils";
import BookingCard from "../components/payment/BookingCard";
import PaymentRow from "../components/payment/PaymentRow";
import usePayments from "../hooks/usePayments";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";

const Payment = () => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    return formatDateForDatabase(startOfMonth(new Date()));
  });

  const [endDate, setEndDate] = useState(() => {
    return formatDateForDatabase(endOfMonth(new Date()));
  });

  // Use our custom hook for payment operations
  const {
    selectedOrder,
    tourBookings,
    transferBookings,
    selectedBookings,
    paymentTotals,
    loading: paymentLoading,
    error: paymentError,
    setSelectedOrder,
    loadOrderBookings,
    addBookingToPayment,
    removeBookingFromPayment,
    updateBookingField,
    savePaymentData,
    setError: setPaymentError,
  } = usePayments();

  // Apply date filter to fetch orders
  const handleApplyFilter = async () => {
    if (!startDate || !endDate) {
      setError("กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุด");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchOrdersByDateRange(startDate, endDate);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล Order");
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders based on date range
  const fetchOrdersByDateRange = async (start, end) => {
    try {
      // Query orders that have bookings in the date range
      const tourBookingsQuery = supabase
        .from("tour_bookings")
        .select("order_id")
        .gte("tour_date", start)
        .lte("tour_date", end);

      const transferBookingsQuery = supabase
        .from("transfer_bookings")
        .select("order_id")
        .gte("transfer_date", start)
        .lte("transfer_date", end);

      const [tourResult, transferResult] = await Promise.all([
        tourBookingsQuery,
        transferBookingsQuery,
      ]);

      if (tourResult.error) throw tourResult.error;
      if (transferResult.error) throw transferResult.error;

      // Combine unique order IDs
      const orderIdsSet = new Set();

      tourResult.data?.forEach((item) => {
        if (item.order_id) orderIdsSet.add(item.order_id);
      });

      transferResult.data?.forEach((item) => {
        if (item.order_id) orderIdsSet.add(item.order_id);
      });

      const orderIds = Array.from(orderIdsSet);

      if (orderIds.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      // Fetch the actual orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Process orders to include customer info
      const processedOrders = await Promise.all(
        ordersData.map(async (order) => {
          // Count bookings
          const { count: tourCount } = await supabase
            .from("tour_bookings")
            .select("*", { count: "exact" })
            .eq("order_id", order.id);

          const { count: transferCount } = await supabase
            .from("transfer_bookings")
            .select("*", { count: "exact" })
            .eq("order_id", order.id);

          return {
            ...order,
            tourCount: tourCount || 0,
            transferCount: transferCount || 0,
            bookingsCount: (tourCount || 0) + (transferCount || 0),
          };
        })
      );

      setOrders(processedOrders);
      setFilteredOrders(processedOrders);
    } catch (error) {
      console.error("Error in fetchOrdersByDateRange:", error);
      throw error;
    }
  };

  // Handle order selection
  const handleOrderSelect = async (event) => {
    const orderId = parseInt(event.target.value);
    if (!orderId) {
      setSelectedOrder(null);
      return;
    }

    // Find the selected order
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    setSelectedOrder(order);
    await loadOrderBookings(orderId);
  };

  // Save payment data
  const handleSavePayment = async () => {
    if (!selectedOrder) {
      setError("กรุณาเลือก Order ก่อนบันทึกข้อมูล");
      return;
    }

    try {
      const result = await savePaymentData(selectedOrder);
      if (result.success) {
        showSuccess(`บันทึกข้อมูลสำเร็จ! Payment ID: ${result.paymentID}`);
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      setError(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error.message}`);
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = parseISO(dateStr);
      if (isValid(date)) {
        return format(date, "dd/MM/yyyy");
      }
      return dateStr;
    } catch (error) {
      return dateStr;
    }
  };

  // Set error message from either source
  const displayError = error || paymentError;

  const formatPax = (order) => {
    if (!order) return "0";

    const adtCount = parseInt(order.pax_adt || 0);
    const chdCount = parseInt(order.pax_chd || 0);
    const infCount = parseInt(order.pax_inf || 0);

    let paxString = [];
    if (adtCount > 0) paxString.push(adtCount.toString());
    if (chdCount > 0) paxString.push(chdCount.toString());
    if (infCount > 0) paxString.push(infCount.toString());

    return paxString.length > 0 ? paxString.join("+") : "0";
  };

  const handlePaymentEdit = async (paymentData, existingPayment) => {
    if (existingPayment && existingPayment.invoiced) {
      // ถ้า Payment นี้ได้ออก Invoice ไปแล้ว ให้ถามยืนยัน
      const confirmed = await showAlert({
        title: "ยืนยันการแก้ไข Payment",
        description:
          "Payment นี้ได้นำไปสร้าง Invoice แล้ว คุณต้องการนำไปสร้าง Invoice ใหม่หรือไม่?",
        confirmText: "ใช่ นำไปสร้าง Invoice ใหม่",
        cancelText: "ไม่ ยังคงใช้ Invoice เดิม",
        actionVariant: "warning",
      });

      // ถ้ายืนยันว่าต้องการสร้าง Invoice ใหม่ ให้เปลี่ยน invoiced เป็น false
      if (confirmed) {
        paymentData.invoiced = false;
      } else {
        // ถ้าไม่ต้องการสร้าง Invoice ใหม่ ให้คงค่า invoiced เป็น true เหมือนเดิม
        paymentData.invoiced = true;
      }
    }

    // ทำการบันทึกข้อมูลปกติ
    return await savePayment(paymentData);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">กรอข้อมูลการเงิน</h1>
        <p className="text-gray-600">
          จัดการการคิดเงินสำหรับ Orders และ Booking
        </p>
      </div>

      {/* Filter section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-center mb-4">Orders</h2>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <div className="w-full md:w-2/3 lg:w-1/2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <div className="flex items-center border border-gray-400 pr-8 rounded-md">
                  <span className="px-2 text-gray-500">
                    <Calendar size={18} />
                  </span>
                  <input
                    type="date"
                    className="w-full p-2 rounded-md focus:outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <div className="flex items-center border border-gray-400 pr-8 rounded-md">
                  <span className="px-2 text-gray-500">
                    <Calendar size={18} />
                  </span>
                  <input
                    type="date"
                    className="w-full p-2 rounded-md focus:outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-4 flex items-end">
                <button
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition flex items-center justify-center"
                  onClick={handleApplyFilter}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      กำลังโหลด...
                    </span>
                  ) : (
                    <>
                      <Search size={18} className="mr-2" />
                      Filter
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Order
              </label>
              <select
                className="w-full border p-2 rounded-md border-gray-300 shadow-sm"
                onChange={handleOrderSelect}
                disabled={loading}
              >
                <option value="">
                  {loading
                    ? "กำลังโหลดข้อมูล..."
                    : filteredOrders.length === 0
                    ? "กรุณากดปุ่ม Filter เพื่อแสดงรายการ Order"
                    : "เลือก Order"}
                </option>
                {filteredOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {/* {order.reference_id || `Order #${order.id}`} -{" "} */}
                    {order.first_name} {order.last_name} ({order.tourCount || 0}{" "}
                    Tours, {order.transferCount || 0} Transfers)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {displayError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {displayError}
        </div>
      )}

      {selectedOrder && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Order: {selectedOrder.reference_id || `#${selectedOrder.id}`}
              </h2>
              <div>
                <span className="bg-white text-blue-800 text-sm font-medium py-1 px-2 rounded">
                  {selectedOrder.bookingsCount || 0} Bookings
                </span>
              </div>
            </div>
            <p className="text-white text-opacity-90 mt-1">
              {selectedOrder.first_name} {selectedOrder.last_name} |{" "}
              {formatPax(selectedOrder)} คน
            </p>
          </div>

          {/* Bookings display */}
          {paymentLoading ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">กำลังโหลดข้อมูลการจอง...</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tour Bookings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-green-700 flex items-center">
                    <span className="bg-green-100 p-1 rounded-full mr-2">
                      <CreditCard size={18} />
                    </span>
                    Tour Bookings ({tourBookings.length})
                  </h3>
                  {tourBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      ไม่มีการจอง Tour
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {tourBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          type="tour"
                          onAddBooking={addBookingToPayment}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Transfer Bookings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-700 flex items-center">
                    <span className="bg-blue-100 p-1 rounded-full mr-2">
                      <CreditCard size={18} />
                    </span>
                    Transfer Bookings ({transferBookings.length})
                  </h3>
                  {transferBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      ไม่มีการจอง Transfer
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transferBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          type="transfer"
                          onAddBooking={addBookingToPayment}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Bookings Table */}
      {selectedBookings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-4 text-white">
            <h2 className="text-xl font-semibold">Payment Details</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-center">
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "180px" }}
                  >
                    Booking Info
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "180px" }}
                  >
                    Hotel
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "180px" }}
                  >
                    Detail
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "150px" }}
                  >
                    Type
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "150px" }}
                  >
                    Cost
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "100px" }}
                  >
                    Pax
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "150px" }}
                  >
                    Total Cost
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "150px" }}
                  >
                    Sell Price
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "150px" }}
                  >
                    Total Price
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "160px" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "140px" }}
                  >
                    Remark
                  </th>
                  <th
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: "60px" }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedBookings.map((booking, index) => (
                  <PaymentRow
                    key={index}
                    booking={booking}
                    index={index}
                    onRemove={removeBookingFromPayment}
                    onChange={updateBookingField}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {selectedBookings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                <p className="text-gray-600 font-medium">รวมต้นทุนทั้งหมด</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatNumber(paymentTotals.totalCost)}
                </p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg text-center border border-indigo-200">
                <p className="text-gray-600 font-medium">รวมราคาขายทั้งหมด</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {formatNumber(paymentTotals.totalSellingPrice)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                <p className="text-gray-600 font-medium">กำไรรวมทั้งหมด</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatNumber(paymentTotals.totalProfit)}
                </p>
              </div>
            </div>
            <div className="text-center">
              <button
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-md shadow-sm transition-colors flex items-center mx-auto"
                onClick={handleSavePayment}
                disabled={loading || paymentLoading}
              >
                {loading || paymentLoading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    กำลังบันทึก...
                  </span>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
