import React from "react";
import { PlusCircle, ArrowRight } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const BookingCard = ({ booking, type, onAddBooking }) => {
  const isTour = type === "tour";

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parsedDate = parseISO(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd/MM/yyyy");
      }
      return dateStr.split("-").reverse().join("/");
    } catch (error) {
      return dateStr;
    }
  };

  const handleAddClick = () => {
    // สร้าง object ที่มีข้อมูล cost_price และ payment_status เพิ่ม
    const bookingWithPrice = {
      ...booking,
      cost: booking.cost_price || 0, // ใช้ค่า cost_price เป็นค่าเริ่มต้นสำหรับ cost
      status: booking.payment_status || "notPaid", // ใช้ค่า payment_status เป็นค่าเริ่มต้นสำหรับ status
    };
    onAddBooking(bookingWithPrice, type);
  };

  const formatPax = (booking) => {
    const adtCount = parseInt(booking.pax_adt || 0);
    const chdCount = parseInt(booking.pax_chd || 0);
    const infCount = parseInt(booking.pax_inf || 0);

    let paxString = [];
    if (adtCount > 0) paxString.push(adtCount.toString());
    if (chdCount > 0) paxString.push(chdCount.toString());
    if (infCount > 0) paxString.push(infCount.toString());

    return paxString.length > 0 ? paxString.join("+") : "0";
  };

  return (
    <div
      className={`border ${
        isTour ? "border-green-200" : "border-blue-200"
      } rounded-lg hover:shadow-md transition-shadow overflow-hidden`}
    >
      <div
        className={`${
          isTour
            ? "bg-green-50 border-l-4 border-green-500"
            : "bg-blue-50 border-l-4 border-blue-500"
        } p-3`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p
              className={`font-medium ${
                isTour ? "text-green-800" : "text-blue-800"
              }`}
            >
              {booking.send_to || "-"} |{" "}
              {formatDateDisplay(
                isTour ? booking.tour_date : booking.transfer_date
              )}
            </p>

            {isTour ? (
              <p className="text-sm text-gray-600 mt-1">
                {booking.tour_hotel || "-"} | {formatPax(booking)} คน
              </p>
            ) : (
              <p className="text-sm flex items-center text-gray-600 mt-1">
                {booking.pickup_location || "-"}{" "}
                <ArrowRight size={12} className="mx-1" />{" "}
                {booking.drop_location || "-"} | {formatPax(booking)} คน
              </p>
            )}
          </div>

          <button
            className={`${
              isTour ? "bg-green-600" : "bg-blue-600"
            } text-white p-1 rounded hover:${
              isTour ? "bg-green-700" : "bg-blue-700"
            }`}
            onClick={() => onAddBooking(booking, type)}
          >
            <PlusCircle size={20} />
          </button>
        </div>

        <p className="text-sm italic text-gray-600 mt-1">
          {isTour ? booking.tour_detail : booking.transfer_detail || "-"}
        </p>
      </div>
    </div>
  );
};

export default BookingCard;
