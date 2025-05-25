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
  const [paginatedOrders, setPaginatedOrders] = useState([]);

  // เพิ่ม state สำหรับการติดตาม filter ที่ใช้จริง
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
    searchTerm: "",
    filterType: "all",
  });

  // Load orders on mount
  useEffect(() => {
    // Set initial applied filters
    setAppliedFilters({
      startDate,
      endDate,
      searchTerm: "",
      filterType: "all",
    });
    fetchFilteredOrders();
  }, []);

  // Update pagination when orders or current page changes
  useEffect(() => {
    if (orders.length > 0) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginated = orders.slice(startIndex, endIndex);
      setPaginatedOrders(paginated);
      setTotalPages(Math.ceil(orders.length / itemsPerPage));
    } else {
      setPaginatedOrders([]);
      setTotalPages(1);
    }
  }, [orders, currentPage, itemsPerPage]);

  // Load orders with filters
  const fetchFilteredOrders = async (customFilters = null) => {
    setLoading(true);
    setError(null);

    try {
      // ใช้ filters ที่ส่งมาหรือใช้ appliedFilters
      const filtersToUse = customFilters || appliedFilters;

      console.log("Fetching with filters:", filtersToUse);

      const result = await searchOrders({
        startDate: filtersToUse.startDate,
        endDate: filtersToUse.endDate,
        searchTerm: filtersToUse.searchTerm,
        filterType: filtersToUse.filterType,
      });

      if (result.error) throw new Error(result.error);

      console.log("Fetched orders:", result.orders.length);
      setOrders(result.orders);
      setCurrentPage(1); // Reset to first page when filtering
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message || "ไม่สามารถโหลดข้อมูล Order ได้");
      setOrders([]);
      setPaginatedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle view order details
  const handleViewOrderDetails = async (order) => {
    if (!order || !order.id) {
      showError("ไม่พบข้อมูล Order");
      return;
    }

    setLoading(true);

    try {
      console.log("Fetching details for order:", order);
      const { order: orderDetails, error } = await fetchOrderById(order.id);

      if (error) {
        console.error("Error from fetchOrderById:", error);
        throw new Error(error);
      }

      console.log("Order details received:", orderDetails);
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
      await fetchFilteredOrders(); // Refresh with current filters

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
      await fetchFilteredOrders(); // Refresh with current filters
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
      await fetchFilteredOrders(); // Refresh with current filters

      return { success: true };
    } catch (err) {
      console.error("Error deleting order:", err);
      showError("ไม่สามารถลบ Order ได้");
      return { success: false, error: err.message };
    }
  };

  // Handle add booking to order
  const handleAddBooking = (orderId, bookingType) => {
    showInfo(
      `ฟีเจอร์การเพิ่ม ${bookingType} booking ให้กับ Order อยู่ระหว่างการพัฒนา`
    );
  };

  // Handle search term change (live search)
  const handleSearchChange = (term) => {
    setSearchTerm(term);

    // Update applied filters and fetch immediately for live search
    const newFilters = {
      ...appliedFilters,
      searchTerm: term,
    };
    setAppliedFilters(newFilters);
    setCurrentPage(1);

    // Debounce the search if needed
    setTimeout(() => {
      fetchFilteredOrders(newFilters);
    }, 300);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle filter type change
  const handleFilterTypeChange = (type) => {
    setFilterType(type);
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    const newFilters = {
      startDate,
      endDate,
      searchTerm,
      filterType,
    };

    console.log("Applying filters:", newFilters);
    setAppliedFilters(newFilters);
    setCurrentPage(1);
    fetchFilteredOrders(newFilters);
  };

  // Handle order deleted callback
  const handleOrderDeleted = async () => {
    await fetchFilteredOrders(); // Refresh with current filters
  };

  // Generate pagination buttons
  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxButtons; i++) {
          buttons.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - maxButtons + 1; i <= totalPages; i++) {
          buttons.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          buttons.push(i);
        }
      }
    }

    return buttons;
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
        onRefresh={() => fetchFilteredOrders()}
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
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
            orders={paginatedOrders}
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
                  className="px-3 py-1 border rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  ก่อนหน้า
                </button>

                <div className="flex mx-2">
                  {getPaginationButtons().map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "border text-gray-700 hover:bg-gray-100"
                      } mx-1`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
