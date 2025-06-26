import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { th } from "date-fns/locale";
import {
  X,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Filter,
  Users,
  DollarSign,
} from "lucide-react";

const ExportModal = ({
  tourBookings,
  transferBookings,
  onConfirm,
  onCancel,
  selectedMonth,
  exportFormat,
  exportRange,
}) => {
  // States
  const [selectedTourIds, setSelectedTourIds] = useState(new Set());
  const [selectedTransferIds, setSelectedTransferIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredTourBookings, setFilteredTourBookings] = useState([]);
  const [filteredTransferBookings, setFilteredTransferBookings] = useState([]);

  // Filter bookings by export range
  const filterBookingsByRange = (bookings, type) => {
    if (!bookings || bookings.length === 0) return [];

    const monthStart = startOfMonth(new Date(selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedMonth));

    let startDate, endDate;

    switch (exportRange) {
      case "first_15":
        startDate = monthStart;
        endDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 15);
        break;
      case "last_15":
        startDate = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth(),
          16
        );
        endDate = monthEnd;
        break;
      case "full_month":
      default:
        startDate = monthStart;
        endDate = monthEnd;
        break;
    }

    const dateField = type === "tour" ? "tour_date" : "transfer_date";

    return bookings.filter((booking) => {
      const bookingDate = new Date(booking[dateField]);
      const bookingDateOnly = format(bookingDate, "yyyy-MM-dd");
      const startDateOnly = format(startDate, "yyyy-MM-dd");
      const endDateOnly = format(endDate, "yyyy-MM-dd");

      return bookingDateOnly >= startDateOnly && bookingDateOnly <= endDateOnly;
    });
  };

  // Initialize filtered bookings
  useEffect(() => {
    const newFilteredTours = filterBookingsByRange(tourBookings, "tour");
    const newFilteredTransfers = filterBookingsByRange(
      transferBookings,
      "transfer"
    );

    setFilteredTourBookings(newFilteredTours);
    setFilteredTransferBookings(newFilteredTransfers);
  }, [tourBookings, transferBookings, selectedMonth, exportRange]);

  // Initialize all bookings as selected when filtered bookings change
  useEffect(() => {
    setSelectedTourIds(new Set(filteredTourBookings.map((b) => b.id)));
    setSelectedTransferIds(new Set(filteredTransferBookings.map((b) => b.id)));
  }, [filteredTourBookings, filteredTransferBookings]);

  // Helper functions
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0";
    return parseFloat(amount).toLocaleString();
  };

  const formatPax = (booking) => {
    if (booking.orders) {
      const adt = parseInt(booking.orders.pax_adt) || 0;
      const chd = parseInt(booking.orders.pax_chd) || 0;
      const inf = parseInt(booking.orders.pax_inf) || 0;

      let paxParts = [];
      if (adt > 0) paxParts.push(adt.toString());
      if (chd > 0) paxParts.push(chd.toString());
      if (inf > 0) paxParts.push(inf.toString());

      return paxParts.length > 0 ? paxParts.join("+") : "0";
    }
    return booking.pax || "0";
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        label: "รอดำเนินการ",
        color: "text-gray-600",
        bg: "bg-gray-100",
        icon: "⚫",
      },
      booked: {
        label: "จองแล้ว",
        color: "text-blue-600",
        bg: "bg-blue-100",
        icon: "🔵",
      },
      in_progress: {
        label: "ดำเนินการอยู่",
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        icon: "🟡",
      },
      completed: {
        label: "เสร็จสมบูรณ์",
        color: "text-green-600",
        bg: "bg-green-100",
        icon: "🟢",
      },
      cancelled: {
        label: "ยกเลิก",
        color: "text-red-600",
        bg: "bg-red-100",
        icon: "🔴",
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  // Filter bookings by status
  const filterBookingsByStatus = (bookings) => {
    if (statusFilter === "all") return bookings;
    return bookings.filter((booking) => booking.status === statusFilter);
  };

  // Group bookings by date
  const groupBookingsByDate = () => {
    // ใช้ filtered bookings แทน original bookings
    const statusFilteredTours = filterBookingsByStatus(filteredTourBookings);
    const statusFilteredTransfers = filterBookingsByStatus(
      filteredTransferBookings
    );

    const allBookings = [
      ...statusFilteredTours.map((b) => ({
        ...b,
        type: "tour",
        date: b.tour_date,
      })),
      ...statusFilteredTransfers.map((b) => ({
        ...b,
        type: "transfer",
        date: b.transfer_date,
      })),
    ];

    const grouped = {};
    allBookings.forEach((booking) => {
      const dateKey = booking.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });

    // Sort by time within each date
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA =
          a.type === "tour"
            ? a.tour_pickup_time || "23:59"
            : a.transfer_time || "23:59";
        const timeB =
          b.type === "tour"
            ? b.tour_pickup_time || "23:59"
            : b.transfer_time || "23:59";
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  };

  // Calculate summary
  const calculateSummary = () => {
    // ใช้ filtered bookings แทน original bookings
    const statusFilteredTours = filterBookingsByStatus(filteredTourBookings);
    const statusFilteredTransfers = filterBookingsByStatus(
      filteredTransferBookings
    );

    const selectedTours = statusFilteredTours.filter((b) =>
      selectedTourIds.has(b.id)
    );
    const selectedTransfers = statusFilteredTransfers.filter((b) =>
      selectedTransferIds.has(b.id)
    );

    const totalBookings =
      statusFilteredTours.length + statusFilteredTransfers.length;
    const selectedBookings = selectedTours.length + selectedTransfers.length;

    const totalAmount = [
      ...statusFilteredTours,
      ...statusFilteredTransfers,
    ].reduce((sum, b) => sum + (parseFloat(b.selling_price) || 0), 0);

    const selectedAmount = [...selectedTours, ...selectedTransfers].reduce(
      (sum, b) => sum + (parseFloat(b.selling_price) || 0),
      0
    );

    // Status breakdown
    const statusBreakdown = {};
    [...selectedTours, ...selectedTransfers].forEach((booking) => {
      const status = booking.status || "pending";
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = { count: 0, amount: 0 };
      }
      statusBreakdown[status].count++;
      statusBreakdown[status].amount += parseFloat(booking.selling_price) || 0;
    });

    return {
      totalBookings,
      selectedBookings,
      totalAmount,
      selectedAmount,
      statusBreakdown,
    };
  };

  // Handle selection - แก้ไขให้ชัดเจนขึ้น
  const handleTourSelect = (id, checked) => {
    console.log("Tour select:", id, checked); // Debug log
    setSelectedTourIds((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      console.log("New tour selected:", Array.from(newSelected)); // Debug log
      return newSelected;
    });
  };

  const handleTransferSelect = (id, checked) => {
    console.log("Transfer select:", id, checked); // Debug log
    setSelectedTransferIds((prev) => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      console.log("New transfer selected:", Array.from(newSelected)); // Debug log
      return newSelected;
    });
  };

  const handleSelectAllTour = () => {
    // ใช้ filtered bookings แทน original bookings
    const statusFilteredTours = filterBookingsByStatus(filteredTourBookings);
    const allSelected = statusFilteredTours.every((b) =>
      selectedTourIds.has(b.id)
    );

    if (allSelected) {
      // Deselect all tours
      const newSelected = new Set(selectedTourIds);
      statusFilteredTours.forEach((b) => newSelected.delete(b.id));
      setSelectedTourIds(newSelected);
    } else {
      // Select all tours
      const newSelected = new Set(selectedTourIds);
      statusFilteredTours.forEach((b) => newSelected.add(b.id));
      setSelectedTourIds(newSelected);
    }
  };

  const handleSelectAllTransfer = () => {
    // ใช้ filtered bookings แทน original bookings
    const statusFilteredTransfers = filterBookingsByStatus(
      filteredTransferBookings
    );
    const allSelected = statusFilteredTransfers.every((b) =>
      selectedTransferIds.has(b.id)
    );

    if (allSelected) {
      // Deselect all transfers
      const newSelected = new Set(selectedTransferIds);
      statusFilteredTransfers.forEach((b) => newSelected.delete(b.id));
      setSelectedTransferIds(newSelected);
    } else {
      // Select all transfers
      const newSelected = new Set(selectedTransferIds);
      statusFilteredTransfers.forEach((b) => newSelected.add(b.id));
      setSelectedTransferIds(newSelected);
    }
  };

  const handleSelectByStatus = (status) => {
    // ใช้ filtered bookings แทน original bookings
    const toursWithStatus = filteredTourBookings.filter(
      (b) => (b.status || "pending") === status
    );
    const transfersWithStatus = filteredTransferBookings.filter(
      (b) => (b.status || "pending") === status
    );

    const newSelectedTours = new Set(selectedTourIds);
    const newSelectedTransfers = new Set(selectedTransferIds);

    toursWithStatus.forEach((b) => newSelectedTours.add(b.id));
    transfersWithStatus.forEach((b) => newSelectedTransfers.add(b.id));

    setSelectedTourIds(newSelectedTours);
    setSelectedTransferIds(newSelectedTransfers);
  };

  // Handle confirm export
  const handleConfirmExport = () => {
    // ใช้ filtered bookings แทน original bookings
    const finalTourBookings = filteredTourBookings.filter((b) =>
      selectedTourIds.has(b.id)
    );
    const finalTransferBookings = filteredTransferBookings.filter((b) =>
      selectedTransferIds.has(b.id)
    );

    onConfirm(finalTourBookings, finalTransferBookings);
  };

  const summary = calculateSummary();
  const groupedBookings = groupBookingsByDate();
  const sortedDates = Object.keys(groupedBookings).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FileSpreadsheet size={24} className="mr-2" />
              Export Preview
            </h2>
            <p className="text-gray-600 mt-1">
              {format(new Date(selectedMonth), "MMMM yyyy", { locale: th })} (
              {exportFormat === "combined" ? "รวม" : "แยก"} •{" "}
              {exportRange === "first_15"
                ? "15 วันแรก"
                : exportRange === "last_15"
                ? "15 วันหลัง"
                : "ทั้งเดือน"}
              )
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        {/* Booking List */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedDates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีข้อมูลตามเงื่อนไขที่เลือก
            </div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="mb-6">
                <div className="bg-gray-100 px-4 py-2 rounded-lg mb-3">
                  <h3 className="font-semibold text-gray-800">
                    📅 วันที่ {formatDateDisplay(date)}
                  </h3>
                </div>

                <div className="space-y-2">
                  {groupedBookings[date].map((booking) => {
                    const isSelected =
                      booking.type === "tour"
                        ? selectedTourIds.has(booking.id)
                        : selectedTransferIds.has(booking.id);

                    const statusInfo = getStatusInfo(
                      booking.status || "pending"
                    );

                    return (
                      <div
                        key={`${booking.type}-${booking.id}`}
                        className={`p-4 border rounded-lg ${
                          isSelected
                            ? "bg-blue-50 border-blue-300"
                            : "bg-white border-gray-200"
                        } hover:shadow-sm transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log(
                                  `Clicking ${booking.type} ${booking.id}, current state:`,
                                  isSelected
                                );
                                if (booking.type === "tour") {
                                  handleTourSelect(booking.id, !isSelected);
                                } else {
                                  handleTransferSelect(booking.id, !isSelected);
                                }
                              }}
                              className={`${
                                booking.type === "tour"
                                  ? "text-green-600"
                                  : "text-blue-600"
                              } hover:opacity-80 focus:outline-none`}
                            >
                              {isSelected ? (
                                <CheckSquare size={20} />
                              ) : (
                                <Square size={20} />
                              )}
                            </button>

                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  booking.type === "tour"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {booking.type === "tour" ? "Tour" : "Transfer"}
                              </span>

                              <span
                                className={`px-2 py-1 rounded text-xs ${statusInfo.bg} ${statusInfo.color}`}
                              >
                                {statusInfo.icon} {statusInfo.label}
                              </span>
                            </div>

                            <div className="text-sm">
                              <p className="font-medium text-gray-800">
                                {booking.orders
                                  ? `${booking.orders.first_name || ""} ${
                                      booking.orders.last_name || ""
                                    }`.trim() || "ไม่มีชื่อ"
                                  : "ไม่มีชื่อ"}
                              </p>
                              <p className="text-gray-600">
                                Agent: {booking.orders?.agent_name || "ไม่ระบุ"}{" "}
                                | จำนวน: {formatPax(booking)} คน | เวลา:{" "}
                                {booking.type === "tour"
                                  ? booking.tour_pickup_time || "-"
                                  : booking.transfer_time || "-"}
                              </p>
                              {booking.type === "tour" ? (
                                <p className="text-gray-500 text-xs">
                                  โรงแรม: {booking.tour_hotel || "-"} |
                                  รายละเอียด: {booking.tour_detail || "-"}
                                </p>
                              ) : (
                                <p className="text-gray-500 text-xs">
                                  รับจาก: {booking.pickup_location || "-"} |
                                  ส่งที่: {booking.drop_location || "-"}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              ฿{formatCurrency(booking.selling_price)}
                            </p>
                            <p className="text-xs text-gray-500">
                              ส่งใคร: {booking.send_to || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            เลือกแล้ว:{" "}
            <span className="font-bold">{summary.selectedBookings}</span> รายการ
            จากทั้งหมด{" "}
            <span className="font-bold">{summary.totalBookings}</span> รายการ
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmExport}
              disabled={summary.selectedBookings === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Export ({summary.selectedBookings} รายการ)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
