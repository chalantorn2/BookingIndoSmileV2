import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  fetchOrderById,
  updateOrder,
  updateOrderNote,
  updateOrderStatus,
  deleteOrder,
  searchOrders,
} from "../services/orderService";
import OrderTable from "../components/order/OrderTable";
import OrderDetails from "../components/order/OrderDetails";
import OrderFilter from "../components/order/OrderFilter";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ViewOrders = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const showAlert = useAlertDialogContext();

  // State variables
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return format(firstDayOfMonth, "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );
    return format(lastDayOfMonth, "yyyy-MM-dd");
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, completed, incomplete

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // First load effect - ใช้ searchOrders แทน fetchAllOrders
  useEffect(() => {
    fetchFilteredOrders();
  }, []);

  // Load orders with filters
  const fetchFilteredOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await searchOrders({
        startDate,
        endDate,
        searchTerm,
        filterType,
      });

      if (result.error) throw new Error(result.error);

      setOrders(result.orders);
      setTotalPages(Math.ceil(result.orders.length / itemsPerPage));
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message || "ไม่สามารถโหลดข้อมูล Order ได้");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // ในฟังก์ชัน handleViewOrderDetails
  const handleViewOrderDetails = async (order) => {
    setLoading(true);

    try {
      console.log("Fetching details for order:", order);
      const { order: orderDetails, error } = await fetchOrderById(order.id);

      if (error) {
        console.error("Error from fetchOrderById:", error);
        throw new Error(error);
      }

      console.log("Order details received:", orderDetails);
      console.log("Tour bookings:", orderDetails?.tourBookings);
      console.log("Transfer bookings:", orderDetails?.transferBookings);

      setSelectedOrder(orderDetails);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Error fetching order details:", err);
      showError("ไม่สามารถโหลดข้อมูล Order ได้");
    } finally {
      setLoading(false);
    }
  };

  // Handle save order changes
  const handleSaveOrder = async (updatedOrder) => {
    try {
      const { success, error } = await updateOrder(
        updatedOrder.id,
        updatedOrder
      );

      if (!success) throw new Error(error);

      showSuccess("บันทึกข้อมูลเรียบร้อยแล้ว");
      await fetchFilteredOrders();

      return { success: true };
    } catch (err) {
      console.error("Error saving order:", err);
      showError("ไม่สามารถบันทึกข้อมูลได้");
      return { success: false, error: err.message };
    }
  };

  // Handle update order note
  const handleUpdateNote = async (orderId, note) => {
    try {
      const { success, error } = await updateOrderNote(orderId, note);

      if (!success) throw new Error(error);

      showSuccess("บันทึกหมายเหตุเรียบร้อยแล้ว");
      await fetchFilteredOrders();
    } catch (err) {
      console.error("Error updating note:", err);
      showError("ไม่สามารถบันทึกหมายเหตุได้");
    }
  };

  // Handle delete order
  const handleDeleteOrder = async (orderId) => {
    try {
      const confirmed = await showAlert({
        title: "ยืนยันการลบ Order",
        description:
          "คุณต้องการลบ Order นี้ใช่หรือไม่? การลบจะทำให้ Booking ใน Order ถูกปลดออกทั้งหมด",
        confirmText: "ลบ",
        cancelText: "ยกเลิก",
        actionVariant: "destructive",
      });

      if (!confirmed) return { success: false };

      const { success, error } = await deleteOrder(orderId);

      if (!success) throw new Error(error);

      showSuccess("ลบ Order เรียบร้อยแล้ว");
      setIsModalOpen(false);
      await fetchFilteredOrders();

      return { success: true };
    } catch (err) {
      console.error("Error deleting order:", err);
      showError("ไม่สามารถลบ Order ได้");
      return { success: false, error: err.message };
    }
  };

  // Handle add booking to order
  const handleAddBooking = (orderId, bookingType) => {
    // ส่วนนี้จะต้องพัฒนาต่อไป เช่น เปิด modal เพื่อเลือก booking ที่ต้องการเพิ่ม
    showInfo(
      `ฟีเจอร์การเพิ่ม ${bookingType} booking ให้กับ Order อยู่ระหว่างการพัฒนา`
    );
  };

  // Handle search term change
  const handleSearchChange = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle filter type change
  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    fetchFilteredOrders();
  };

  const handleOrderDeleted = async () => {
    await fetchFilteredOrders(); // รีเฟรชข้อมูล orders
  };

  // Calculate pagination
  const getPaginatedOrders = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return orders.slice(startIndex, endIndex);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">จัดการ Order</h1>
        <p className="text-gray-600">ดูและจัดการรายการ Order ที่มีในระบบ</p>
      </div>

      <OrderFilter
        startDate={startDate}
        endDate={endDate}
        searchTerm={searchTerm}
        filterType={filterType}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onSearchChange={handleSearchChange}
        onFilterTypeChange={handleFilterTypeChange}
        onApplyFilters={handleApplyFilters}
        onRefresh={fetchFilteredOrders}
      />

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          {orders.length > 0 ? (
            <>
              แสดงรายการ {(currentPage - 1) * itemsPerPage + 1} ถึง{" "}
              {Math.min(currentPage * itemsPerPage, orders.length)} จาก{" "}
              {orders.length} รายการ
            </>
          ) : (
            "ไม่พบข้อมูล"
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-md">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent "></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* Show table view */}
          <OrderTable
            orders={getPaginatedOrders()}
            onViewDetails={handleViewOrderDetails}
            onUpdateNote={handleUpdateNote}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded-md flex items-center disabled:opacity-50"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  ก่อนหน้า
                </button>

                <div className="flex mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "border text-gray-700 hover:bg-gray-100"
                        } mx-1`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-md flex items-center disabled:opacity-50"
                >
                  ถัดไป
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </nav>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveOrder}
          onOrderDeleted={handleOrderDeleted}
          onAddBooking={handleAddBooking}
        />
      )}
    </div>
  );
};

export default ViewOrders;
