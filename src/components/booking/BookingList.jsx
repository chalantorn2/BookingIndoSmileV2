import React, { useRef } from "react";
import { format } from "date-fns";
import {
  Eye,
  Clock,
  CalendarCheck,
  MapPin,
  Plane,
  User,
  Hotel,
  FileText,
  BedDouble,
} from "lucide-react";
import { useNotification } from "../../hooks/useNotification";
import { useInformation } from "../../contexts/InformationContext";
import CaptureButtons from "../common/CaptureButtons";

const BookingList = ({ bookings, type, isLoading, error, onViewDetails }) => {
  const { showSuccess, showError, showInfo } = useNotification();
  const { places, tourRecipients, transferRecipients } = useInformation();

  console.log(`${type} bookings:`, bookings);

  console.log("🔍 All places from useInformation:", places);
  console.log("🔍 Places count:", places.length);

  console.log("🔍 First 5 places:", places.slice(0, 5));
  console.log(
    "🔍 All place values:",
    places.map((p) => p.value)
  );
  console.log(
    "🔍 Places with phone field:",
    places.filter(
      (p) => p.phone !== null && p.phone !== undefined && p.phone !== ""
    )
  );

  if (places.length > 0) {
    console.log(
      "🔍 Sample place with phone:",
      places.find((p) => p.phone)
    );
  }

  // ฟังก์ชันป้องกันการ wrap ข้อความตอนแคปภาพ
  const preventTextWrap = (text) => {
    if (!text || typeof text !== "string" || text.length < 3) return text;
    return text.replace(/\s+/g, "\u00A0");
  };

  // ฟังก์ชันสำหรับดึงข้อมูล Agent จากการ join
  const getAgentInfo = (booking) => {
    if (!booking) {
      console.warn(`Booking is undefined or null`);
      return { name: "No Agent", phone: "" };
    }

    if (!booking.orders) {
      console.warn(`Booking ID: ${booking.id} has no orders data`, booking);
      return { name: "No Agent", phone: "" };
    }

    if (booking.orders.agent_info) {
      console.log(
        `Using agent_info for booking ID: ${booking.id}`,
        booking.orders.agent_info
      );
      return {
        name: booking.orders.agent_info.value || "No Agent",
        phone: booking.orders.agent_info.phone || "",
      };
    }

    if (booking.orders.agent_name) {
      console.log(
        `Using agent_name fallback for booking ID: ${booking.id}`,
        booking.orders.agent_name
      );
      return {
        name: booking.orders.agent_name,
        phone: "",
      };
    }

    console.warn(`No agent information found for booking ID: ${booking.id}`);
    return { name: "No Agent", phone: "" };
  };

  const getPlaceInfo = (placeName, bookingType) => {
    console.log(
      "🔍 getPlaceInfo called with:",
      placeName,
      "type:",
      bookingType
    );

    if (!placeName) {
      console.log("🔍 No placeName provided");
      return { name: "No data", phone: "" };
    }

    const recipients =
      bookingType === "tour" ? tourRecipients : transferRecipients;
    console.log(`🔍 Using ${bookingType} recipients:`, recipients);

    const exactMatch = recipients.find((r) => r.value === placeName);
    console.log("🔍 Exact match result:", exactMatch);

    const caseInsensitiveMatch = recipients.find(
      (r) =>
        r.value &&
        r.value.toLowerCase().trim() === placeName.toLowerCase().trim()
    );
    console.log("🔍 Case insensitive match result:", caseInsensitiveMatch);

    const recipient = exactMatch || caseInsensitiveMatch;

    if (recipient) {
      console.log("🔍 Found recipient data:", recipient);
      return {
        name: recipient.value || "No name",
        phone: recipient.phone || "",
      };
    }

    console.log("🔍 No recipient found, returning default");
    return { name: placeName, phone: "" };
  };

  const formatWithPhone = (name, phone) => {
    if (!name || name === "No Agent") return "No Agent";
    if (phone) {
      return `${name} ${phone}`;
    }
    return name;
  };

  const getStatusBackgroundStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-br from-gray-200 via-gray-100 to-white";
      case "booked":
        return "bg-gradient-to-br from-blue-200 via-blue-100 to-white";
      case "in_progress":
        return "bg-gradient-to-br from-yellow-200 via-yellow-100 to-white";
      case "completed":
        return "bg-gradient-to-br from-green-200 via-green-100 to-white";
      case "cancelled":
        return "bg-gradient-to-br from-red-200 via-red-100 to-white";
      default:
        return "bg-gradient-to-br from-gray-200 via-gray-100 to-white";
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-gray-300 border-r-blue-500"></div>
        <p className="mt-2 text-gray-600">
          {preventTextWrap("Loading...")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded">
        <p>{preventTextWrap(error)}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        {preventTextWrap(
          `No ${type === "tour" ? "Tour" : "Transfer"} bookings found`
        )}
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-gray-200 text-gray-800";
      case "booked":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const translateStatus = (status) => {
    const statusMap = {
      pending: "Pending",
      booked: "Booked",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const timeA = a.tour_pickup_time || a.transfer_time || "";
    const timeB = b.tour_pickup_time || b.transfer_time || "";
    return timeA.localeCompare(timeB);
  });

  const formatPax = (booking) => {
    if (!booking) return "0";

    if (booking.orders) {
      const adtCount = parseInt(booking.orders.pax_adt || 0);
      const chdCount = parseInt(booking.orders.pax_chd || 0);
      const infCount = parseInt(booking.orders.pax_inf || 0);

      let paxParts = [];
      if (adtCount > 0) paxParts.push(`${adtCount}`);
      if (chdCount > 0) paxParts.push(`${chdCount}`);
      if (infCount > 0) paxParts.push(`${infCount}`);

      if (paxParts.length > 0) {
        return paxParts.join("+");
      }
    }

    const adtCount = parseInt(booking.pax_adt || 0);
    const chdCount = parseInt(booking.pax_chd || 0);
    const infCount = parseInt(booking.pax_inf || 0);

    let paxParts = [];
    if (adtCount > 0) paxParts.push(`${adtCount}`);
    if (chdCount > 0) paxParts.push(`${chdCount}`);
    if (infCount > 0) paxParts.push(`${infCount}`);

    return paxParts.length > 0 ? paxParts.join("+") : "0";
  };

  return (
    <div className="relative space-y-3 font-Prompt">
      {sortedBookings.map((booking, index) => {
        const firstName = booking.orders?.first_name || "";
        const lastName = booking.orders?.last_name || "";
        const customerName = `${firstName} ${lastName}`.trim() || "No name";

        const bookingCaptureRef = useRef(null);
        const agentInfo = getAgentInfo(booking);
        const sendToInfo = getPlaceInfo(booking.send_to, type);

        console.log(`🔍 Booking ${booking.id}:`, {
          send_to: booking.send_to,
          sendToInfo: sendToInfo,
          hasPhone: !!sendToInfo.phone,
        });

        return (
          <div key={booking.id} className="relative">
            <div className="absolute top-2 right-2 z-10 flex flex-row items-center gap-1 print-hidden">
              <CaptureButtons
                targetRef={bookingCaptureRef}
                filename={`booking-${type}-${booking.id}-${
                  new Date().toISOString().split("T")[0]
                }`}
                layout="row"
                size="sm"
                variant="default"
                primaryButton="copy"
                showDownload={true}
                showCopy={true}
                className="rounded-md"
                options={{
                  bgColor: "#ffffff",
                  styles: {
                    fontFamily: "'Prompt', sans-serif",
                  },
                  width: 1000, // กำหนดความกว้างตอนแคป
                }}
                context="bookingList"
              />
              <button
                onClick={() => onViewDetails(booking, type)}
                className={`p-1 rounded-md ${
                  type === "tour"
                    ? "text-green-700 hover:bg-green-50"
                    : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                <Eye size={18} />
              </button>
            </div>

            <div
              ref={bookingCaptureRef}
              className={`border border-gray-500 rounded-md overflow-hidden transition-all hover:shadow-md ${getStatusBackgroundStyle(
                booking.status
              )}`}
              style={{
                borderLeftWidth: "5px",
                borderLeftColor: type === "tour" ? "#16a34a" : "#2563eb",
                fontFamily: "'Prompt', sans-serif",
                backgroundColor: "white",
              }}
            >
              <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-lg flex items-center gap-1">
                    {preventTextWrap(`${index + 1}.`)}
                    <User size={18} className="text-gray-500" />
                    <span className="flex items-center w-150 mr-2  0">
                      {preventTextWrap(customerName)} | {formatPax(booking)} pax
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2 text-xs">
                  <span
                    className={`inline-flex items-center px-2 py-1 font-medium text-base rounded ${
                      type === "tour"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    <Clock size={16} className="mr-1" />
                    <span className="whitespace-nowrap">
                      {preventTextWrap(
                        type === "tour"
                          ? booking.tour_pickup_time || "-"
                          : booking.transfer_time || "-"
                      )}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-1 font-medium text-base rounded ${
                      type === "tour"
                        ? "bg-green-50 text-green-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    <CalendarCheck size={16} className="mr-1" />
                    {preventTextWrap(
                      type === "tour"
                        ? format(new Date(booking.tour_date), "dd/MM/yyyy")
                        : format(new Date(booking.transfer_date), "dd/MM/yyyy")
                    )}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {type === "tour" ? (
                    <>
                      <div className="flex flex-wrap gap-x-4 text-base text-gray-800 mb-1">
                        <div className="flex items-center flex-wrap">
                          <div className="flex items-center mr-2">
                            <Hotel size={16} className="mr-1 flex-shrink-0" />
                            <span>
                              <b>{preventTextWrap("Hotel:")}</b>{" "}
                              {preventTextWrap(booking.tour_hotel || "-")}
                            </span>
                          </div>
                          {booking.tour_room_no && (
                            <div className="flex items-center">
                              <BedDouble
                                size={16}
                                className="mr-1 flex-shrink-0"
                              />
                              <span>
                                <b>{preventTextWrap("Room:")}</b>{" "}
                                {preventTextWrap(booking.tour_room_no)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 mb-2">
                        <div className="flex items-center">
                          <FileText size={14} className="mr-1 flex-shrink-0" />
                          <div
                            className="w-xl text-balance"
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              maxWidth: "500px",
                            }}
                          >
                            <b>{preventTextWrap("Details:")}</b>{" "}
                            {booking.tour_detail || "-"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-x-4 text-base text-gray-800 mb-1">
                        <div className="flex items-center flex-wrap">
                          <div className="flex items-center mr-2">
                            <MapPin size={14} className="mr-1 flex-shrink-0" />
                            <span>
                              <b>{preventTextWrap("Pick up:")}</b>{" "}
                              {preventTextWrap(booking.pickup_location || "-")}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-1 flex-shrink-0" />
                            <span>
                              <b>{preventTextWrap("Drop off:")}</b>{" "}
                              {preventTextWrap(booking.drop_location || "-")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-base text-gray-800 mb-2">
                        {booking.transfer_flight && (
                          <div className="flex items-center mr-2">
                            <Plane size={16} className="mr-1 flex-shrink-0" />
                            <span>
                              <b>{preventTextWrap("Flight:")}</b>{" "}
                              {preventTextWrap(booking.transfer_flight)}
                            </span>
                          </div>
                        )}
                        {booking.transfer_ftime && (
                          <div className="flex items-center">
                            <Clock size={14} className="mr-1 flex-shrink-0" />
                            <span>
                              <b>{preventTextWrap("Flight time:")}</b>{" "}
                              {preventTextWrap(booking.transfer_ftime)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 mb-2">
                        <div className="flex items-center">
                          <FileText size={14} className="mr-1 flex-shrink-0" />
                          <div
                            className="w-xl text-balance"
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              maxWidth: "500px",
                            }}
                          >
                            <b>{preventTextWrap("Details:")}</b>{" "}
                            {booking.transfer_detail || "-"}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center text-xs text-gray-500 pt-2 border-t border-gray-500 gap-2">
                  <div className="flex items-center gap-2 text-sm flex-1">
                    <span
                      className={`font-medium ${
                        agentInfo.name === "No Agent"
                          ? "text-gray-500"
                          : ""
                      }`}
                    >
                      {preventTextWrap(
                        `From: ${formatWithPhone(
                          agentInfo.name,
                          agentInfo.phone
                        )}`
                      )}
                    </span>
                    <span>{preventTextWrap("|")}</span>
                    <span className="font-medium text-balance w-full">
                      {preventTextWrap(
                        `To: ${formatWithPhone(
                          sendToInfo.name,
                          sendToInfo.phone
                        )}`
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      {preventTextWrap(
                        booking.reference_id
                          ? booking.reference_id
                          : `ID: ${booking.id || "-"}`
                      )}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full w-22 text-center text-xs font-medium ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {translateStatus(booking.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BookingList;
