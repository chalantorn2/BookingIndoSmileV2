import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import supabase from "../config/supabaseClient";
import { useNotification } from "../hooks/useNotification";
import {
  fetchAllInvoices,
  createInvoice,
  updateInvoice,
  updatePaymentsInvoiceStatus,
  fetchInvoiceById,
  deleteInvoice,
} from "../services/invoiceService";
import "../styles/invoice.css";
import HeaderInvoice from "../components/invoice/HeaderInvoice";
import InvoiceTable from "../components/invoice/InvoiceTable";
import InvoiceFooter from "../components/invoice/InvoiceFooter";
import SummarySection from "../components/invoice/SummarySection";
import InvoiceStatusModal from "../components/invoice/InvoiceStatusModal";
import ViewInvoicesModal from "../components/invoice/ViewInvoicesModal";
import {
  X,
  CheckSquare,
  Save,
  Edit,
  Download,
  Eye,
  Printer,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  CheckCircle,
  Search,
} from "lucide-react";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";

const formatNumberWithCommas = (num) => {
  if (num === null || num === undefined) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const Invoice = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const showAlert = useAlertDialogContext();
  const [allPaymentsData, setAllPaymentsData] = useState([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(
    format(new Date(), "dd/MM/yyyy")
  );
  const [invoiceId, setInvoiceId] = useState("");
  const [showCostProfit, setShowCostProfit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [invoicesList, setInvoicesList] = useState([]);
  const [paymentsByMonth, setPaymentsByMonth] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalSellingPrice, setTotalSellingPrice] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [isViewingExistingInvoice, setIsViewingExistingInvoice] =
    useState(false);
  const [invoiceName, setInvoiceName] = useState("");

  // สำหรับการแก้ไข Invoice
  const [editablePaymentIds, setEditablePaymentIds] = useState([]);
  const [nonInvoicedPayments, setNonInvoicedPayments] = useState([]);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const printRef = useRef(null);

  const organizePaymentsByMonth = (payments) => {
    if (!payments || !Array.isArray(payments)) return;
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const byMonth = {};

    payments.forEach((payment) => {
      if (payment.invoiced) return;
      let paymentDate = new Date();

      // หาวันที่เริ่มต้นและสิ้นสุด
      let startDate = null;
      let endDate = null;

      if (payment.bookings && payment.bookings.length > 0) {
        payment.bookings.forEach((booking) => {
          const dateStr =
            booking.date || booking.tour_date || booking.transfer_date;
          if (dateStr) {
            const currentDate = new Date(dateStr);
            if (!startDate || currentDate < startDate) startDate = currentDate;
            if (!endDate || currentDate > endDate) endDate = currentDate;
          }
        });

        // ใช้วันที่แรกเป็นวันที่หลักของ payment
        if (startDate) paymentDate = startDate;
      }

      const monthKey = `${
        months[paymentDate.getMonth()]
      } ${paymentDate.getFullYear()}`;
      if (!byMonth[monthKey]) byMonth[monthKey] = [];

      // สร้างข้อความ dateRangeStr ให้ชัดเจนยิ่งขึ้น
      let dateRangeStr = "";
      if (startDate && endDate) {
        const formatDateShort = (date) => format(date, "dd/MM/yyyy");

        if (startDate.getTime() === endDate.getTime()) {
          // ถ้าวันเริ่มต้นและสิ้นสุดเป็นวันเดียวกัน
          dateRangeStr = ` |  ${formatDateShort(startDate)}`;
        } else {
          // ถ้าเป็นคนละวัน
          dateRangeStr = ` |  ${formatDateShort(startDate)} - ${formatDateShort(
            endDate
          )}`;
        }
      }

      byMonth[monthKey].push({
        id: payment.id,
        displayName: payment.first_name
          ? `${payment.first_name} ${payment.last_name || ""}`.trim()
          : "No Name",
        dateRangeStr,
        isChecked: selectedPaymentIds.includes(payment.id),
      });
    });

    setPaymentsByMonth(byMonth);
  };

  const handleOpenSelectModal = () => setIsSelectModalOpen(true);

  const handleConfirmSelection = () => {
    setIsSelectModalOpen(false);
    buildInvoiceTable();
  };

  const buildInvoiceTable = () => {
    if (selectedPaymentIds.length === 0) return;
    setLoading(true);
    try {
      calculateTotals();
    } catch (error) {
      console.error("Error building invoice table:", error);
      setError("เกิดข้อผิดพลาดในการสร้างตาราง Invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (selectedPaymentIds.length === 0) {
      setError("กรุณาเลือก Payment อย่างน้อย 1 รายการ");
      return;
    }
    if (!invoiceDate) {
      setError("กรุณากรอกวันที่ก่อนบันทึก Invoice");
      return;
    }

    const promptedInvoiceName = prompt("กรุณาตั้งชื่อ Invoice:", invoiceName);
    if (!promptedInvoiceName) {
      setError("คุณยังไม่ได้ตั้งชื่อ Invoice");
      return;
    }

    setInvoiceName(promptedInvoiceName);
    setLoading(true);
    setError(null);

    try {
      const safeGrandTotal = Number(Number(grandTotal).toFixed(2));
      const safeTotalCost = Number(Number(totalCost).toFixed(2));
      const safeTotalSellingPrice = Number(
        Number(totalSellingPrice).toFixed(2)
      );
      const safeTotalProfit = Number(Number(totalProfit).toFixed(2));

      const MAX_NUMERIC_VALUE = 1e38;
      if (
        safeGrandTotal > MAX_NUMERIC_VALUE ||
        safeTotalCost > MAX_NUMERIC_VALUE ||
        safeTotalSellingPrice > MAX_NUMERIC_VALUE ||
        safeTotalProfit > MAX_NUMERIC_VALUE
      ) {
        throw new Error("ตัวเลขมีค่าสูงเกินไป ไม่สามารถบันทึกได้");
      }

      const invoiceData = {
        invoice_name: promptedInvoiceName,
        invoice_date: invoiceDate,
        payment_ids: selectedPaymentIds,
        total_amount: safeGrandTotal.toString(),
        total_cost: safeTotalCost.toString(),
        total_selling_price: safeTotalSellingPrice.toString(),
        total_profit: safeTotalProfit.toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (error) throw error;

      for (const paymentId of selectedPaymentIds) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({ invoiced: true })
          .eq("id", paymentId);
        if (updateError)
          console.error(`Failed to update payment ${paymentId}:`, updateError);
      }

      showSuccess(`บันทึก Invoice เรียบร้อย! Invoice: ${promptedInvoiceName}`);
      setSelectedPaymentIds([]);
      setGrandTotal(0);
      setTotalCost(0);
      setTotalSellingPrice(0);
      setTotalProfit(0);
      await loadInitialData();
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError(`เกิดข้อผิดพลาดในการบันทึก Invoice: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let grandTotalSum = 0;
    let costSum = 0;
    let sellingSum = 0;
    let profitSum = 0;

    selectedPaymentIds.forEach((paymentId) => {
      const payment = allPaymentsData.find((p) => p.id === paymentId);
      if (!payment || !payment.bookings || !Array.isArray(payment.bookings))
        return;

      payment.bookings.forEach((booking) => {
        const price = parseFloat(booking.sellingPrice) || 0;
        const quantity = parseInt(booking.quantity) || 0;
        const cost = parseFloat(booking.cost) || 0;

        const rowTotal = price * quantity;
        const rowCost = cost * quantity;
        const rowProfit = rowTotal - rowCost;

        grandTotalSum += rowTotal;
        costSum += rowCost;
        sellingSum += rowTotal;
        profitSum += rowProfit;
      });
    });

    setGrandTotal(grandTotalSum);
    setTotalCost(costSum);
    setTotalSellingPrice(sellingSum);
    setTotalProfit(profitSum);

    return {
      grandTotal: grandTotalSum,
      totalCost: costSum,
      totalSellingPrice: sellingSum,
      totalProfit: profitSum,
    };
  };

  const handleViewInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await fetchAllInvoices();
      if (error) throw error;
      if (!data || data.length === 0) {
        setError("ไม่พบข้อมูล Invoice");
        return;
      }
      setInvoicesList(data);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Error loading invoices:", error);
      setError("ไม่สามารถโหลดรายการ Invoice ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSelectedInvoice = async (selectedInvoiceId) => {
    if (!selectedInvoiceId) {
      setError("กรุณาเลือก Invoice ก่อน");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchInvoiceById(selectedInvoiceId);
      if (error) throw error;
      if (!data) {
        setError("ไม่พบข้อมูล Invoice");
        return;
      }

      setCurrentInvoice(data);
      setInvoiceId(selectedInvoiceId);
      setInvoiceName(data.invoice_name || "");
      setInvoiceDate(data.invoice_date || format(new Date(), "dd/MM/yyyy"));
      setSelectedPaymentIds(data.payment_ids || []);

      // **เพิ่มส่วนนี้: คำนวณ GRAND TOTAL ใหม่จาก Payment**
      let realTimeGrandTotal = 0;
      let realTimeTotalCost = 0;
      let realTimeTotalSellingPrice = 0;
      let realTimeTotalProfit = 0;

      if (data.payment_ids && data.payment_ids.length > 0) {
        const relatedPayments = allPaymentsData.filter((p) =>
          data.payment_ids.includes(p.id)
        );

        relatedPayments.forEach((payment) => {
          if (payment.bookings && Array.isArray(payment.bookings)) {
            payment.bookings.forEach((booking) => {
              const price = parseFloat(booking.sellingPrice) || 0;
              const quantity = parseInt(booking.quantity) || 0;
              const cost = parseFloat(booking.cost) || 0;

              const rowTotal = price * quantity;
              const rowCost = cost * quantity;

              realTimeGrandTotal += rowTotal;
              realTimeTotalCost += rowCost;
              realTimeTotalSellingPrice += rowTotal;
            });
          }
        });

        realTimeTotalProfit = realTimeTotalSellingPrice - realTimeTotalCost;
      }

      // ใช้ค่าที่คำนวณใหม่แทนค่าจาก database
      setGrandTotal(realTimeGrandTotal);
      setTotalCost(realTimeTotalCost);
      setTotalSellingPrice(realTimeTotalSellingPrice);
      setTotalProfit(realTimeTotalProfit);
      // **จบส่วนที่เพิ่ม**

      setIsViewModalOpen(false);
    } catch (error) {
      console.error("Error loading invoice:", error);
      setError("ไม่สามารถโหลดข้อมูล Invoice ได้");
    } finally {
      setLoading(false);
      setIsViewingExistingInvoice(true);
    }
  };

  // เพิ่มฟังก์ชันใหม่สำหรับเปิด Modal แก้ไข Invoice
  const handleEditInvoice = async () => {
    if (!invoiceId) {
      setError("กรุณาเลือก Invoice ที่จะแก้ไขก่อน");
      return;
    }

    setLoading(true);

    try {
      // ดึงข้อมูล Payment ที่เลือกไว้แล้ว
      setEditablePaymentIds([...selectedPaymentIds]);

      // ดึงข้อมูล Payment ที่ยังไม่ได้ออก Invoice
      const { data: nonInvoicedPaymentsData, error: nonInvoicedError } =
        await supabase.from("payments").select("*").eq("invoiced", false);

      if (nonInvoicedError) throw nonInvoicedError;

      setNonInvoicedPayments(nonInvoicedPaymentsData || []);
      setEditingInvoiceId(invoiceId);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Error preparing to edit invoice:", error);
      setError(
        `ไม่สามารถเตรียมข้อมูลสำหรับแก้ไข Invoice ได้: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับบันทึกการแก้ไข Invoice
  const handleSaveEditedInvoice = async () => {
    if (!editingInvoiceId) {
      setError("ไม่พบ Invoice ที่กำลังแก้ไข");
      return;
    }

    if (editablePaymentIds.length === 0) {
      setError("กรุณาเลือก Payment อย่างน้อย 1 รายการ");
      return;
    }

    setLoading(true);

    try {
      // คำนวณยอดรวมใหม่จาก Payment ที่เลือก
      let updatedTotalCost = 0;
      let updatedTotalSellingPrice = 0;
      let updatedGrandTotal = 0;
      let updatedTotalProfit = 0;

      // ดึงข้อมูล Payment ที่เลือกทั้งหมด
      const selectedPayments = allPaymentsData.filter((p) =>
        editablePaymentIds.includes(p.id)
      );

      selectedPayments.forEach((payment) => {
        if (payment.bookings && Array.isArray(payment.bookings)) {
          payment.bookings.forEach((booking) => {
            const price = parseFloat(booking.sellingPrice) || 0;
            const quantity = parseInt(booking.quantity) || 0;
            const cost = parseFloat(booking.cost) || 0;

            const rowTotal = price * quantity;
            const rowCost = cost * quantity;

            updatedGrandTotal += rowTotal;
            updatedTotalCost += rowCost;
            updatedTotalSellingPrice += rowTotal;
          });
        }
      });

      updatedTotalProfit = updatedTotalSellingPrice - updatedTotalCost;

      // ข้อมูลที่จะอัพเดท
      const updatedInvoiceData = {
        payment_ids: editablePaymentIds,
        total_amount: updatedGrandTotal.toString(),
        total_cost: updatedTotalCost.toString(),
        total_selling_price: updatedTotalSellingPrice.toString(),
        total_profit: updatedTotalProfit.toString(),
        updated_at: new Date().toISOString(),
      };

      // อัพเดท Invoice
      const { error: updateError } = await updateInvoice(
        editingInvoiceId,
        updatedInvoiceData
      );

      if (updateError) throw updateError;

      // อัพเดทสถานะ invoiced ของ Payment เก่า
      const currentPaymentIds = [...selectedPaymentIds];

      // Payment ที่ถูกนำออกจาก Invoice
      const removedPaymentIds = currentPaymentIds.filter(
        (id) => !editablePaymentIds.includes(id)
      );
      if (removedPaymentIds.length > 0) {
        await updatePaymentsInvoiceStatus(removedPaymentIds, false);
      }

      // Payment ที่ถูกเพิ่มเข้ามาใน Invoice
      const addedPaymentIds = editablePaymentIds.filter(
        (id) => !currentPaymentIds.includes(id)
      );
      if (addedPaymentIds.length > 0) {
        await updatePaymentsInvoiceStatus(addedPaymentIds, true);
      }

      // อัพเดทข้อมูลในหน้าหลัก
      setSelectedPaymentIds(editablePaymentIds);
      setGrandTotal(updatedGrandTotal);
      setTotalCost(updatedTotalCost);
      setTotalSellingPrice(updatedTotalSellingPrice);
      setTotalProfit(updatedTotalProfit);

      showSuccess("อัพเดท Invoice เรียบร้อยแล้ว");
      setIsEditModalOpen(false);

      // โหลดข้อมูลใหม่
      await loadInitialData();
    } catch (error) {
      console.error("Error saving edited invoice:", error);
      setError(`ไม่สามารถบันทึกการแก้ไข Invoice ได้: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับเลื่อนตำแหน่ง Payment
  const handleMovePayment = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === editablePaymentIds.length - 1)
    ) {
      return; // ไม่สามารถเลื่อนนอกขอบเขตได้
    }

    const newEditablePaymentIds = [...editablePaymentIds];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    // สลับตำแหน่ง
    [newEditablePaymentIds[index], newEditablePaymentIds[swapIndex]] = [
      newEditablePaymentIds[swapIndex],
      newEditablePaymentIds[index],
    ];

    setEditablePaymentIds(newEditablePaymentIds);
  };

  // ฟังก์ชันสำหรับเพิ่ม Payment เข้าไปใน Invoice
  const handleAddPaymentToInvoice = (paymentId) => {
    if (editablePaymentIds.includes(paymentId)) {
      return; // ไม่เพิ่มซ้ำ
    }

    setEditablePaymentIds([...editablePaymentIds, paymentId]);
  };

  // ฟังก์ชันสำหรับลบ Payment ออกจาก Invoice
  const handleRemovePaymentFromInvoice = (paymentId) => {
    setEditablePaymentIds(editablePaymentIds.filter((id) => id !== paymentId));
  };

  // ใน Invoice.jsx - แก้ไขฟังก์ชัน handleDeleteInvoice

  const handleDeleteInvoice = async () => {
    if (!invoiceId) {
      setError("กรุณาเลือก Invoice ที่จะลบก่อน");
      return;
    }

    const confirmed = await showAlert({
      title: "ยืนยันการลบ Invoice",
      description:
        "คุณแน่ใจหรือไม่ว่าต้องการลบ Invoice นี้? การดำเนินการนี้ไม่สามารถเรียกคืนได้",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive",
    });

    if (!confirmed) return;

    setLoading(true);

    try {
      // ลบ Invoice
      const { success, error } = await deleteInvoice(invoiceId);

      if (!success) throw new Error(error);

      // อัพเดทสถานะ invoiced ของ Payment เป็น false
      await updatePaymentsInvoiceStatus(selectedPaymentIds, false);

      showSuccess("ลบ Invoice เรียบร้อยแล้ว");

      // รีเซ็ตค่าต่างๆ
      setInvoiceId("");
      setInvoiceName("");
      setSelectedPaymentIds([]);
      setGrandTotal(0);
      setTotalCost(0);
      setTotalSellingPrice(0);
      setTotalProfit(0);
      setIsViewingExistingInvoice(false);

      // ปิด modal แก้ไข
      setIsEditModalOpen(false);

      await loadInitialData();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      setError(`ไม่สามารถลบ Invoice ได้: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    try {
      const table = document.getElementById("invoiceTable");
      if (!table) {
        setError("ไม่พบตาราง Invoice");
        return;
      }
      let csv = [];
      for (let i = 0; i < table.rows.length; i++) {
        let row = [];
        for (let j = 0; j < table.rows[i].cells.length; j++) {
          let text = table.rows[i].cells[j].innerText.replace(
            /(\r\n|\n|\r)/gm,
            " "
          );
          text = text.replace(/"/g, '""');
          row.push(`"${text}"`);
        }
        csv.push(row.join(","));
      }
      const csvString = csv.join("\n");
      const BOM = "\uFEFF";
      const finalCSV = BOM + csvString;
      const blob = new Blob([finalCSV], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "invoice_export.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("นำออกข้อมูลเป็น CSV สำเร็จ");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      setError("เกิดข้อผิดพลาดในการนำออกข้อมูลเป็น CSV");
    }
  };

  const handleToggleCostProfit = () => {
    setShowCostProfit(!showCostProfit);
    buildInvoiceTable();
  };

  const handleEditRef = async (paymentId, currentRef) => {
    const newRefValue = prompt("กรุณากรอกเลข REF ใหม่:", currentRef || "");
    if (newRefValue === null) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from("payments")
        .update({ ref: newRefValue })
        .eq("id", paymentId);
      if (error) throw error;
      showSuccess("อัปเดต REF เรียบร้อย");
      buildInvoiceTable();
    } catch (error) {
      console.error("Error updating REF:", error);
      setError("ไม่สามารถอัปเดต REF ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleEditFee = async (paymentId, bookingIndex, currentFee) => {
    const newFeeValue = prompt("กรุณากรอก Fee ใหม่:", currentFee || "0");
    if (newFeeValue === null) return;
    try {
      setLoading(true);
      const payment = allPaymentsData.find((p) => p.id === paymentId);
      if (!payment || !payment.bookings || !payment.bookings[bookingIndex]) {
        throw new Error("ไม่พบข้อมูล Booking");
      }
      const bookingsCopy = JSON.parse(JSON.stringify(payment.bookings));
      bookingsCopy[bookingIndex].fee = parseFloat(newFeeValue) || 0;
      const { error } = await supabase
        .from("payments")
        .update({ bookings: bookingsCopy })
        .eq("id", paymentId);
      if (error) throw error;
      showSuccess("อัปเดต Fee เรียบร้อย");
      await loadInitialData();
      buildInvoiceTable();
    } catch (error) {
      console.error("Error updating fee:", error);
      setError("ไม่สามารถอัปเดต Fee ได้");
    } finally {
      setLoading(false);
    }
  };

  const handleEditInvoiceDate = () => {
    const newDate = prompt("กรุณากรอกวันที่ Invoice:", invoiceDate);
    if (!newDate) return;
    setInvoiceDate(newDate);
    if (invoiceId) {
      updateInvoice(invoiceId, { invoice_date: newDate })
        .then(({ success }) => {
          if (success) showSuccess("อัปเดตวันที่ Invoice เรียบร้อย");
        })
        .catch((error) => {
          console.error("Error updating invoice date:", error);
          setError("ไม่สามารถอัปเดตวันที่ Invoice ได้");
        });
    }
  };

  const handlePrint = () => {
    // สร้าง document ใหม่สำหรับการพิมพ์
    const printWindow = window.open("", "_blank");

    // สร้าง HTML สำหรับส่วนที่จะพิมพ์
    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice Print</title>
      <style>
        /* รีเซ็ตสไตล์ */
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        /* สไตล์หลัก */
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          padding: 10mm;
        }
        
        /* สไตล์ตาราง - เพิ่ม table-layout: fixed */
        table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 3px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        
        /* สไตล์ส่วนหัวและท้าย */
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        
        .invoice-header-right {
          text-align: right;
        }
        
        .invoice-footer {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        
        /* สไตล์แถวสรุป */
        .total-row {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        
        .grand-total-row {
          background-color: #f0fff4;
          font-weight: bold;
        }
        
        /* การกำหนดขนาดคอลัมน์ใหม่ - ใช้เปอร์เซ็นต์ */
        table th:nth-child(1), table td:nth-child(1) { width: 4%; }   /* Item */
        table th:nth-child(2), table td:nth-child(2) { width: 15%; }  /* NAME */
        table th:nth-child(3), table td:nth-child(3) { width: 6%; }   /* REF */
        table th:nth-child(4), table td:nth-child(4) { width: 12%; }  /* Hotel */
        table th:nth-child(5), table td:nth-child(5) { width: 8%; }  /* Date */
        table th:nth-child(6), table td:nth-child(6) { width: 33%; }  /* TOUR INCLUDE - ขยายให้ใหญ่ที่สุด */
        table th:nth-child(7), table td:nth-child(7) { width: 6%; }   /* PRICE - เท่ากัน */
        table th:nth-child(8), table td:nth-child(8) { width: 5%; }   /* Fee - เท่ากัน */
        table th:nth-child(9), table td:nth-child(9) { width: 4%; }   /* Unit - เท่ากัน */
        table th:nth-child(10), table td:nth-child(10) { width: 7%; } /* TOTAL - เท่ากัน */
        
        /* สำหรับโหมดที่มี Cost/Profit (12 คอลัมน์) */
        table.with-cost-profit th:nth-child(1), table.with-cost-profit td:nth-child(1) { width: 4%; }   /* Item */
        table.with-cost-profit th:nth-child(2), table.with-cost-profit td:nth-child(2) { width: 18%; }  /* NAME */
        table.with-cost-profit th:nth-child(3), table.with-cost-profit td:nth-child(3) { width: 5%; }   /* REF */
        table.with-cost-profit th:nth-child(4), table.with-cost-profit td:nth-child(4) { width: 10%; }  /* Hotel */
        table.with-cost-profit th:nth-child(5), table.with-cost-profit td:nth-child(5) { width: 8%; }   /* Date */
        table.with-cost-profit th:nth-child(6), table.with-cost-profit td:nth-child(6) { width: 22%; }  /* TOUR INCLUDE */
        table.with-cost-profit th:nth-child(7), table.with-cost-profit td:nth-child(7) { width: 6%; }   /* Cost */
        table.with-cost-profit th:nth-child(8), table.with-cost-profit td:nth-child(8) { width: 6%; }   /* PRICE */
        table.with-cost-profit th:nth-child(9), table.with-cost-profit td:nth-child(9) { width: 6%; }   /* Profit */
        table.with-cost-profit th:nth-child(10), table.with-cost-profit td:nth-child(10) { width: 6%; } /* Fee */
        table.with-cost-profit th:nth-child(11), table.with-cost-profit td:nth-child(11) { width: 3%; } /* Unit */
        table.with-cost-profit th:nth-child(12), table.with-cost-profit td:nth-child(12) { width: 6%; } /* TOTAL */
        
        @page {
          size: landscape;
          margin: 10mm;
        }
      </style>
    </head>
    <body onload="window.print(); window.setTimeout(function(){ window.close(); }, 500);">
  `);

    // เพิ่มส่วนหัว Invoice
    printWindow.document.write(`
    <style>
      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .invoice-header > div:first-child {
        width: 60%;
      }
      .invoice-header > div:last-child {
        width: 40%;
        text-align: right;
      }
      #bannerImage {
        width: 100%;
        height: auto;
      }
    </style>
    <div class="invoice-header">
      <div>
        <img id="bannerImage" src="../../assets/banner-06.png" alt="SevenSmile Tour & Ticket" />
      </div>
      <div class="invoice-header-right">
        <h2 style="font-size: 18px; margin-bottom: 5px;">INVOICE</h2>
        <p>ATTN: ACCOUNTING DEPT.</p>
        <p>DATE: ${invoiceDate}</p>
      </div>
    </div>
  `);

    // เริ่มตาราง - เพิ่ม class ตามโหมด
    const tableClass = showCostProfit ? "with-cost-profit" : "";
    printWindow.document.write(`
    <table class="${tableClass}">
      <thead>
        <tr>
          <th>Item</th>
          <th>NAME</th>
          <th>REF.</th>
          <th>Hotel</th>
          <th>Date in PHUKET</th>
          <th>TOUR INCLUDE</th>
          ${
            showCostProfit
              ? `<th>Cost</th>
             <th>PRICE</th>
             <th>Profit</th>`
              : `<th>PRICE</th>`
          }
          <th>Fee</th>
          <th>Unit</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
  `);

    // สร้างแถวของตาราง
    if (selectedPaymentIds.length > 0) {
      let itemCount = 0;

      selectedPaymentIds.forEach((paymentId) => {
        const payment = allPaymentsData.find((p) => p.id === paymentId);
        if (!payment || !payment.bookings || payment.bookings.length === 0)
          return;

        itemCount++;
        const nameText = `${payment.first_name || ""} ${
          payment.last_name || ""
        } / ${payment.pax || ""} (${payment.agent_name || ""})`.trim();
        const refValue = payment.ref || "-";

        let hotelText = "-";
        for (const booking of payment.bookings) {
          if (booking.tour_hotel) {
            hotelText = booking.tour_hotel;
            break;
          } else if (booking.hotel) {
            hotelText = booking.hotel;
            break;
          }
        }

        const rowSpanCount = payment.bookings.length;
        let paymentRowTotal = 0;
        let paymentCostTotal = 0;
        let paymentProfitTotal = 0;

        const sortedBookings = [...payment.bookings].sort((a, b) => {
          const dateA = a.date || a.tour_date || a.transfer_date || "";
          const dateB = b.date || b.tour_date || b.transfer_date || "";
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateA) - new Date(dateB);
        });

        sortedBookings.forEach((booking, index) => {
          const unitVal = booking.quantity || 0;
          const priceVal = booking.sellingPrice || 0;
          const costVal = booking.cost || 0;
          const rowTotal = priceVal * unitVal;
          const rowCostTotal = costVal * unitVal;
          const profitVal = priceVal - costVal;
          const feeVal = booking.fee || 0;

          paymentRowTotal += rowTotal;
          paymentCostTotal += costVal * unitVal;
          paymentProfitTotal += profitVal * unitVal;

          const detailText =
            booking.detail ||
            booking.tour_detail ||
            booking.transfer_detail ||
            "-";
          const bookingDate =
            booking.date || booking.tour_date || booking.transfer_date || "-";
          const formattedDate =
            bookingDate !== "-"
              ? format(new Date(bookingDate), "dd MMM yy").toUpperCase()
              : "-";

          printWindow.document.write("<tr>");

          if (index === 0) {
            printWindow.document.write(`
             <td rowspan="${rowSpanCount}" style="text-align: center;">${itemCount}</td>
             <td rowspan="${rowSpanCount}">${nameText}</td>
             <td rowspan="${rowSpanCount}" style="text-align: center;">${refValue}</td>
             <td rowspan="${rowSpanCount}">${hotelText}</td>
           `);
          }

          printWindow.document.write(`
           <td style="text-align: center;">${formattedDate}</td>
           <td>${detailText}</td>
         `);

          if (showCostProfit) {
            printWindow.document.write(`
             <td style="text-align: right;">${formatNumberWithCommas(
               costVal
             )}</td>
             <td style="text-align: right;">${formatNumberWithCommas(
               priceVal
             )}</td>
             <td style="text-align: right;">${formatNumberWithCommas(
               profitVal
             )}</td>
           `);
          } else {
            printWindow.document.write(`
             <td style="text-align: right;">${formatNumberWithCommas(
               priceVal
             )}</td>
           `);
          }

          printWindow.document.write(`
           <td style="text-align: center;">${formatNumberWithCommas(
             feeVal
           )}</td>
           <td style="text-align: center;">${unitVal}</td>
           <td style="text-align: right;">${formatNumberWithCommas(
             rowTotal
           )}</td>
         `);

          printWindow.document.write("</tr>");
        });

        // Add subtotal row for cost/profit if showing those columns
        if (showCostProfit) {
          printWindow.document.write(`
           <tr class="total-row">
             <td colspan="6" style="text-align: right; font-weight: bold;">Sub-Total (Cost/Price/Profit)</td>
             <td style="text-align: right; font-weight: bold;">${formatNumberWithCommas(
               paymentCostTotal
             )}</td>
             <td style="text-align: right; font-weight: bold;">${formatNumberWithCommas(
               paymentRowTotal
             )}</td>
             <td style="text-align: right; font-weight: bold;">${formatNumberWithCommas(
               paymentProfitTotal
             )}</td>
             <td colspan="3"></td>
           </tr>
         `);
        }

        // Add total row for this payment
        printWindow.document.write(`
         <tr class="total-row">
           <td colspan="${
             showCostProfit ? 10 : 8
           }" style="text-align: right; font-weight: bold;">Total Amount</td>
           <td colspan="2" style="text-align: right; font-weight: bold;">${formatNumberWithCommas(
             paymentRowTotal
           )}</td>
         </tr>
       `);
      });

      // Add grand total row
      if (grandTotal !== undefined && grandTotal !== null) {
        printWindow.document.write(`
         <tr class="grand-total-row">
           <td colspan="${
             showCostProfit ? 10 : 8
           }" style="text-align: right; font-weight: bold;">GRAND TOTAL</td>
           <td colspan="2" style="text-align: right; font-weight: bold;">${formatNumberWithCommas(
             grandTotal
           )}</td>
         </tr>
       `);
      }
    }

    // ปิดตาราง
    printWindow.document.write("</tbody></table>");

    // เพิ่มส่วนท้าย Invoice
    printWindow.document.write(`
    <div class="invoice-footer">
      <div>
        <p style="font-weight: bold; margin-bottom: 5px;">PAYMENT TO SEVENSMILE</p>
        <p>KBank 255-2431-068</p>
        <p>ACCT : Janthawarath Loosathidkool</p>
      </div>
      <div style="text-align: right;">
        <p style="font-weight: bold; font-size: 14px;">GRAND TOTAL: ${formatNumberWithCommas(
          grandTotal || 0
        )} THB</p>
      </div>
    </div>
  `);

    // ปิด document
    printWindow.document.write("</body></html>");
    printWindow.document.close();
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("payments").select("*");
      if (error) throw error;
      setAllPaymentsData(data || []);
      organizePaymentsByMonth(data);
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  // แสดง Payment Select Modal
  const PaymentSelectModal = () => {
    if (!isSelectModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-bold">
              เลือก Payments ที่ต้องการสร้าง Invoice
            </h5>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsSelectModalOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {Object.keys(paymentsByMonth).length === 0 ? (
              <div className="text-yellow-600 bg-yellow-100 p-3 rounded">
                ไม่พบข้อมูล Payment
              </div>
            ) : (
              <div className="space-y-3">
                {Object.keys(paymentsByMonth)
                  .sort()
                  .map((month) => (
                    <div key={month}>
                      <h5 className="pb-2 border-b text-blue-600 font-medium">
                        {month}
                      </h5>
                      {paymentsByMonth[month].map((payment) => (
                        <label
                          key={payment.id}
                          className="flex items-center mb-2 pl-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mr-2 rounded"
                            value={payment.id}
                            checked={selectedPaymentIds.includes(payment.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPaymentIds([
                                  ...selectedPaymentIds,
                                  payment.id,
                                ]);
                              } else {
                                setSelectedPaymentIds(
                                  selectedPaymentIds.filter(
                                    (id) => id !== payment.id
                                  )
                                );
                              }
                            }}
                          />
                          <span>
                            {payment.displayName}
                            {payment.dateRangeStr}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => setIsSelectModalOpen(false)}
            >
              ปิด
            </button>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleConfirmSelection}
            >
              ยืนยันการเลือก
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewInvoicesModal = () => {
    const [searchInvoiceQuery, setSearchInvoiceQuery] = useState("");
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // แสดง 3 รายการล่าสุดเมื่อไม่มีการค้นหา
    const recentInvoices = invoicesList
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);

    // จัดการการค้นหา
    useEffect(() => {
      if (searchInvoiceQuery.trim()) {
        const filtered = invoicesList.filter(
          (invoice) =>
            (invoice.invoice_name || "")
              .toLowerCase()
              .includes(searchInvoiceQuery.toLowerCase()) ||
            (invoice.invoice_date || "").includes(searchInvoiceQuery)
        );
        setFilteredInvoices(filtered);
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
        setFilteredInvoices([]);
      }
    }, [searchInvoiceQuery, invoicesList]);

    const displayInvoices = showSearchResults
      ? filteredInvoices
      : recentInvoices;
    const displayTitle = showSearchResults
      ? `ผลการค้นหา (${filteredInvoices.length} รายการ)`
      : "Invoice ล่าสุด (3 รายการ)";

    if (!isViewModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-bold">เลือก Invoice</h5>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsViewModalOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded"
                placeholder="ค้นหาตามชื่อหรือวันที่..."
                value={searchInvoiceQuery}
                onChange={(e) => setSearchInvoiceQuery(e.target.value)}
              />
            </div>
            {searchInvoiceQuery && (
              <button
                onClick={() => setSearchInvoiceQuery("")}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                ล้างการค้นหา
              </button>
            )}
          </div>

          {/* Invoice List */}
          <div className="max-h-60 overflow-y-auto mb-4">
            <h6 className="text-sm font-medium text-gray-600 mb-2">
              {displayTitle}
            </h6>

            {displayInvoices.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                {showSearchResults
                  ? "ไม่พบ Invoice ที่ตรงกับคำค้นหา"
                  : "ไม่พบข้อมูล Invoice"}
              </div>
            ) : (
              <div className="space-y-2">
                {displayInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => handleViewSelectedInvoice(invoice.id)}
                    className="p-3 border rounded cursor-pointer hover:bg-blue-50 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">
                        {invoice.invoice_name || "ไม่มีชื่อ"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.invoice_date || "ไม่มีวันที่"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ยอดรวม:{" "}
                        {parseFloat(invoice.total_amount || 0).toLocaleString()}{" "}
                        บาท
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <Eye size={18} className="text-blue-500" />

                      {/* แสดงสถานะ */}
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {invoice.status ? "เรียบร้อย" : "ไม่เรียบร้อย"}
                      </span>

                      {/* แสดงจำนวนไฟล์แนบ */}
                      {invoice.attachments &&
                        invoice.attachments.length > 0 && (
                          <span className="text-xs text-blue-600">
                            {invoice.attachments.length} ไฟล์
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => setIsViewModalOpen(false)}
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Edit Invoice Modal
  const EditInvoiceModal = () => {
    if (!isEditModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
        <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full p-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-bold">แก้ไข Invoice</h5>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setIsEditModalOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ส่วนซ้าย - Payment ที่เลือกแล้ว */}
            <div className="border rounded-lg p-4">
              <h6 className="font-semibold mb-3 border-b pb-2">
                Payment ที่เลือกไว้
              </h6>

              <div className="max-h-[50vh] overflow-y-auto">
                {editablePaymentIds.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    ไม่มี Payment ที่เลือกไว้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editablePaymentIds.map((paymentId, index) => {
                      const payment = allPaymentsData.find(
                        (p) => p.id === paymentId
                      );
                      if (!payment) return null;

                      // คำนวณวันที่เริ่มต้นและสิ้นสุด
                      let startDate = null;
                      let endDate = null;

                      if (payment.bookings && payment.bookings.length > 0) {
                        payment.bookings.forEach((booking) => {
                          const dateStr =
                            booking.date ||
                            booking.tour_date ||
                            booking.transfer_date;
                          if (dateStr) {
                            const currentDate = new Date(dateStr);
                            if (!startDate || currentDate < startDate)
                              startDate = currentDate;
                            if (!endDate || currentDate > endDate)
                              endDate = currentDate;
                          }
                        });
                      }

                      // สร้างข้อความแสดงวันที่
                      let dateRangeText = "";
                      if (startDate && endDate) {
                        const formatDateDisplay = (date) =>
                          format(date, "dd/MM/yyyy");

                        if (startDate.getTime() === endDate.getTime()) {
                          dateRangeText = `${formatDateDisplay(startDate)}`;
                        } else {
                          dateRangeText = `${formatDateDisplay(
                            startDate
                          )} - ${formatDateDisplay(endDate)}`;
                        }
                      }

                      return (
                        <div
                          key={paymentId}
                          className="border rounded p-3 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">
                              {payment.first_name} {payment.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.agent_name || "ไม่ระบุ Agent"}
                            </div>
                            {dateRangeText && (
                              <div className="text-xs text-blue-600 mt-1">
                                {dateRangeText}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => handleMovePayment(index, "up")}
                              disabled={index === 0}
                            >
                              <ArrowUp
                                size={16}
                                className={index === 0 ? "opacity-30" : ""}
                              />
                            </button>

                            <button
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => handleMovePayment(index, "down")}
                              disabled={index === editablePaymentIds.length - 1}
                            >
                              <ArrowDown
                                size={16}
                                className={
                                  index === editablePaymentIds.length - 1
                                    ? "opacity-30"
                                    : ""
                                }
                              />
                            </button>

                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() =>
                                handleRemovePaymentFromInvoice(paymentId)
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ส่วนขวา - Payment ที่ยังไม่ถูกเลือก */}
            <div className="border rounded-lg p-4">
              <h6 className="font-semibold mb-3 border-b pb-2">
                Payment ที่ยังไม่ออก Invoice
              </h6>

              <div className="max-h-[50vh] overflow-y-auto">
                {nonInvoicedPayments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    ไม่มี Payment ที่ยังไม่ออก Invoice
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nonInvoicedPayments.map((payment) => {
                      // ถ้าอยู่ใน editablePaymentIds แล้วไม่ต้องแสดง
                      if (editablePaymentIds.includes(payment.id)) return null;

                      // คำนวณวันที่เริ่มต้นและสิ้นสุด
                      let startDate = null;
                      let endDate = null;

                      if (payment.bookings && payment.bookings.length > 0) {
                        payment.bookings.forEach((booking) => {
                          const dateStr =
                            booking.date ||
                            booking.tour_date ||
                            booking.transfer_date;
                          if (dateStr) {
                            const currentDate = new Date(dateStr);
                            if (!startDate || currentDate < startDate)
                              startDate = currentDate;
                            if (!endDate || currentDate > endDate)
                              endDate = currentDate;
                          }
                        });
                      }

                      // สร้างข้อความแสดงวันที่
                      let dateRangeText = "";
                      if (startDate && endDate) {
                        const formatDateDisplay = (date) =>
                          format(date, "dd/MM/yyyy");

                        if (startDate.getTime() === endDate.getTime()) {
                          dateRangeText = `${formatDateDisplay(startDate)}`;
                        } else {
                          dateRangeText = `${formatDateDisplay(
                            startDate
                          )} - ${formatDateDisplay(endDate)}`;
                        }
                      }

                      return (
                        <div
                          key={payment.id}
                          className="border rounded p-3 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">
                              {payment.first_name} {payment.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.agent_name || "ไม่ระบุ Agent"}
                            </div>
                            {dateRangeText && (
                              <div className="text-xs text-blue-600 mt-1">
                                {dateRangeText}
                              </div>
                            )}
                          </div>

                          <button
                            className="text-green-600 hover:text-green-800"
                            onClick={() =>
                              handleAddPaymentToInvoice(payment.id)
                            }
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
              onClick={handleDeleteInvoice}
            >
              <Trash2 size={16} className="mr-2" />
              ลบ Invoice นี้
            </button>

            <div className="flex space-x-2">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setIsEditModalOpen(false)}
              >
                ยกเลิก
              </button>

              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                onClick={handleSaveEditedInvoice}
              >
                <Save size={16} className="mr-2" />
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-6 print:hidden">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Invoice</h1>
        <p className="text-gray-600 mb-4">รายละเอียด Order / Payment ทั้งหมด</p>
      </div>

      <div className="max-w-7xl mx-auto p-4 rounded-lg shadow-md bg-white print:p-0 print:m-0 print:w-full">
        {/* Payment Selection Modal */}
        <PaymentSelectModal />

        {/* View Invoices Modal */}
        <ViewInvoicesModal />

        {/* Edit Invoice Modal */}
        <EditInvoiceModal />

        {/* Invoice Status Modal */}
        <InvoiceStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onInvoiceSelect={(invoice) => {
            // จัดการเมื่อเลือก Invoice (ถ้าต้องการ)
            console.log("Selected invoice:", invoice);
          }}
        />

        {/* Invoice Controls - ซ่อนเมื่อพิมพ์ */}
        <div className="print:hidden text-center mb-4 space-x-2">
          {isViewingExistingInvoice && (
            <div className="text-center mb-4 bg-blue-100 text-blue-700 p-2 rounded">
              กำลังดู Invoice <b>{currentInvoice?.invoice_name || invoiceId}</b>{" "}
              อยู่
            </div>
          )}

          <button
            className="inline-flex items-center px-3 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 mr-2"
            onClick={handleOpenSelectModal}
          >
            <CheckSquare size={16} className="mr-1" />
            เลือก Payments
          </button>

          <button
            className="inline-flex items-center px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600 mr-2"
            onClick={handleSaveInvoice}
            disabled={isViewingExistingInvoice}
          >
            <Save size={16} className="mr-1" />
            บันทึก Invoice
          </button>

          <button
            className="inline-flex items-center px-3 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 mr-2"
            onClick={handleEditInvoice}
            disabled={!isViewingExistingInvoice}
          >
            <Edit size={16} className="mr-1" />
            แก้ไข Invoice
          </button>

          <button
            className="inline-flex items-center px-3 py-2 rounded bg-indigo-500 text-white hover:bg-indigo-600 mr-2"
            onClick={() => setIsStatusModalOpen(true)}
          >
            <CheckCircle size={16} className="mr-1" />
            เช็คสถานะ Invoice
          </button>

          <button
            className="inline-flex items-center px-3 py-2 rounded bg-blue-400 text-white hover:bg-blue-500 mr-2"
            onClick={handleViewInvoices}
          >
            <Eye size={16} className="mr-1" />
            ดูรายการ Invoice
          </button>

          <button
            className="inline-flex items-center px-3 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
            onClick={handlePrint}
          >
            <Printer size={16} className="mr-1" />
            พิมพ์
          </button>

          <div className="text-center mb-4 mt-4">
            <label className="inline-flex items-center space-x-2">
              <input
                className="rounded"
                type="checkbox"
                checked={showCostProfit}
                onChange={handleToggleCostProfit}
              />
              <span>แสดงต้นทุน (Cost) และกำไร (Profit)</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-3 relative rounded print:hidden">
            <strong className="font-bold mr-1">ข้อผิดพลาด:</strong> {error}
            <button
              className="absolute top-2 right-2 text-red-500 hover:text-red-600"
              onClick={() => setError(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div ref={printRef}>
          {/* Invoice Content - แสดงเสมอ */}
          <HeaderInvoice
            invoiceDate={invoiceDate}
            handleEditInvoiceDate={handleEditInvoiceDate}
          />

          <InvoiceTable
            selectedPaymentIds={selectedPaymentIds}
            allPaymentsData={allPaymentsData}
            showCostProfit={showCostProfit}
            handleEditRef={handleEditRef}
            handleEditFee={handleEditFee}
            grandTotal={grandTotal}
            loading={loading}
            formatNumberWithCommas={formatNumberWithCommas}
          />

          <InvoiceFooter
            grandTotal={grandTotal}
            formatNumberWithCommas={formatNumberWithCommas}
          />
        </div>

        {/* Summary Section - ซ่อนเมื่อพิมพ์ */}
        <SummarySection
          showCostProfit={showCostProfit}
          selectedPaymentIds={selectedPaymentIds}
          totalCost={totalCost}
          totalSellingPrice={totalSellingPrice}
          totalProfit={totalProfit}
          formatNumberWithCommas={formatNumberWithCommas}
        />
      </div>
    </div>
  );
};

export default Invoice;
