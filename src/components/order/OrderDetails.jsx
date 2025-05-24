import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Trash2,
  Calendar,
  Package,
  FileText,
  Ticket,
  DollarSign,
  Hotel,
  MapPinned,
  Phone,
  Plane,
  Car,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { th } from "date-fns/locale";
import supabase from "../../config/supabaseClient";
import { useAlertDialogContext } from "../../contexts/AlertDialogContext";
import { useNotification } from "../../hooks/useNotification";
import OrderVoucherList from "./OrderVoucherList";
import OrderStatusBadge from "./OrderStatusBadge";
import { deleteBooking } from "../../services/bookingService";

const OrderDetails = ({
  order,
  onClose,
  onSave,
  onOrderDeleted,
  onAddBooking,
  onDeleteBooking,
}) => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const [orderData, setOrderData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [deletedBookings, setDeletedBookings] = useState({
    tourBookings: [],
    transferBookings: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (order) {
      setOrderData({
        ...order,
        pax_adt: order.pax_adt || 0,
        pax_chd: order.pax_chd || 0,
        pax_inf: order.pax_inf || 0,
        note: order.note || "",
        completed: order.completed || false,
      });
    }
  }, [order]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parsedDate = parseISO(dateStr);
      return isValid(parsedDate)
        ? format(parsedDate, "dd/MM/yyyy", { locale: th })
        : dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatTimeDisplay = (timeStr) => timeStr || "-";

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOrderData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBookingChange = (bookingId, field, value, bookingType) => {
    const updatedBookings = [...orderData[bookingType]];
    const index = updatedBookings.findIndex((b) => b.id === bookingId);
    if (index !== -1) {
      updatedBookings[index] = { ...updatedBookings[index], [field]: value };
      setOrderData({ ...orderData, [bookingType]: updatedBookings });
    }
  };

  const handleDeleteBooking = (id, bookingType) => {
    setDeletedBookings((prev) => ({
      ...prev,
      [bookingType]: [...prev[bookingType], id],
    }));
  };

  const confirmDeleteBookings = async () => {
    const totalDeletions =
      deletedBookings.tourBookings.length +
      deletedBookings.transferBookings.length;
    if (totalDeletions === 0) return true;

    const tourCount = deletedBookings.tourBookings.length;
    const transferCount = deletedBookings.transferBookings.length;
    let message =
      "คุณแน่ใจหรือไม่ว่าต้องการลบรายการที่เลือก? การกระทำนี้ไม่สามารถย้อนกลับได้\n";
    if (tourCount > 0) {
      message += `- ทัวร์: ${tourCount} รายการ\n`;
    }
    if (transferCount > 0) {
      message += `- รถรับส่ง: ${transferCount} รายการ`;
    }

    return await showAlert({
      title: "ยืนยันการลบ",
      description: message,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive",
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage({ type: "info", message: "กำลังตรวจสอบ..." });

    try {
      const confirmed = await confirmDeleteBookings();
      if (!confirmed) {
        setDeletedBookings({ tourBookings: [], transferBookings: [] });
        setStatusMessage({ type: "", message: "" });
        setIsSubmitting(false);
        return;
      }

      for (const id of deletedBookings.tourBookings) {
        const { success, error } = await deleteBooking("tour", id);
        if (!success) {
          throw new Error(`ลบการจองทัวร์ ${id} ไม่สำเร็จ: ${error}`);
        }
      }

      for (const id of deletedBookings.transferBookings) {
        const { success, error } = await deleteBooking("transfer", id);
        if (!success) {
          throw new Error(`ลบการจองรถรับส่ง ${id} ไม่สำเร็จ: ${error}`);
        }
      }

      const pax_adt = parseInt(orderData.pax_adt) || 0;
      const pax_chd = parseInt(orderData.pax_chd) || 0;
      const pax_inf = parseInt(orderData.pax_inf) || 0;
      const totalPax = pax_adt + pax_chd + pax_inf;

      const updatedOrderData = {
        ...orderData,
        pax: totalPax.toString(),
        pax_adt,
        pax_chd,
        pax_inf,
        tourBookings: orderData.tourBookings.filter(
          (b) => !deletedBookings.tourBookings.includes(b.id)
        ),
        transferBookings: orderData.transferBookings.filter(
          (b) => !deletedBookings.transferBookings.includes(b.id)
        ),
      };

      setOrderData(updatedOrderData);

      if (typeof onDeleteBooking === "function") {
        deletedBookings.tourBookings.forEach((id) => {
          onDeleteBooking(id, "tourBookings");
        });
        deletedBookings.transferBookings.forEach((id) => {
          onDeleteBooking(id, "transferBookings");
        });
      }

      const result = await onSave(updatedOrderData);
      if (result.success) {
        setStatusMessage({ type: "success", message: "บันทึกสำเร็จ" });
        setIsEditing(false);
        setDeletedBookings({ tourBookings: [], transferBookings: [] });
        setTimeout(onClose, 1500);
      } else {
        throw new Error(result.error || "ไม่สามารถบันทึกข้อมูลได้");
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: `ข้อผิดพลาด: ${error.message}`,
      });
      setDeletedBookings({ tourBookings: [], transferBookings: [] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showAlert({
      title: "ยืนยันการลบ Order",
      description: `คุณแน่ใจหรือไม่ว่าต้องการลบ Order #${
        order.reference_id || order.id
      }? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive",
    });

    if (confirmed) {
      try {
        setIsSubmitting(true);
        const { error } = await supabase
          .from("orders")
          .delete()
          .eq("id", order.id);

        if (error) throw error;

        setStatusMessage({ type: "success", message: "ลบ Order สำเร็จ" });
        onOrderDeleted();
        setTimeout(onClose, 1500);
      } catch (error) {
        setStatusMessage({
          type: "error",
          message: `ข้อผิดพลาด: ${error.message}`,
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleCompletedStatus = async () => {
    const newStatus = !orderData.completed;
    const updatedData = { ...orderData, completed: newStatus };

    setOrderData(updatedData);

    try {
      const result = await onSave(updatedData);
      if (result.success) {
        showSuccess(
          `ปรับสถานะเป็น${newStatus ? "เรียบร้อย" : "ยังไม่เรียบร้อย"}แล้ว`
        );
      } else {
        throw new Error(result.error || "ไม่สามารถปรับสถานะได้");
      }
    } catch (error) {
      showError(`เกิดข้อผิดพลาด: ${error.message}`);
      setOrderData({ ...orderData });
    }
  };

  const renderVoucherBadges = (vouchers) => {
    if (!vouchers || !vouchers.length)
      return <span className="text-gray-500">ไม่มี Voucher</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {vouchers.map((voucher, i) => (
          <span
            key={i}
            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
          >
            <Ticket size={14} className="mr-1" />
            {voucher.year_number}-{voucher.sequence_number}
          </span>
        ))}
      </div>
    );
  };

  const getStatusText = (status) =>
    ({
      pending: "รอดำเนินการ",
      booked: "จองแล้ว",
      in_progress: "กำลังดำเนินการ",
      completed: "เสร็จสมบูรณ์",
      cancelled: "ยกเลิก",
    }[status] || status);

  const getStatusClass = (status) =>
    ({
      pending: "bg-gray-100 text-gray-800",
      booked: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }[status] || "bg-gray-100 text-gray-800");

  const renderStatusDropdown = (booking, bookingType) => (
    <select
      value={booking.status || "pending"}
      onChange={(e) =>
        handleBookingChange(booking.id, "status", e.target.value, bookingType)
      }
      className={`p-1 rounded text-xs ${getStatusClass(booking.status)}`}
    >
      {["pending", "booked", "in_progress", "completed", "cancelled"].map(
        (status) => (
          <option key={status} value={status}>
            {getStatusText(status)}
          </option>
        )
      )}
    </select>
  );

  const renderPaymentStatus = (status) => {
    const statusMap = {
      paid: (
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
          ชำระแล้ว
        </span>
      ),
      pending: (
        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs">
          รอชำระ
        </span>
      ),
      not_paid: (
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs">
          ยังไม่ชำระ
        </span>
      ),
    };
    return statusMap[status] || statusMap.not_paid;
  };

  const renderTourBookings = () => {
    if (!order.tourBookings?.length) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500">ไม่มีการจองทัวร์</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {order.tourBookings.map((b) => (
          <div
            key={b.id}
            className={`border border-green-200 bg-green-50 rounded-md p-3 transition-opacity ${
              deletedBookings.tourBookings.includes(b.id) ? "opacity-50" : ""
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium">{b.reference_id || `#${b.id}`}</p>
              <div className="flex items-center gap-2">
                {renderStatusDropdown(b, "tourBookings")}
                <button
                  type="button"
                  onClick={() => handleDeleteBooking(b.id, "tourBookings")}
                  className="flex items-center px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  disabled={deletedBookings.tourBookings.includes(b.id)}
                >
                  <Trash2 size={16} className="mr-1" />
                  ลบ
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่:</span>{" "}
                  {formatDateDisplay(b.tour_date)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">เวลารับ:</span>{" "}
                  {formatTimeDisplay(b.tour_pickup_time)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">จำนวนคน:</span>{" "}
                  {b.pax_adt || "0"} + {b.pax_chd || "0"} + {b.pax_inf || "0"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ประเภททัวร์:</span>{" "}
                  {b.tour_type || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ส่งใคร:</span>{" "}
                  {b.send_to || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">โรงแรม:</span>{" "}
                  {b.tour_hotel || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ห้อง:</span>{" "}
                  {b.tour_room_no || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">เบอร์ติดต่อ:</span>{" "}
                  {b.tour_contact_no || "-"}
                </p>
              </div>
              <div>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่สร้าง:</span>{" "}
                  {formatDateDisplay(b.created_at)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่อัพเดท:</span>{" "}
                  {formatDateDisplay(b.updated_at)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ราคาต้นทุน:</span>{" "}
                  {b.cost_price ? `${b.cost_price.toLocaleString()} บาท` : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ราคาขาย:</span>{" "}
                  {b.selling_price
                    ? `${b.selling_price.toLocaleString()} บาท`
                    : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">กำไร:</span>{" "}
                  {b.cost_price && b.selling_price
                    ? `${(b.selling_price - b.cost_price).toLocaleString()} บาท`
                    : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">สถานะชำระเงิน:</span>{" "}
                  {renderPaymentStatus(b.payment_status)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่ชำระ:</span>{" "}
                  {b.payment_date ? formatDateDisplay(b.payment_date) : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">หมายเหตุชำระ:</span>{" "}
                  {b.payment_note || "-"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm mb-1">
              <span className="text-gray-600">รายละเอียด:</span>{" "}
              {b.tour_detail || "-"}
            </p>
            <p className="text-sm mb-1">
              <span className="text-gray-600">หมายเหตุ:</span> {b.note || "-"}
            </p>
            <p className="text-sm mb-1">
              <span className="text-gray-600">Voucher:</span>{" "}
              {b.voucher_created ? "มี" : "ไม่มี"}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderTransferBookings = () => {
    if (!order.transferBookings?.length) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500">ไม่มีการจองรถรับส่ง</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {order.transferBookings.map((b) => (
          <div
            key={b.id}
            className={`border border-blue-200 bg-blue-50 rounded-md p-3 transition-opacity ${
              deletedBookings.transferBookings.includes(b.id)
                ? "opacity-50"
                : ""
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium">{b.reference_id || `#${b.id}`}</p>
              <div className="flex items-center gap-2">
                {renderStatusDropdown(b, "transferBookings")}
                <button
                  type="button"
                  onClick={() => handleDeleteBooking(b.id, "transferBookings")}
                  className="flex items-center px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  disabled={deletedBookings.transferBookings.includes(b.id)}
                >
                  <Trash2 size={16} className="mr-1" />
                  ลบ
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่:</span>{" "}
                  {formatDateDisplay(b.transfer_date)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">เวลา:</span>{" "}
                  {formatTimeDisplay(b.transfer_time)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">จุดรับ:</span>{" "}
                  {b.pickup_location || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">จุดส่ง:</span>{" "}
                  {b.drop_location || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">จำนวนคน:</span>{" "}
                  {b.pax_adt || "0"} + {b.pax_chd || "0"} + {b.pax_inf || "0"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ประเภทรถ:</span>{" "}
                  {b.transfer_type || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">รุ่นรถ:</span>{" "}
                  {b.car_model || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ส่งใคร:</span>{" "}
                  {b.send_to || "-"}
                </p>
              </div>
              <div>
                <p className="mb-1">
                  <span className="text-gray-600">เที่ยวบิน:</span>{" "}
                  {b.transfer_flight || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">เวลาเที่ยวบิน:</span>{" "}
                  {formatTimeDisplay(b.transfer_ftime)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">เบอร์ติดต่อ:</span>{" "}
                  {b.phone_number || "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่สร้าง:</span>{" "}
                  {formatDateDisplay(b.created_at)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่อัพเดท:</span>{" "}
                  {formatDateDisplay(b.updated_at)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ราคาต้นทุน:</span>{" "}
                  {b.cost_price ? `${b.cost_price.toLocaleString()} บาท` : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">ราคาขาย:</span>{" "}
                  {b.selling_price
                    ? `${b.selling_price.toLocaleString()} บาท`
                    : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">กำไร:</span>{" "}
                  {b.cost_price && b.selling_price
                    ? `${(b.selling_price - b.cost_price).toLocaleString()} บาท`
                    : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">สถานะชำระเงิน:</span>{" "}
                  {renderPaymentStatus(b.payment_status)}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">วันที่ชำระ:</span>{" "}
                  {b.payment_date ? formatDateDisplay(b.payment_date) : "-"}
                </p>
                <p className="mb-1">
                  <span className="text-gray-600">หมายเหตุชำระ:</span>{" "}
                  {b.payment_note || "-"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm mb-1">
              <span className="text-gray-600">รายละเอียด:</span>{" "}
              {b.transfer_detail || "-"}
            </p>
            <p className="text-sm mb-1">
              <span className="text-gray-600">หมายเหตุ:</span> {b.note || "-"}
            </p>
            <p className="text-sm mb-1">
              <span className="text-gray-600">Voucher:</span>{" "}
              {b.voucher_created ? "มี" : "ไม่มี"}
            </p>
          </div>
        ))}
      </div>
    );
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            Order #{order.reference_id || order.id}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 overflow-y-auto">
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Order Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-gray-700">
                    Reference ID:
                  </span>{" "}
                  {order.reference_id || `#${order.id}`}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Customer:</span>{" "}
                  {`${order.first_name || ""} ${
                    order.last_name || ""
                  }`.trim() || "N/A"}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Agent:</span>{" "}
                  {order.agent_name || "N/A"}
                </p>
                <p>
                  <span className="font-medium text-gray-700">PAX:</span> ADL:{" "}
                  {orderData.pax_adt || "0"} | CHD: {orderData.pax_chd || "0"} |
                  INF: {orderData.pax_inf || "0"}
                </p>
              </div>
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-gray-700">Status:</span>{" "}
                  <label className="inline-flex items-center ml-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="completed"
                      checked={orderData.completed}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span
                      className={`mr-3 text-sm text-white px-2 py-1 rounded-lg ${
                        orderData.completed ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {orderData.completed ? "เรียบร้อย" : "ยังไม่เรียบร้อย"}
                    </span>
                    <span
                      className={`relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                        orderData.completed ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-0 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${
                          orderData.completed
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </span>
                  </label>
                </p>
                <p>
                  <span className="font-medium text-gray-700">Date Range:</span>{" "}
                  {formatDateDisplay(order.start_date)} -{" "}
                  {formatDateDisplay(order.end_date)}
                </p>
                <p>
                  <span className="font-medium text-gray-700">
                    Created Date:
                  </span>{" "}
                  {formatDateDisplay(order.created_at)}
                </p>
                <p>
                  <span className="font-medium text-gray-700">Vouchers:</span>{" "}
                  {renderVoucherBadges(order.vouchers)}
                </p>
              </div>
            </div>
            {isEditing && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อลูกค้า
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={orderData.first_name || ""}
                      onChange={handleInputChange}
                      className="w-full border p-2 rounded border-gray-300 focus:ring focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={orderData.last_name || ""}
                      onChange={handleInputChange}
                      className="w-full border p-2 rounded border-gray-300 focus:ring focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent
                    </label>
                    <input
                      type="text"
                      name="agent_name"
                      value={orderData.agent_name || ""}
                      onChange={handleInputChange}
                      className="w-full border p-2 rounded border-gray-300 focus:ring focus:ring-blue-200 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จำนวนผู้โดยสาร
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        ผู้ใหญ่ (ADL)
                      </label>
                      <input
                        type="number"
                        name="pax_adt"
                        value={orderData.pax_adt || 0}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded border-gray-300 focus:ring focus:ring-blue-200 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        เด็ก (CHD)
                      </label>
                      <input
                        type="number"
                        name="pax_chd"
                        value={orderData.pax_chd || 0}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded border-gray-300 focus:ring focus:ring-blue-200 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        ทารก (INF)
                      </label>
                      <input
                        type="number"
                        name="pax_inf"
                        value={orderData.pax_inf || 0}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded border-gray-300 focus:ring focus:ring-blue-200 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <MapPinned size={18} className="mr-2 text-green-600" />
                  Tour Bookings
                </h4>
              </div>
              {renderTourBookings()}
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Car size={18} className="mr-2 text-blue-600" />
                  Transfer Bookings
                </h4>
              </div>
              {renderTransferBookings()}
            </div>
          </div>
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <FileText size={18} className="mr-2 text-gray-600" />
              Note
            </h4>
            <textarea
              name="note"
              value={orderData.note || ""}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring focus:ring-blue-200 focus:border-blue-500"
              rows="3"
              placeholder="เพิ่มบันทึกสำหรับ Order นี้..."
            />
          </div>
          {statusMessage.message && (
            <div
              className={`p-3 rounded mb-4 ${
                statusMessage.type === "success"
                  ? "bg-green-100 text-green-700"
                  : statusMessage.type === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {statusMessage.message}
            </div>
          )}
          <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t pb-3 px-3 shadow-sm rounded-md border-gray-200">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                disabled={isSubmitting}
              >
                <Trash2 size={18} className="mr-2" />
                ลบ Order
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="opacity-25"
                        />
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          className="opacity-75"
                        />
                      </svg>
                      กำลังบันทึก...
                    </span>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      บันทึก
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderDetails;
