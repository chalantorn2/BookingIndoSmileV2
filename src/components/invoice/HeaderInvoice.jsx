import React from "react";

const HeaderInvoice = ({ invoiceDate, handleEditInvoiceDate }) => {
  return (
    <div className="grid grid-cols-3 print:flex print:justify-between mb-3">
      <div className="col-span-2">
        <img
          id="bannerImage"
          src="../../assets/banner-06.png"
          alt="SevenSmile Tour & Ticket"
          style={{ maxWidth: "80%" }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = "none";
            e.target.parentNode.innerHTML =
              '<div style="font-size: 2rem; font-weight: bold;">SevenSmile<div style="font-size: 1.2rem; font-weight: normal;">Tour & Ticket</div></div>';
          }}
        />
      </div>
      <div className="invoice-header-right col-span-1 text-right">
        <h2 className="font-bold text-xl mb-1">INVOICE</h2>
        <div className="mb-1">ATTN : ACCOUNTING DEPT.</div>
        <div>
          DATE:{" "}
          <span
            id="invoiceDateSpan"
            className="font-semibold italic text-gray-700 border border-gray-300 rounded px-2 cursor-pointer print:cursor-text print:border-0"
            onClick={handleEditInvoiceDate}
          >
            {invoiceDate}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeaderInvoice;
