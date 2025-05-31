import React, { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const CalendarHighlight = ({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const [calendarDays, setCalendarDays] = useState([]);
  const [bookingData, setBookingData] = useState({
    tourDates: new Set(),
    transferDates: new Set(),
    bothDates: new Set(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // วันในสัปดาห์ภาษาไทย
  const weekDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  // แยก useEffect ออกเป็น 2 ส่วน
  useEffect(() => {
    generateCalendarDays(currentMonth);
    fetchBookedDates(currentMonth);
  }, [currentMonth]);

  // อัพเดท currentMonth เมื่อ selectedDate เปลี่ยน
  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  // สร้างวันที่ในปฏิทิน
  const generateCalendarDays = (date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setCalendarDays(days);
  };

  // เลื่อนไปเดือนก่อนหน้า
  const prevMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1));
  };

  // เลื่อนไปเดือนถัดไป
  const nextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1));
  };

  // ดึงข้อมูลวันที่มีการจอง
  const fetchBookedDates = async (date) => {
    setIsLoading(true);

    try {
      const monthStr = format(date, "yyyy-MM");
      const startDate = `${monthStr}-01`;
      const endDate = format(endOfMonth(date), "yyyy-MM-dd");

      // ดึงข้อมูลทัวร์
      const { data: tourData, error: tourError } = await supabase
        .from("tour_bookings")
        .select("tour_date")
        .gte("tour_date", startDate)
        .lte("tour_date", endDate);

      if (tourError) throw tourError;

      // ดึงข้อมูลการรับส่ง
      const { data: transferData, error: transferError } = await supabase
        .from("transfer_bookings")
        .select("transfer_date")
        .gte("transfer_date", startDate)
        .lte("transfer_date", endDate);

      if (transferError) throw transferError;

      // แยกเก็บวันที่สำหรับทัวร์และรถรับส่ง
      const tourDates = new Set();
      const transferDates = new Set();
      const bothDates = new Set();

      tourData.forEach((booking) => {
        if (booking.tour_date) {
          tourDates.add(booking.tour_date);
        }
      });

      transferData.forEach((booking) => {
        if (booking.transfer_date) {
          // ตรวจสอบว่าวันนี้มีทัวร์ด้วยหรือไม่
          if (tourDates.has(booking.transfer_date)) {
            bothDates.add(booking.transfer_date);
            // ลบออกจาก tourDates เพราะจะไปอยู่ใน bothDates แทน
            tourDates.delete(booking.transfer_date);
          } else {
            transferDates.add(booking.transfer_date);
          }
        }
      });

      setBookingData({
        tourDates,
        transferDates,
        bothDates,
      });
    } catch (error) {
      console.error("Error fetching booked dates:", error);
      setBookingData({
        tourDates: new Set(),
        transferDates: new Set(),
        bothDates: new Set(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBookingType = (day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    if (bookingData.bothDates.has(dateStr)) return "both";
    if (bookingData.tourDates.has(dateStr)) return "tour";
    if (bookingData.transferDates.has(dateStr)) return "transfer";
    return null;
  };

  // ตรวจสอบว่าวันที่นั้นมีการจองหรือไม่
  const isDateBooked = (day) => {
    return getBookingType(day) !== null;
  };

  // ตรวจสอบว่าเป็นวันที่เลือกหรือไม่
  const isSelectedDay = (day) => {
    return isSameDay(day, selectedDate);
  };

  // ตรวจสอบว่าเป็นวันนี้หรือไม่
  const isToday = (day) => {
    return isSameDay(day, new Date());
  };

  // ตรวจสอบว่าอยู่ในเดือนที่แสดงอยู่หรือไม่
  const isCurrentMonth = (day) => {
    return isSameMonth(day, currentMonth);
  };

  const renderLegend = () => (
    <div className="px-4 py-2 text-xs text-gray-500 flex gap-4 justify-center border-b flex-wrap">
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-gray-600 mr-1"></div>
        <span>วันที่เลือก</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
        <span>มี Tour</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-blue-300 mr-1"></div>
        <span>มี Transfer</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-gradient-to-b from-green-600 to-blue-600 mr-1"></div>
        <span>มีทั้ง Tour และ Transfer</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
        <span>วันนี้</span>
      </div>
    </div>
  );

  // ปรับปรุงการเรนเดอร์วันที่
  const renderCalendarDays = () => (
    <div className="grid grid-cols-7 gap-1">
      {calendarDays.map((day, i) => {
        const bookingType = getBookingType(day);
        const selected = isSelectedDay(day);
        const today = isToday(day);
        const inCurrentMonth = isCurrentMonth(day);

        // กำหนดสีตามประเภทการจอง
        let bookingStyle = "";
        if (!selected && bookingType) {
          if (bookingType === "tour") {
            bookingStyle = "bg-green-200 text-green-800 hover:bg-green-200";
          } else if (bookingType === "transfer") {
            bookingStyle = "bg-blue-200 text-blue-800 hover:bg-blue-200";
          } else if (bookingType === "both") {
            bookingStyle =
              "bg-gradient-to-b from-green-300 to-blue-400 hover:from-green-700 hover:to-blue-700";
          }
        }

        return (
          <button
            key={i}
            onClick={() => inCurrentMonth && onDateSelect(day)}
            disabled={!inCurrentMonth}
            className={`
              h-10 w-full rounded-md flex items-center justify-center relative
              ${
                !inCurrentMonth
                  ? "text-gray-300 cursor-default"
                  : "hover:bg-blue-50 cursor-pointer"
              }
              ${
                selected
                  ? "bg-gray-500 text-white hover:bg-gray-600 font-bold"
                  : ""
              }
              ${today && !selected ? "border-2 border-gray-300 font-bold" : ""}
              ${bookingStyle}
              transition-colors duration-200
            `}
            aria-label={format(day, "d MMMM yyyy", { locale: th })}
          >
            <span>{format(day, "d")}</span>
            {bookingType && !selected && (
              <span
                className={`absolute bottom-1 w-1.5 h-1.5 rounded-full 
                ${
                  bookingType === "tour"
                    ? "bg-green-600"
                    : bookingType === "transfer"
                    ? "bg-blue-600"
                    : "bg-gradient-to-t from-green-600 to-blue-600"
                }`}
              ></span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      {/* ส่วนหัวปฏิทิน */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex justify-between items-center">
        <button
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="เดือนก่อนหน้า"
        >
          <ChevronLeft size={24} />
        </button>

        <h2 className="text-xl font-bold flex items-center">
          <Calendar size={22} className="mr-2" />
          {format(currentMonth, "MMMM yyyy", { locale: th })}
        </h2>

        <button
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="เดือนถัดไป"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {renderLegend()}

      {/* ตารางปฏิทิน */}
      <div className="p-4">
        {/* วันในสัปดาห์ */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* วันที่ */}
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          renderCalendarDays()
        )}
      </div>

      {/* วันที่เลือกปัจจุบัน */}
      <div className="bg-gray-50 p-3 border-t text-center">
        <span className="font-medium">วันที่เลือก: </span>
        <span className="text-blue-600 font-bold">
          {format(selectedDate, "d MMMM yyyy", { locale: th })}
        </span>
      </div>
    </div>
  );
};

export default CalendarHighlight;
