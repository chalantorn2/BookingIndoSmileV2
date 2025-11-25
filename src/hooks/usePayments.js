import { useState, useEffect } from "react";
import supabase from "../config/supabaseClient";
import { fetchPaymentByOrderId, savePayment } from "../services/paymentService";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";
import { useNotification } from "./useNotification";

/**
 * Custom hook for handling payment operations
 */
const usePayments = () => {
  const showAlert = useAlertDialogContext();
  const { showInfo } = useNotification();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tourBookings, setTourBookings] = useState([]);
  const [transferBookings, setTransferBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [paymentTotals, setPaymentTotals] = useState({
    totalCost: 0,
    totalSellingPrice: 0,
    totalProfit: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load order's bookings
  const loadOrderBookings = async (orderId) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch tour bookings
      const { data: tourData, error: tourError } = await supabase
        .from("tour_bookings")
        .select("*")
        .eq("order_id", orderId);

      if (tourError) throw tourError;

      // Fetch transfer bookings
      const { data: transferData, error: transferError } = await supabase
        .from("transfer_bookings")
        .select("*")
        .eq("order_id", orderId);

      if (transferError) throw transferError;

      // Check for existing payment data
      const { data: paymentData } = await fetchPaymentByOrderId(orderId);

      setTourBookings(tourData || []);
      setTransferBookings(transferData || []);

      // If payment exists, load selected bookings
      if (paymentData && paymentData.bookings) {
        // Convert bookings from object to array if needed
        const bookingsArray = Array.isArray(paymentData.bookings)
          ? paymentData.bookings
          : Object.values(paymentData.bookings);

        setSelectedBookings(bookingsArray);

        // Set payment totals
        setPaymentTotals({
          totalCost: paymentData.total_cost || 0,
          totalSellingPrice: paymentData.total_selling_price || 0,
          totalProfit: paymentData.total_profit || 0,
        });
      } else {
        setSelectedBookings([]);
        setPaymentTotals({
          totalCost: 0,
          totalSellingPrice: 0,
          totalProfit: 0,
        });
      }

      return {
        tourBookings: tourData || [],
        transferBookings: transferData || [],
      };
    } catch (error) {
      console.error("Error loading order bookings:", error);
      setError("Unable to load booking data");
      return { tourBookings: [], transferBookings: [] };
    } finally {
      setLoading(false);
    }
  };

  // Add booking to payment calculation

  const addBookingToPayment = (booking, type) => {
    const uniqueId = `${booking.id}-${Date.now()}`;
    // Check if booking is already added
    const existingIndex = selectedBookings.findIndex(
      (b) => b.id === booking.id && b.type === type
    );

    if (existingIndex !== -1) {
      // Update existing booking count
      const updatedBookings = [...selectedBookings];
      updatedBookings[existingIndex].chosenCount =
        (updatedBookings[existingIndex].chosenCount || 0) + 1;
      setSelectedBookings(updatedBookings);
    } else {
      // Calculate total pax count
      const adtCount = parseInt(booking.pax_adt || 0);
      const chdCount = parseInt(booking.pax_chd || 0);
      const infCount = parseInt(booking.pax_inf || 0);
      const totalPax = adtCount + chdCount + infCount;

      // Create pax format as "ADT+CHD+INF"
      let paxFormat = [];
      if (adtCount > 0) paxFormat.push(adtCount);
      if (chdCount > 0) paxFormat.push(chdCount);
      if (infCount > 0) paxFormat.push(infCount);
      const paxFormatString = paxFormat.join("+");

      // Prepare booking data based on type
      const bookingData = {
        id: uniqueId, // Use unique ID
        dbKey: booking.id, // Store database ID
        type: type,
        date: type === "tour" ? booking.tour_date : booking.transfer_date,
        detail: type === "tour" ? booking.tour_detail : booking.transfer_detail,
        hotel: type === "tour" ? booking.tour_hotel : "",
        sendTo: booking.send_to || "",
        pax: totalPax || 1,
        paxFormat: paxFormatString,
        cost: booking.cost_price || 0,
        quantity: totalPax || 1,
        sellingPrice: booking.selling_price || 0,
        status: booking.payment_status === "paid" ? "paid" : "notPaid",
        remark: "",
        bookingType: "",
        chosenCount: 1,
      };

      // Add to selected bookings
      setSelectedBookings([...selectedBookings, bookingData]);
    }
  };

  // Remove booking from payment calculation
  const removeBookingFromPayment = (index) => {
    const updatedBookings = [...selectedBookings];
    updatedBookings.splice(index, 1);
    setSelectedBookings(updatedBookings);
  };

  // Update booking field
  const updateBookingField = (index, field, value) => {
    const updatedBookings = [...selectedBookings];
    updatedBookings[index][field] = value;
    setSelectedBookings(updatedBookings);
  };

  // Calculate payment totals
  const calculateTotals = (bookings = selectedBookings) => {
    let totalCost = 0;
    let totalSellingPrice = 0;

    bookings.forEach((booking) => {
      const cost = parseFloat(booking.cost) || 0;
      const quantity = parseInt(booking.quantity) || 0;
      const sellingPrice = parseFloat(booking.sellingPrice) || 0;

      totalCost += cost * quantity;
      totalSellingPrice += sellingPrice * quantity;
    });

    const totalProfit = totalSellingPrice - totalCost;

    setPaymentTotals({
      totalCost,
      totalSellingPrice,
      totalProfit,
    });

    return {
      totalCost,
      totalSellingPrice,
      totalProfit,
    };
  };

  const handlePaymentEdit = async (paymentData, existingPayment) => {
    // When editing Payment, no need to change invoiced status
    // Just save data normally
    return await savePayment(paymentData);
  };

  const savePaymentData = async (order) => {
    if (!order) {
      throw new Error("Please select an Order before saving data");
    }

    if (selectedBookings.length === 0) {
      throw new Error("Please select at least 1 booking");
    }

    setLoading(true);

    const formatPaxForSave = (order) => {
      // Format pax for saving
      if (!order) return "0";

      const adtCount = parseInt(order.pax_adt || 0);
      const chdCount = parseInt(order.pax_chd || 0);
      const infCount = parseInt(order.pax_inf || 0);

      let paxString = [];
      if (adtCount > 0) paxString.push(adtCount.toString());
      if (chdCount > 0) paxString.push(chdCount.toString());
      if (infCount > 0) paxString.push(infCount.toString());

      return paxString.length > 0 ? paxString.join("+") : "0";
    };

    try {
      const paymentID = `P_${order.reference_id || order.id}`;
      const totals = calculateTotals();

      // Prepare data for saving
      const paymentData = {
        payment_id: paymentID,
        order_id: order.id,
        first_name: order.first_name || "",
        last_name: order.last_name || "",
        agent_name: order.agent_name || "",
        pax: formatPaxForSave(order),
        bookings: selectedBookings,
        total_cost: totals.totalCost,
        total_selling_price: totals.totalSellingPrice,
        total_profit: totals.totalProfit,
      };

      // Fetch existing Payment data (if any) directly from supabase instead of using old data
      // To ensure we always have the latest data
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id, invoiced")
        .eq("order_id", order.id)
        .single();

      const result = await handlePaymentEdit(paymentData, existingPayment);

      if (!result.success) {
        throw new Error(result.error || "Error occurred while saving data");
      }

      // Update related Invoices when Payment changes
      if (existingPayment?.id) {
        await updateRelatedInvoices(existingPayment.id);
      }

      return { success: true, paymentID };
    } catch (error) {
      console.error("Error saving payment:", error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to update related Invoices when Payment changes
  const updateRelatedInvoices = async (paymentId) => {
    try {
      // Import required functions
      const { findInvoicesByPaymentId, recalculateInvoiceTotals } =
        await import("../services/invoiceService");

      // Find Invoices related to this Payment
      const { data: relatedInvoices, error } = await findInvoicesByPaymentId(
        paymentId
      );

      if (error) {
        console.error("Error finding related invoices:", error);
        return;
      }

      // Update all related Invoices
      for (const invoice of relatedInvoices) {
        const { success, error: recalcError } = await recalculateInvoiceTotals(
          invoice.id
        );

        if (!success) {
          console.error(
            `Error recalculating invoice ${invoice.id}:`,
            recalcError
          );
        }
      }
    } catch (error) {
      console.error("Error updating related invoices:", error);
    }
  };

  // Update calculations when selected bookings change
  useEffect(() => {
    calculateTotals();
  }, [selectedBookings]);

  return {
    // State
    selectedOrder,
    tourBookings,
    transferBookings,
    selectedBookings,
    paymentTotals,
    loading,
    error,

    // Actions
    setSelectedOrder,
    loadOrderBookings,
    addBookingToPayment,
    removeBookingFromPayment,
    updateBookingField,
    calculateTotals,
    savePaymentData,
    setError,
    handlePaymentEdit,
  };
};

export default usePayments;
