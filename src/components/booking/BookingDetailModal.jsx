import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Trash2,
  User,
  Calendar,
  Clock,
  Package,
  FileText,
} from "lucide-react";
import supabase from "../../config/supabaseClient";
import { formatDate } from "../../utils/dateUtils";
import { useAlertDialogContext } from "../../contexts/AlertDialogContext";

const BookingDetailModal = ({
  booking,
  bookingType,
  onClose,
  onSave,
  onDelete,
}) => {
  const showAlert = useAlertDialogContext();
  const [formData, setFormData] = useState({});
  const [statusMessage, setStatusMessage] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [orderData, setOrderData] = useState(null);

  // เพิ่ม Effect สำหรับการกดปุ่ม ESC
  useEffect(() => {
    const handleEscKeyPress = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscKeyPress);

    return () => {
      window.removeEventListener("keydown", handleEscKeyPress);
    };
  }, [onClose]);

  useEffect(() => {
    if (booking) {
      // ตั้งค่าข้อมูลฟอร์มจาก booking
      setFormData({
        ...booking,
        // กำหนดค่าเริ่มต้นสำหรับจำนวนคนแต่ละประเภท
        pax_adt: booking.pax_adt || 0,
        pax_chd: booking.pax_chd || 0,
        pax_inf: booking.pax_inf || 0,
      });

      // ตรวจสอบว่าควรแสดงฟิลด์เพิ่มเติมหรือไม่ตามสถานะ
      const status = booking.status || "pending";
      setShowAdditionalFields(
        ["booked", "in_progress", "completed"].includes(status)
      );

      // ดึงข้อมูล order เพื่อแสดงเป็นข้อมูลเพิ่มเติมเท่านั้น
      if (booking.order_id) {
        fetchOrderData(booking.order_id);
      }
    }
  }, [booking]);

  // ดึงข้อมูล order จาก Supabase
  const fetchOrderData = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;

      setOrderData(data);
    } catch (error) {
      console.error("Error fetching order data:", error);
    }
  };

  // จัดการเมื่อค่าในฟอร์มเปลี่ยนแปลง
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // เปิด/ปิดฟิลด์เพิ่มเติมสำหรับ transfer bookings ตามสถานะ
    if (name === "status" && bookingType === "transfer") {
      setShowAdditionalFields(
        ["booked", "in_progress", "completed"].includes(value)
      );
    }
  };

  // จัดการการส่งฟอร์ม
  // จัดการการส่งฟอร์ม
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage({ type: "info", message: "กำลังบันทึกข้อมูล..." });

    try {
      // สร้างข้อมูลใหม่โดยไม่รวมฟิลด์ orders (ถ้ามี)
      const { orders, ...bookingDataToSave } = formData;

      // ตรวจสอบว่ามีการเปลี่ยนแปลง pax หรือไม่
      const hasPaxChanged =
        "pax_adt" in bookingDataToSave ||
        "pax_chd" in bookingDataToSave ||
        "pax_inf" in bookingDataToSave;

      // คำนวณค่า pax รวม
      const pax_adt = parseInt(bookingDataToSave.pax_adt || 0);
      const pax_chd = parseInt(bookingDataToSave.pax_chd || 0);
      const pax_inf = parseInt(bookingDataToSave.pax_inf || 0);
      const totalPax = pax_adt + pax_chd + pax_inf;

      // สร้างข้อมูลสำหรับอัปเดต pax
      const paxData = {
        pax: totalPax.toString(),
        pax_adt,
        pax_chd,
        pax_inf,
      };

      // ถ้ามีการเปลี่ยนแปลง pax และมี order_id
      if (hasPaxChanged && bookingDataToSave.order_id) {
        // 1. อัปเดตตาราง orders
        const { error: orderError } = await supabase
          .from("orders")
          .update(paxData)
          .eq("id", bookingDataToSave.order_id);

        if (orderError) {
          console.error("Error updating orders:", orderError);
          throw new Error(
            `ไม่สามารถอัปเดตข้อมูลใน orders: ${orderError.message}`
          );
        }

        // 2. อัปเดตตาราง tour_bookings ที่มี order_id เดียวกัน
        const { error: tourError } = await supabase
          .from("tour_bookings")
          .update(paxData)
          .eq("order_id", bookingDataToSave.order_id);

        if (tourError) {
          console.error("Error updating tour_bookings:", tourError);
          throw new Error(
            `ไม่สามารถอัปเดตข้อมูลใน tour_bookings: ${tourError.message}`
          );
        }

        // 3. อัปเดตตาราง transfer_bookings ที่มี order_id เดียวกัน
        const { error: transferError } = await supabase
          .from("transfer_bookings")
          .update(paxData)
          .eq("order_id", bookingDataToSave.order_id);

        if (transferError) {
          console.error("Error updating transfer_bookings:", transferError);
          throw new Error(
            `ไม่สามารถอัปเดตข้อมูลใน transfer_bookings: ${transferError.message}`
          );
        }
      }

      // 4. อัปเดตข้อมูลของ booking ที่กำลังแก้ไข
      const result = await onSave(bookingDataToSave);

      if (result.success) {
        setStatusMessage({ type: "success", message: "บันทึกข้อมูลสำเร็จ" });

        // ปิด modal หลังจากบันทึกสำเร็จ
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({
          type: "error",
          message: `เกิดข้อผิดพลาด: ${
            result.error || "ไม่สามารถบันทึกข้อมูลได้"
          }`,
        });
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        message: `เกิดข้อผิดพลาด: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // จัดการการลบข้อมูล
  const handleDelete = async () => {
    // เปลี่ยนจาก confirm เป็น showAlert
    const confirmed = await showAlert({
      title: "ยืนยันการลบ",
      description: "คุณต้องการลบรายการนี้ใช่หรือไม่?",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive", // กำหนดสีปุ่มเป็นสีแดง
    });

    // ทำงานต่อเมื่อผู้ใช้กดยืนยันเท่านั้น
    if (confirmed) {
      setIsSubmitting(true);

      const result = await onDelete(booking.id);

      if (result.success) {
        setStatusMessage({ type: "success", message: "ลบข้อมูลสำเร็จ" });

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMessage({
          type: "error",
          message: `เกิดข้อผิดพลาด: ${result.error || "ไม่สามารถลบข้อมูลได้"}`,
        });
      }

      setIsSubmitting(false);
    }
  };

  // แสดงข้อมูล Order (แสดงเป็นข้อมูลเพิ่มเติม ไม่สามารถแก้ไขได้)
  const renderOrderInfo = () => {
    if (!orderData) return null;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-medium flex items-center">
            <User size={18} className="mr-2 text-gray-600" />
            ข้อมูล Order
          </h4>
          <span className="text-sm text-gray-500">
            {/* (ข้อมูลนี้ไม่สามารถแก้ไขได้ใน modal นี้) */}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">รหัส Order:</p>
            <p className="font-medium">
              {orderData.reference_id || `#${orderData.id}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ชื่อลูกค้า:</p>
            <p className="font-medium">
              {orderData.first_name} {orderData.last_name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Agent:</p>
            <p className="font-medium">{orderData.agent_name || "-"}</p>
          </div>
        </div>
      </div>
    );
  };

  // กำหนดกลุ่มฟิลด์สำหรับแสดงตามประเภทของ booking
  const getFieldGroups = () => {
    if (bookingType === "tour") {
      return [
        {
          title: "ข้อมูลหลัก",
          icon: <Calendar size={18} className="mr-2 text-green-600" />,
          fields: [
            {
              name: "reference_id",
              label: "รหัสการจอง",
              readOnly: true,
              value: booking.reference_id || `#${booking.id}`,
            },
            {
              name: "status",
              label: "สถานะ",
              type: "select",
              options: [
                { value: "pending", label: "รอดำเนินการ" },
                { value: "booked", label: "จองแล้ว" },
                { value: "in_progress", label: "ดำเนินการอยู่" },
                { value: "completed", label: "เสร็จสมบูรณ์" },
                { value: "cancelled", label: "ยกเลิก" },
              ],
            },
            {
              name: "tour_date",
              label: "วันที่",
              type: "date",
              className:
                "bg-green-50 border-green-300 text-green-800 font-bold",
              labelClass: "text-green-700 font-semibold",
            },

            {
              name: "tour_pickup_time",
              label: "เวลารับ",
              className:
                "bg-green-50 border-green-300 text-green-800 font-bold",
              labelClass: "text-green-700 font-semibold",
            },
          ],
        },
        {
          title: "รายละเอียดทัวร์",
          icon: <Package size={18} className="mr-2 text-green-600" />,
          fields: [
            { name: "tour_type", label: "ประเภททัวร์" },
            {
              name: "tour_detail",
              label: "รายละเอียด",
              type: "textarea",
              className:
                "bg-green-50 border-green-300 text-green-800 font-bold",
              labelClass: "text-green-700 font-semibold",
            },
            {
              component: (
                <div className="md:col-span-3 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ผู้ใหญ่:
                    </label>
                    <input
                      type="number"
                      name="pax_adt"
                      id={`field-pax_adt`}
                      value={formData.pax_adt || 0}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "pax_adt", value: e.target.value },
                        })
                      }
                      className="w-full border rounded-md p-2 border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เด็ก:
                    </label>
                    <input
                      type="number"
                      name="pax_chd"
                      id={`field-pax_chd`}
                      value={formData.pax_chd || 0}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "pax_chd", value: e.target.value },
                        })
                      }
                      className="w-full border rounded-md p-2 border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ทารก:
                    </label>
                    <input
                      type="number"
                      name="pax_inf"
                      id={`field-pax_inf`}
                      value={formData.pax_inf || 0}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "pax_inf", value: e.target.value },
                        })
                      }
                      className="w-full border rounded-md p-2 border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                      min="0"
                    />
                  </div>
                </div>
              ),
            },
            {
              name: "tour_hotel",
              label: "โรงแรม",
              className:
                "bg-green-50 border-green-300 text-green-800 font-bold",
              labelClass: "text-green-700 font-semibold",
            },
            {
              name: "tour_room_no",
              label: "หมายเลขห้อง",
              className:
                "bg-green-50 border-green-300 text-green-800 font-bold",
              labelClass: "text-green-700 font-semibold",
            },
            { name: "tour_contact_no", label: "เบอร์ติดต่อ" },
            {
              name: "send_to",
              label: "ส่งใคร",
              className:
                "bg-green-50 border-green-300 text-green-800 font-bold",
              labelClass: "text-green-700 font-semibold",
            },
          ],
        },
        {
          title: "ราคาและหมายเหตุ",
          icon: <FileText size={18} className="mr-2 text-green-600" />,
          fields: [
            { name: "cost_price", label: "ราคาต้นทุน", type: "number" },
            { name: "selling_price", label: "ราคาขาย", type: "number" },
            { name: "note", label: "หมายเหตุ", type: "textarea" },
          ],
        },
      ];
    } else {
      return [
        {
          title: "ข้อมูลหลัก",
          icon: <Calendar size={18} className="mr-2 text-blue-600" />,
          fields: [
            {
              name: "reference_id",
              label: "รหัสการจอง",
              readOnly: true,
              value: booking.reference_id || `#${booking.id}`,
            },
            {
              name: "status",
              label: "สถานะ",
              type: "select",
              options: [
                { value: "pending", label: "รอดำเนินการ" },
                { value: "booked", label: "จองแล้ว" },
                { value: "in_progress", label: "ดำเนินการอยู่" },
                { value: "completed", label: "เสร็จสมบูรณ์" },
                { value: "cancelled", label: "ยกเลิก" },
              ],
            },
            {
              name: "transfer_date",
              label: "วันที่",
              type: "date",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
            {
              name: "transfer_time",
              label: "เวลารับ",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
          ],
        },
        {
          title: "รายละเอียดการรับส่ง",
          icon: <Clock size={18} className="mr-2 text-blue-600" />,
          fields: [
            { name: "transfer_type", label: "ประเภทการรับส่ง" },
            {
              name: "transfer_detail",
              label: "รายละเอียด",
              type: "textarea",
            },
            {
              component: (
                <div className="md:col-span-3 grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ผู้ใหญ่:
                    </label>
                    <input
                      type="number"
                      name="pax_adt"
                      id={`field-pax_adt`}
                      value={formData.pax_adt || 0}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "pax_adt", value: e.target.value },
                        })
                      }
                      className="w-full border rounded-md p-2 border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เด็ก:
                    </label>
                    <input
                      type="number"
                      name="pax_chd"
                      id={`field-pax_chd`}
                      value={formData.pax_chd || 0}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "pax_chd", value: e.target.value },
                        })
                      }
                      className="w-full border rounded-md p-2 border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ทารก:
                    </label>
                    <input
                      type="number"
                      name="pax_inf"
                      id={`field-pax_inf`}
                      value={formData.pax_inf || 0}
                      onChange={(e) =>
                        handleChange({
                          target: { name: "pax_inf", value: e.target.value },
                        })
                      }
                      className="w-full border rounded-md p-2 border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
                      min="0"
                    />
                  </div>
                </div>
              ),
            },
            {
              name: "pickup_location",
              label: "สถานที่รับ",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
            {
              name: "drop_location",
              label: "สถานที่ส่ง",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
            {
              name: "transfer_flight",
              label: "เที่ยวบิน",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
            {
              name: "transfer_ftime",
              label: "เวลาบิน",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
            {
              name: "send_to",
              label: "ส่งใคร",
              className: "bg-blue-50 border-blue-300 text-blue-800 font-bold",
              labelClass: "text-blue-700 font-semibold",
            },
            { name: "note", label: "หมายเหตุ", type: "textarea" },
          ],
        },
        {
          title: "ข้อมูลคนขับ",
          icon: <User size={18} className="mr-2 text-blue-600" />,
          className: showAdditionalFields ? "" : "hidden",
          fields: [
            { name: "driver_name", label: "ชื่อคนขับ" },
            { name: "license_plate", label: "ทะเบียนรถ" },
            { name: "car_model", label: "รุ่นรถ" },
            { name: "phone_number", label: "เบอร์โทร" },
          ],
        },
        {
          title: "ราคาและหมายเหตุ",
          icon: <FileText size={18} className="mr-2 text-blue-600" />,
          fields: [
            { name: "cost_price", label: "ราคาต้นทุน", type: "number" },
            { name: "selling_price", label: "ราคาขาย", type: "number" },
            { name: "payment_note", label: "หมายเหตุ", type: "textarea" },
          ],
        },
      ];
    }
  };

  const renderField = (field) => {
    // ถ้ามี component property ให้แสดง component นั้นเลย
    if (field.component) {
      return field.component;
    }

    const {
      name,
      label,
      type = "text",
      readOnly = false,
      options = [],
      value: explicitValue,
      className = "", // ดึง className มาจาก field
    } = field;

    const fieldValue =
      explicitValue !== undefined ? explicitValue : formData[name] || "";

    const baseClass = `w-full rounded-md p-2 border ${
      readOnly
        ? "bg-gray-100 border-gray-300"
        : "border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200"
    } ${className}`; // << ใส่ className ที่มากับ field ด้วย

    switch (type) {
      case "textarea":
        return (
          <textarea
            name={name}
            id={`field-${name}`}
            value={fieldValue}
            onChange={handleChange}
            readOnly={readOnly}
            className={baseClass}
            rows={3}
          />
        );
      case "select":
        return (
          <select
            name={name}
            id={`field-${name}`}
            value={fieldValue}
            onChange={handleChange}
            disabled={readOnly}
            className={baseClass}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type={type}
            name={name}
            id={`field-${name}`}
            value={fieldValue}
            onChange={handleChange}
            readOnly={readOnly}
            className={baseClass}
          />
        );
    }
  };

  // ฟังก์ชันแปลงสถานะเป็นภาษาไทย
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

  // ฟังก์ชันสร้างสี badge ตามสถานะ
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

  return (
    <div className="fixed inset-0 z-50 overflow-auto modal-backdrop bg-opacity-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div
          className={`px-4 py-3 border-b flex justify-between items-center sticky top-0 ${
            bookingType === "tour" ? "bg-green-600" : "bg-blue-600"
          } text-white rounded-t-lg`}
        >
          <div className="flex justify-center items-center">
            <span className="text-xl font-semibold mr-2">
              {bookingType === "tour"
                ? "รายละเอียดการจองทัวร์"
                : "รายละเอียดการจองรถรับส่ง"}
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
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* แสดงข้อมูล Order (เป็นข้อมูลเพิ่มเติม ไม่สามารถแก้ไขได้) */}
          {renderOrderInfo()}

          {/* แสดงฟิลด์ต่างๆ ของ Booking ที่สามารถแก้ไขได้ */}
          {getFieldGroups().map((group, groupIndex) => (
            <div key={groupIndex} className={`mb-6 ${group.className || ""}`}>
              <h4 className="text-lg font-medium mb-3 pb-2 border-b border-gray-200 flex items-center">
                {group.icon}
                {group.title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
                {group.fields.map((field, fieldIndex) =>
                  field.component ? (
                    <div key={fieldIndex} className="col-span-2">
                      {field.component}
                    </div>
                  ) : (
                    <div key={field.name} className="mb-3">
                      <label
                        htmlFor={`field-${field.name}`}
                        className={`block text-sm mb-1 ${
                          field.labelClass || "text-gray-700"
                        }`}
                      >
                        {field.label}
                      </label>
                      {renderField(field)}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}

          {/* แสดงข้อความสถานะ */}
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

          {/* ปุ่มดำเนินการ */}
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              <Trash2 size={18} className="mr-2" />
              ลบรายการ
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ปิด
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center px-6 py-2 ${
                  bookingType === "tour" ? "bg-green-600" : "bg-blue-600"
                } text-white rounded hover:opacity-90 transition-colors disabled:opacity-50`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    กำลังบันทึก...
                  </span>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingDetailModal;
