import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { createVoucher, updateVoucher } from "../services/voucherService";
import {
  ArrowLeft,
  Info,
  Save,
  Calendar,
  Clock,
  Package,
  User,
  Hotel,
  FileText,
  MapPin,
} from "lucide-react";
import supabase from "../config/supabaseClient";
import TourVoucherForm from "../components/voucher/TourVoucherForm";
import TransferVoucherForm from "../components/voucher/TransferVoucherForm";
import { useNotification } from "../hooks/useNotification";
import { format, parseISO, isValid } from "date-fns";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";

const CreateVoucher = () => {
  const { bookingId, bookingType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showInfo } = useNotification();
  const showAlert = useAlertDialogContext();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode =
    new URLSearchParams(location.search).get("edit") === "true";

  const formatPax = (booking) => {
    const paxAdt = parseInt(booking.pax_adt || 0);
    const paxChd = parseInt(booking.pax_chd || 0);
    const paxInf = parseInt(booking.pax_inf || 0);

    if (paxAdt === 0 && paxChd === 0 && paxInf === 0) return "-";

    let paxString = [];
    if (paxAdt > 0) paxString.push(paxAdt.toString());
    if (paxChd > 0) paxString.push(paxChd.toString());
    if (paxInf > 0) paxString.push(paxInf.toString());

    return paxString.join("+");
  };

  useEffect(() => {
    const fetchBookingDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!bookingId || !bookingType) {
          throw new Error("ไม่พบรหัส Booking หรือประเภท Booking");
        }

        const tableName =
          bookingType === "tour" ? "tour_bookings" : "transfer_bookings";
        const { data, error } = await supabase
          .from(tableName)
          .select(
            `
            *,
            orders(*)
          `
          )
          .eq("id", bookingId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("ไม่พบข้อมูล Booking");

        let initialVoucherData = {};
        if (isEditMode) {
          const { data: existingVoucher, error: voucherError } = await supabase
            .from("vouchers")
            .select("*")
            .eq("booking_id", bookingId)
            .eq("booking_type", bookingType)
            .single();

          if (voucherError) throw voucherError;
          if (existingVoucher) {
            initialVoucherData = existingVoucher;
          }
        } else {
          const currentYear = new Date().getFullYear();
          const { data: sequenceData, error: sequenceError } = await supabase
            .from("sequences")
            .select("*")
            .eq("key", `voucher_${currentYear}`)
            .single();

          let nextSequence = 1;
          if (sequenceData && !sequenceError) {
            nextSequence = sequenceData.value + 1;
          }

          initialVoucherData = {
            year_number: currentYear.toString(),
            sequence_number: String(nextSequence).padStart(4, "0"),
          };
        }

        setBooking(data);
        setVoucherData(initialVoucherData);
      } catch (error) {
        console.error("Error fetching booking details:", error);
        setError(error.message || "ไม่สามารถโหลดข้อมูล Booking ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, bookingType, isEditMode]);

  const handleSaveVoucher = async (voucherData) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      let result;
      if (isEditMode) {
        if (!voucherData.id) throw new Error("Voucher ID is missing");
        result = await updateVoucher(voucherData.id, {
          ...voucherData,
          updated_at: new Date().toISOString(),
        });
        if (result.error) throw new Error(result.error);
        showSuccess("อัพเดต Voucher สำเร็จ");
      } else {
        result = await createVoucher({
          ...voucherData,
          booking_id: bookingId,
          booking_type: bookingType,
        });
        if (result.error) throw new Error(result.error);
        showSuccess("สร้าง Voucher สำเร็จ");
      }

      setTimeout(() => {
        navigate("/voucher");
      }, 1500);
    } catch (error) {
      console.error("Error saving voucher:", error);
      showError("ไม่สามารถบันทึก Voucher ได้: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "รอดำเนินการ",
      booked: "จองแล้ว",
      in_progress: "ดำเนินการอยู่",
      completed: "เสร็จสมบูรณ์",
      cancelled: "ยกเลิก",
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
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

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parsedDate = parseISO(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd/MM/yyyy");
      }
      return dateStr;
    } catch (error) {
      return dateStr;
    }
  };

  const renderBookingDetails = () => {
    if (!booking) return null;

    const isTour = bookingType === "tour";

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div
          className={`px-4 py-3 flex justify-between items-center ${
            isTour ? "bg-green-600" : "bg-blue-600"
          } text-white rounded-t-lg`}
        >
          <div className="flex justify-center items-center">
            <span className="text-xl font-semibold mr-2">
              {isTour ? "รายละเอียดการจอง Tour" : "รายละเอียดการจอง Transfer"}
            </span>
            {booking.status && (
              <span
                className={`text-xs px-2 py-1 rounded-md ${getStatusBadgeClass(
                  booking.status
                )}`}
              >
                {getStatusText(booking.status)}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {booking.orders && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-medium flex items-center">
                  <User size={18} className="mr-2 text-gray-600" />
                  ข้อมูล Order
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">รหัส Order:</p>
                  <p className="font-medium">
                    {booking.orders.reference_id || `#${booking.orders.id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ชื่อลูกค้า:</p>
                  <p className="font-medium">
                    {booking.orders.first_name} {booking.orders.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Agent:</p>
                  <p className="font-medium">
                    {booking.orders.agent_name || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-lg font-medium mb-3 pb-2 border-b border-gray-200 flex items-center">
              <Calendar size={18} className="mr-2 text-blue-600" />
              รายละเอียดข้อมูล Booking
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">รหัสการจอง:</p>
                <p className="font-medium">
                  {booking.reference_id || `#${booking.id}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">วันที่:</p>
                <p className="font-medium">
                  {isTour
                    ? formatDateDisplay(booking.tour_date)
                    : formatDateDisplay(booking.transfer_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">สถานะ:</p>
                <p className="font-medium">
                  {getStatusText(booking.status || "pending")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">จำนวนคน:</p>
                <p className="font-medium">{formatPax(booking)}</p>
              </div>

              {isTour ? (
                <>
                  <div>
                    <p className="text-sm text-gray-600">ประเภททัวร์:</p>
                    <p className="font-medium">{booking.tour_type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ส่งใคร:</p>
                    <p className="font-medium">{booking.send_to || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">เวลารับ:</p>
                    <p className="font-medium">
                      {booking.tour_pickup_time || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">โรงแรม:</p>
                    <p className="font-medium">{booking.tour_hotel || "-"}</p>
                  </div>
                  <div className="col-span-4">
                    <p className="text-sm text-gray-600">รายละเอียด:</p>
                    <p className="font-medium">{booking.tour_detail || "-"}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-600">ประเภทการรับส่ง:</p>
                    <p className="font-medium">
                      {booking.transfer_type || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ส่งใคร:</p>
                    <p className="font-medium">{booking.send_to || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">เวลารับ:</p>
                    <p className="font-medium">
                      {booking.transfer_time || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">สถานที่รับ:</p>
                    <p className="font-medium">
                      {booking.pickup_location || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">สถานที่ส่ง:</p>
                    <p className="font-medium">
                      {booking.drop_location || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">เที่ยวบิน:</p>
                    <p className="font-medium">
                      {booking.transfer_flight || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">รายละเอียด:</p>
                    <p className="font-medium">
                      {booking.transfer_detail || "-"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-lg font-medium mb-3 pb-2 border-b border-gray-200 flex items-center">
              <FileText size={18} className="mr-2 text-blue-600" />
              ราคาและหมายเหตุ
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">ราคาต้นทุน:</p>
                <p className="font-medium">
                  {booking.cost_price ? `${booking.cost_price} บาท` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ราคาขาย:</p>
                <p className="font-medium">
                  {booking.selling_price ? `${booking.selling_price} บาท` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">กำไร:</p>
                <p className="font-medium">
                  {booking.cost_price && booking.selling_price
                    ? `${(booking.selling_price - booking.cost_price).toFixed(
                        2
                      )} บาท`
                    : "-"}
                </p>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">หมายเหตุ:</p>
                <p className="font-medium">{booking.note || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {isEditMode ? "แก้ไข Voucher" : "สร้าง Voucher"}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          กลับไปหน้าก่อนหน้า
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {renderBookingDetails()}
          {bookingType === "tour" ? (
            <TourVoucherForm
              booking={booking}
              voucherData={voucherData}
              onSave={handleSaveVoucher}
            />
          ) : (
            <TransferVoucherForm
              booking={booking}
              voucherData={voucherData}
              onSave={handleSaveVoucher}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CreateVoucher;
