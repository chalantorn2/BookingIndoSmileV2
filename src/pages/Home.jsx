import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import supabase from "../config/supabaseClient";
import BookingList from "../components/booking/BookingList";
import BookingDetailModal from "../components/booking/BookingDetailModal";
import BookingStatusLegend from "../components/booking/BookingStatusLegend";
import CalendarHighlight from "../components/booking/CalendarHighlight";
import { useNotification } from "../hooks/useNotification";
import CaptureButtons from "../components/common/CaptureButtons";
import { exportBookingsToExcel } from "../services/excelService";
import { FileSpreadsheet } from "lucide-react";

import {
  Printer,
  Camera,
  Download,
  Copy,
  Users,
  UserCheck,
  Car,
  CalendarDays,
  MapPin,
} from "lucide-react";

const Home = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tourBookings, setTourBookings] = useState([]);
  const [transferBookings, setTransferBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingType, setBookingType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  // Ref สำหรับพื้นที่แคปภาพ
  const captureAreaRef = useRef(null);

  // Format the selected date for display
  const formattedDate = format(selectedDate, "dd/MM/yyyy");

  // Format date for Supabase query
  const queryDate = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    fetchBookings(queryDate);
  }, [queryDate]);

  const fetchBookings = async (date) => {
    setIsLoading(true);
    setError(null);

    try {
      // Query สำหรับ tour bookings
      const { data: tourData, error: tourError } = await supabase
        .from("tour_bookings")
        .select(
          `
          *, 
          orders(
            id,
            first_name, 
            last_name, 
            pax,
            pax_adt,
            pax_chd,
            pax_inf,
            agent_id,
            agent_name,
            reference_id
          )
        `
        )
        .eq("tour_date", date);

      if (tourError) throw tourError;

      // Query สำหรับ transfer bookings
      const { data: transferData, error: transferError } = await supabase
        .from("transfer_bookings")
        .select(
          `
          *, 
          orders(
            id,
            first_name, 
            last_name, 
            pax,
            pax_adt,
            pax_chd,
            pax_inf,
            agent_id,
            agent_name,
            reference_id
          )
        `
        )
        .eq("transfer_date", date);

      if (transferError) throw transferError;

      // ดึงข้อมูล agent จาก information table แยกต่างหาก
      const allAgentIds = [
        ...tourData.map((booking) => booking.orders?.agent_id).filter(Boolean),
        ...transferData
          .map((booking) => booking.orders?.agent_id)
          .filter(Boolean),
      ];

      let agentMap = {};
      if (allAgentIds.length > 0) {
        const { data: agentData, error: agentError } = await supabase
          .from("information")
          .select("id, value, phone")
          .in("id", [...new Set(allAgentIds)]); // remove duplicates

        if (agentError) {
          console.warn("Error fetching agent data:", agentError);
        } else if (agentData) {
          agentMap = agentData.reduce((acc, agent) => {
            acc[agent.id] = agent;
            return acc;
          }, {});
        }
      }

      // เพิ่มข้อมูล agent เข้าไปในแต่ละ booking
      const enrichedTourData = tourData.map((booking) => ({
        ...booking,
        orders: {
          ...booking.orders,
          agent_info: booking.orders?.agent_id
            ? agentMap[booking.orders.agent_id]
            : null,
        },
      }));

      const enrichedTransferData = transferData.map((booking) => ({
        ...booking,
        orders: {
          ...booking.orders,
          agent_info: booking.orders?.agent_id
            ? agentMap[booking.orders.agent_id]
            : null,
        },
      }));

      const sortedTourData = enrichedTourData.sort((a, b) => {
        return (a.tour_pickup_time || "").localeCompare(
          b.tour_pickup_time || ""
        );
      });

      const sortedTransferData = enrichedTransferData.sort((a, b) => {
        return (a.transfer_time || "").localeCompare(b.transfer_time || "");
      });

      setTourBookings(sortedTourData);
      setTransferBookings(sortedTransferData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("ไม่สามารถโหลดข้อมูลการจองได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleViewBookingDetails = (booking, type) => {
    setSelectedBooking(booking);
    setBookingType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
    setBookingType(null);
  };

  const handleSaveBooking = async (updatedBooking) => {
    try {
      const table =
        bookingType === "tour" ? "tour_bookings" : "transfer_bookings";

      const { error } = await supabase
        .from(table)
        .update(updatedBooking)
        .eq("id", updatedBooking.id);

      if (error) throw error;

      fetchBookings(queryDate);
      setIsModalOpen(false);

      return { success: true };
    } catch (error) {
      console.error("Error updating booking:", error);
      return { success: false, error: error.message };
    }
  };

  const handleDeleteBooking = async (id) => {
    try {
      const table =
        bookingType === "tour" ? "tour_bookings" : "transfer_bookings";

      const { error } = await supabase.from(table).delete().eq("id", id);

      if (error) throw error;

      fetchBookings(queryDate);
      setIsModalOpen(false);

      return { success: true };
    } catch (error) {
      console.error("Error deleting booking:", error);
      return { success: false, error: error.message };
    }
  };

  const totalPax =
    tourBookings.reduce((sum, item) => sum + (item.pax || 0), 0) +
    transferBookings.reduce((sum, item) => sum + (item.pax || 0), 0);

  const filteredTourBookings =
    filter === "all"
      ? tourBookings
      : tourBookings.filter((booking) => booking.status === filter);

  const filteredTransferBookings =
    filter === "all"
      ? transferBookings
      : transferBookings.filter((booking) => booking.status === filter);

  const handleExportExcel = async () => {
    try {
      const result = await exportBookingsToExcel(
        filteredTourBookings,
        filteredTransferBookings,
        formattedDate
      );

      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error("Export error:", error);
      showError("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">รายการจอง</h1>
          <p className="text-gray-600">เลือกวันที่เพื่อดูรายการจอง</p>
        </div>

        <CalendarHighlight
          selectedDate={selectedDate}
          onDateSelect={handleDateChange}
        />

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 font-kanit">
            {/* ส่วนแสดงตัวกรองสถานะและปุ่มแคปภาพ */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white rounded-lg p-4 border border-gray-100">
              {/* ปุ่มแคปภาพ (ซ้าย) */}

              <div className="flex gap-2 mb-2 sm:mb-0 print-hidden">
                <CaptureButtons
                  targetRef={captureAreaRef}
                  filename={`booking-summary-${formattedDate.replace(
                    /\//g,
                    "-"
                  )}`}
                  layout="row"
                  size="sm"
                  variant="default"
                  primaryButton="copy"
                  showDownload={true}
                  showCopy={true}
                  className="bg-white bg-opacity-75 gap-2 rounded-md p-1"
                  options={{
                    bgColor: "#ffffff",
                    styles: {
                      fontFamily: "'Kanit', sans-serif",
                    },
                  }}
                  context="home"
                />

                {/* เพิ่มปุ่ม Export Excel */}
                <button
                  onClick={handleExportExcel}
                  className="flex items-center p-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                  title="ส่งออก Excel"
                >
                  <FileSpreadsheet size={18} />
                  <span>Excel</span>
                </button>
              </div>

              {/* ปุ่มตัวกรองสถานะ (ขวา) */}
              <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                <button
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === "all"
                      ? "bg-gray-200 text-gray-800 font-medium"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setFilter("all")}
                >
                  ทั้งหมด
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === "pending"
                      ? "bg-gray-600 text-white font-medium"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setFilter("pending")}
                >
                  รอดำเนินการ
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === "booked"
                      ? "bg-blue-600 text-white font-medium"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  }`}
                  onClick={() => setFilter("booked")}
                >
                  จองแล้ว
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === "in_progress"
                      ? "bg-yellow-600 text-white font-medium"
                      : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  }`}
                  onClick={() => setFilter("in_progress")}
                >
                  กำลังดำเนินการ
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filter === "completed"
                      ? "bg-green-600 text-white font-medium"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
                  }`}
                  onClick={() => setFilter("completed")}
                >
                  เสร็จสมบูรณ์
                </button>
              </div>
            </div>

            <div
              id="captureArea"
              ref={captureAreaRef}
              className="font-kanit"
              style={{
                fontFamily: "'Kanit', sans-serif",
                backgroundColor: "white",
              }}
            >
              {/* วันที่สีแดงใน captureArea */}
              <div className="mb-6 mt-6">
                <h2 className="text-3xl font-bold text-red-600 text-center">
                  {formattedDate}
                </h2>
              </div>

              <BookingStatusLegend />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                {/* Tour Bookings */}
                <div>
                  <div className="bg-white border border-green-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-3 rounded-t-lg flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        Tour ({filteredTourBookings.length})
                      </h3>
                    </div>
                    <div className="p-3">
                      <BookingList
                        bookings={filteredTourBookings}
                        type="tour"
                        isLoading={isLoading}
                        error={error}
                        onViewDetails={handleViewBookingDetails}
                      />
                    </div>
                  </div>
                </div>

                {/* Transfer Bookings */}
                <div>
                  <div className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-3 rounded-t-lg flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        Transfer ({filteredTransferBookings.length})
                      </h3>
                    </div>
                    <div className="p-3">
                      <BookingList
                        bookings={filteredTransferBookings}
                        type="transfer"
                        isLoading={isLoading}
                        error={error}
                        onViewDetails={handleViewBookingDetails}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <BookingDetailModal
          booking={selectedBooking}
          bookingType={bookingType}
          onClose={handleCloseModal}
          onSave={handleSaveBooking}
          onDelete={handleDeleteBooking}
        />
      )}
    </div>
  );
};

export default Home;
