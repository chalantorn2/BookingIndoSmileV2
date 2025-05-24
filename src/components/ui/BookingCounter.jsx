import React from "react";

const BookingCounter = ({ tourCount, transferCount }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="bg-green-100 p-4 rounded-lg text-center border border-green-300">
        <h3 className="font-bold text-green-800 mb-1">Tour Bookings</h3>
        <span className="inline-block bg-green-600 text-white text-2xl rounded-full w-8 h-8  items-center justify-center">
          {tourCount}
        </span>
      </div>

      <div className="bg-blue-100 p-4 rounded-lg text-center border border-blue-300">
        <h3 className="font-bold text-blue-800 mb-1">Transfer Bookings</h3>
        <span className="inline-block bg-blue-600 text-white text-2xl rounded-full w-8 h-8 items-center justify-center">
          {transferCount}
        </span>
      </div>
    </div>
  );
};

export default BookingCounter;
