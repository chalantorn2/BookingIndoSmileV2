// src/components/invoice/InvoiceTable.jsx
import React from "react";
import { format } from "date-fns";

const InvoiceTable = ({
  selectedPaymentIds,
  allPaymentsData,
  showCostProfit,
  handleEditRef,
  handleEditFee,
  grandTotal,
  loading,
  formatNumberWithCommas,
}) => {
  // Debug data on render
  React.useEffect(() => {
    if (selectedPaymentIds?.length > 0) {
      console.log(`Rendering table with ${selectedPaymentIds.length} payments`);
    }
  }, [selectedPaymentIds]);

  const renderInvoiceTable = () => {
    if (selectedPaymentIds.length === 0) {
      return (
        <tr>
          <td
            colSpan={showCostProfit ? 12 : 10}
            className="text-center text-red-500 py-4"
          >
            ไม่มีรายการที่เลือก
          </td>
        </tr>
      );
    }

    const tableRows = [];
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

        const tr = (
          <tr
            key={`${paymentId}-${index}`}
            className="border-b last:border-b-0"
          >
            {index === 0 && (
              <>
                <td
                  rowSpan={rowSpanCount}
                  className="px-2 py-2 border-r text-center"
                >
                  {itemCount}
                </td>
                <td
                  rowSpan={rowSpanCount}
                  className="px-2 py-2 border-r nameCell"
                >
                  {nameText}
                </td>
                <td
                  rowSpan={rowSpanCount}
                  className="px-2 py-2 border-r cursor-pointer text-center"
                  onClick={() => handleEditRef(paymentId, refValue)}
                >
                  {refValue}
                </td>
                <td
                  rowSpan={rowSpanCount}
                  className="px-2 py-2 border-r hotelCell"
                >
                  {hotelText}
                </td>
              </>
            )}
            <td className="px-2 py-2 border-r text-center">{formattedDate}</td>
            <td className="px-2 py-2 border-r text-left tour-include-cell">
              {detailText}
            </td>
            {showCostProfit ? (
              <>
                <td className="px-2 py-2 border-r text-center">
                  {formatNumberWithCommas(costVal)}
                </td>
                <td className="px-2 py-2 border-r text-center">
                  {formatNumberWithCommas(priceVal)}
                </td>
                <td className="px-2 py-2 border-r text-center">
                  {formatNumberWithCommas(profitVal)}
                </td>
              </>
            ) : (
              <td className="px-2 py-2 border-r text-center">
                {formatNumberWithCommas(priceVal)}
              </td>
            )}
            <td
              className="px-2 py-2 border-r text-center cursor-pointer"
              onClick={() => handleEditFee(paymentId, index, feeVal)}
            >
              {formatNumberWithCommas(feeVal)}
            </td>
            <td className="px-2 py-2 border-r text-center">{unitVal}</td>
            <td className="px-2 py-2 text-right">
              {formatNumberWithCommas(rowTotal)}
            </td>
          </tr>
        );
        tableRows.push(tr);
      });

      if (showCostProfit) {
        const subtotalRow = (
          <tr
            key={`${paymentId}-subtotal`}
            className="border-b bg-gray-50 total-row"
          >
            <td
              colSpan={6}
              className="px-2 py-2 text-right font-bold text-gray-600"
            >
              Sub-Total (Cost/Price/Profit)
            </td>
            <td className="px-2 py-2 font-bold text-blue-500 text-right">
              {formatNumberWithCommas(paymentCostTotal)}
            </td>
            <td className="px-2 py-2 font-bold text-blue-700 text-right">
              {formatNumberWithCommas(paymentRowTotal)}
            </td>
            <td className="px-2 py-2 font-bold text-green-600 text-right">
              {formatNumberWithCommas(paymentProfitTotal)}
            </td>
            <td colSpan={3}></td>
          </tr>
        );
        tableRows.push(subtotalRow);
      }

      const totalRow = (
        <tr
          key={`${paymentId}-total`}
          className="border-b bg-gray-100 total-row"
        >
          <td
            colSpan={showCostProfit ? 10 : 8}
            className="px-2 py-2 text-right font-bold"
          >
            Total Amount
          </td>
          <td colSpan={2} className="px-2 py-2 font-bold text-right">
            {formatNumberWithCommas(paymentRowTotal)}
          </td>
        </tr>
      );
      tableRows.push(totalRow);
    });

    if (grandTotal !== undefined && grandTotal !== null) {
      const grandRow = (
        <tr key="grand-total" className="bg-green-50 grand-total-row">
          <td
            colSpan={showCostProfit ? 10 : 8}
            className="px-2 py-2 text-right font-bold text-green-700"
          >
            GRAND TOTAL
          </td>
          <td
            colSpan={2}
            className="px-2 py-2 font-bold text-green-700 text-right"
          >
            {formatNumberWithCommas(grandTotal)}
          </td>
        </tr>
      );
      tableRows.push(grandRow);
    }

    return tableRows;
  };

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table
        className="min-w-full border border-gray-300 text-center align-middle table-fixed"
        id="invoiceTable"
      >
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-2 border-b border-r">Item</th>
            <th className="py-2 px-2 border-b border-r">NAME</th>
            <th className="py-2 px-2 border-b border-r">REF.</th>
            <th className="py-2 px-2 border-b border-r">Hotel</th>
            <th className="py-2 px-2 border-b border-r">Date in PHUKET</th>
            <th className="py-2 px-2 border-b border-r">TOUR INCLUDE</th>
            {showCostProfit ? (
              <>
                <th className="py-2 px-2 border-b border-r">Cost</th>
                <th className="py-2 px-2 border-b border-r">PRICE</th>
                <th className="py-2 px-2 border-b border-r">Profit</th>
              </>
            ) : (
              <th className="py-2 px-2 border-b border-r">PRICE</th>
            )}
            <th className="py-2 px-2 border-b border-r">Fee</th>
            <th className="py-2 px-2 border-b border-r">Unit</th>
            <th className="py-2 px-2 border-b">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={showCostProfit ? 12 : 10}
                className="py-4 text-center"
              >
                <div className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-700">กำลังโหลดข้อมูล...</p>
              </td>
            </tr>
          ) : (
            renderInvoiceTable()
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
