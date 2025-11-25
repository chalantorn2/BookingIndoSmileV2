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

  // Day of week in English
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Split useEffect into 2 parts
  useEffect(() => {
    generateCalendarDays(currentMonth);
    fetchBookedDates(currentMonth);
  }, [currentMonth]);

  // Update currentMonth when selectedDate changes
  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  // Generate calendar days
  const generateCalendarDays = (date) => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setCalendarDays(days);
  };

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth((prevMonth) => subMonths(prevMonth, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth((prevMonth) => addMonths(prevMonth, 1));
  };

  // Fetch booked dates
  const fetchBookedDates = async (date) => {
    setIsLoading(true);

    try {
      const monthStr = format(date, "yyyy-MM");
      const startDate = `${monthStr}-01`;
      const endDate = format(endOfMonth(date), "yyyy-MM-dd");

      // Fetch tour data
      const { data: tourData, error: tourError } = await supabase
        .from("tour_bookings")
        .select("tour_date")
        .gte("tour_date", startDate)
        .lte("tour_date", endDate);

      if (tourError) throw tourError;

      // Fetch transfer data
      const { data: transferData, error: transferError } = await supabase
        .from("transfer_bookings")
        .select("transfer_date")
        .gte("transfer_date", startDate)
        .lte("transfer_date", endDate);

      if (transferError) throw transferError;

      // Separate dates for tours and transfers
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
          // Check if this date also has a tour
          if (tourDates.has(booking.transfer_date)) {
            bothDates.add(booking.transfer_date);
            // Remove from tourDates as it will be in bothDates instead
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

  // Check if the date has a booking
  const isDateBooked = (day) => {
    return getBookingType(day) !== null;
  };

  // Check if it's the selected day
  const isSelectedDay = (day) => {
    return isSameDay(day, selectedDate);
  };

  // Check if it's today
  const isToday = (day) => {
    return isSameDay(day, new Date());
  };

  // Check if it's in the current displayed month
  const isCurrentMonth = (day) => {
    return isSameMonth(day, currentMonth);
  };

  const renderLegend = () => (
    <div className="px-4 py-2 text-xs text-gray-500 flex gap-4 justify-center border-b flex-wrap">
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-gray-600 mr-1"></div>
        <span>Selected Date</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
        <span>Tour</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-blue-300 mr-1"></div>
        <span>Transfer</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-gradient-to-b from-green-600 to-blue-600 mr-1"></div>
        <span>Tour and Transfer</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div>
        <span>Today</span>
      </div>
    </div>
  );

  // Render calendar days
  const renderCalendarDays = () => (
    <div className="grid grid-cols-7 gap-1">
      {calendarDays.map((day, i) => {
        const bookingType = getBookingType(day);
        const selected = isSelectedDay(day);
        const today = isToday(day);
        const inCurrentMonth = isCurrentMonth(day);

        // Set color based on booking type
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
            aria-label={format(day, "d MMMM yyyy")}
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
      {/* Calendar header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex justify-between items-center">
        <button
          onClick={prevMonth}
          className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="Previous Month"
        >
          <ChevronLeft size={24} />
        </button>

        <h2 className="text-xl font-bold flex items-center">
          <Calendar size={22} className="mr-2" />
          {format(currentMonth, "MMMM yyyy")}
        </h2>

        <button
          onClick={nextMonth}
          className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="Next Month"
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

      {/* Selected date display */}
      <div className="bg-gray-50 p-3 border-t text-center">
        <span className="font-medium">Selected Date: </span>
        <span className="text-blue-600 font-bold">
          {format(selectedDate, "d MMMM yyyy")}
        </span>
      </div>
    </div>
  );
};

export default CalendarHighlight;
