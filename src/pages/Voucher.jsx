import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import supabase from "../config/supabaseClient";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";
import { Search, Calendar, Filter, RefreshCcw, Plus } from "lucide-react";

import VoucherTable from "../components/voucher/VoucherTable";
import Pagination from "../components/voucher/Pagination";

const Voucher = () => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const navigate = useNavigate();
  const [allBookings, setAllBookings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState(() => {
    return format(startOfMonth(new Date()), "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(() => {
    return format(endOfMonth(new Date()), "yyyy-MM-dd");
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filterType, setFilterType] = useState("all");
  const [voucherStatus, setVoucherStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBookings();
  }, [startDate, endDate, filterType, voucherStatus, sortField, sortDirection]);

  useEffect(() => {
    paginateBookings();
  }, [currentPage, allBookings]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const tourPromise = supabase
        .from("tour_bookings")
        .select(
          `
          *,
          orders:order_id (
            id, first_name, last_name, agent_name, reference_id
          )
        `
        )
        .gte("tour_date", startDate)
        .lte("tour_date", endDate);

      const transferPromise = supabase
        .from("transfer_bookings")
        .select(
          `
          *,
          orders:order_id (
            id, first_name, last_name, agent_name, reference_id
          )
        `
        )
        .gte("transfer_date", startDate)
        .lte("transfer_date", endDate);

      const [tourResult, transferResult] = await Promise.all([
        tourPromise,
        transferPromise,
      ]);

      const tourIds = tourResult.data.map((booking) => booking.id);
      const transferIds = transferResult.data.map((booking) => booking.id);

      const { data: tourVouchers } = await supabase
        .from("vouchers")
        .select("id, booking_id")
        .eq("booking_type", "tour")
        .in("booking_id", tourIds);

      const { data: transferVouchers } = await supabase
        .from("vouchers")
        .select("id, booking_id")
        .eq("booking_type", "transfer")
        .in("booking_id", transferIds);

      const tourVoucherMap = {};
      tourVouchers.forEach((v) => {
        tourVoucherMap[v.booking_id] = v.id;
      });

      const transferVoucherMap = {};
      transferVouchers.forEach((v) => {
        transferVoucherMap[v.booking_id] = v.id;
      });

      const tourBookings = (tourResult.data || []).map((booking) => ({
        ...booking,
        type: "tour",
        booking_date: booking.tour_date,
        booking_type: booking.tour_type,
        recipient: booking.send_to,
        created_at: booking.created_at,
        voucher_status: tourVoucherMap[booking.id] ? "created" : "not_created",
        voucher_id: tourVoucherMap[booking.id] || null,
      }));

      const transferBookings = (transferResult.data || []).map((booking) => ({
        ...booking,
        type: "transfer",
        booking_date: booking.transfer_date,
        booking_type: booking.transfer_type,
        recipient: booking.send_to,
        created_at: booking.created_at,
        voucher_status: transferVoucherMap[booking.id]
          ? "created"
          : "not_created",
        voucher_id: transferVoucherMap[booking.id] || null,
      }));

      let combinedBookings = [...tourBookings, ...transferBookings];

      if (searchTerm) {
        combinedBookings = combinedBookings.filter((booking) => {
          const customerName = booking.orders
            ? `${booking.orders.first_name} ${booking.orders.last_name}`.toLowerCase()
            : "";
          return (
            customerName.includes(searchTerm.toLowerCase()) ||
            (booking.recipient &&
              booking.recipient
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (booking.booking_type &&
              booking.booking_type
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (booking.reference_id &&
              booking.reference_id
                .toLowerCase()
                .includes(searchTerm.toLowerCase()))
          );
        });
      }

      combinedBookings.sort((a, b) => {
        let valueA, valueB;
        switch (sortField) {
          case "recipient":
            valueA = a.recipient || "";
            valueB = b.recipient || "";
            break;
          case "customer":
            valueA = a.orders
              ? `${a.orders.first_name} ${a.orders.last_name}`
              : "";
            valueB = b.orders
              ? `${b.orders.first_name} ${b.orders.last_name}`
              : "";
            break;
          case "booking_type":
            valueA = a.booking_type || "";
            valueB = b.booking_type || "";
            break;
          case "booking_date":
            valueA = a.booking_date || "";
            valueB = b.booking_date || "";
            break;
          case "voucher_status":
            valueA = a.voucher_status || "not_created";
            valueB = b.voucher_status || "not_created";
            break;
          case "created_at":
          default:
            valueA = a.created_at || "";
            valueB = b.created_at || "";
            break;
        }
        if (valueA < valueB) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      });

      setAllBookings(combinedBookings);
      setTotalPages(Math.ceil(combinedBookings.length / itemsPerPage));
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("ไม่สามารถโหลดข้อมูลการจองได้");
    } finally {
      setLoading(false);
    }
  };

  const paginateBookings = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedBookings = allBookings.slice(
      startIndex,
      startIndex + itemsPerPage
    );
    setBookings(paginatedBookings);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const applyDateFilter = () => {
    setCurrentPage(1);
    fetchBookings();
  };

  const changePage = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleCreateVoucher = async (booking) => {
    showInfo(`กำลังสร้าง Voucher สำหรับการจอง ID: ${booking.reference_id}`);
    navigate(`/create-voucher/${booking.type}/${booking.id}`);
  };

  const handleEditVoucher = async (booking) => {
    showInfo(`กำลังแก้ไข Voucher สำหรับการจอง ID: ${booking.reference_id}`);
    navigate(`/create-voucher/${booking.type}/${booking.id}?edit=true`);
  };

  const handleOtherVouchers = () => {
    navigate("/other-vouchers");
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch (error) {
      return dateStr;
    }
  };

  const getCustomerName = (booking) => {
    if (!booking.orders) return "-";
    return (
      `${booking.orders.first_name || ""} ${
        booking.orders.last_name || ""
      }`.trim() || "-"
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">ระบบออก Voucher</h1>
        <p className="text-gray-600">ค้นหาและจัดการ Voucher สำหรับการจอง</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ค้นหาและกรอง</h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่เริ่มต้น
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              วันที่สิ้นสุด
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ประเภท
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">ทั้งหมด</option>
              <option value="tour">Tour</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              สถานะ Voucher
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2"
              value={voucherStatus}
              onChange={(e) => {
                setVoucherStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">ทั้งหมด</option>
              <option value="created">สร้างแล้ว</option>
              <option value="not_created">ยังไม่สร้าง</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition flex items-center justify-center"
              onClick={applyDateFilter}
            >
              <Filter size={18} className="mr-2" />
              กรอง
            </button>
          </div>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อลูกค้า, ผู้รับ, ประเภท..."
            className="pl-10 w-full border border-gray-300 rounded-lg p-2"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">รายการการจองทั้งหมด</h2>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition flex items-center"
              onClick={() => fetchBookings()}
            >
              <RefreshCcw size={16} className="mr-2" />
              รีเฟรช
            </button>
            <button
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition flex items-center"
              onClick={handleOtherVouchers}
            >
              <Plus size={16} className="mr-2" />
              Voucher อื่นๆ
            </button>
          </div>
        </div>

        <VoucherTable
          bookings={bookings}
          loading={loading}
          error={error}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onCreateVoucher={handleCreateVoucher}
          onEditVoucher={handleEditVoucher}
          formatDateDisplay={formatDateDisplay}
          getCustomerName={getCustomerName}
        />

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={changePage}
            itemsPerPage={itemsPerPage}
            totalItems={allBookings.length}
          />
        )}
      </div>
    </div>
  );
};

export default Voucher;
