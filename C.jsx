{
  /* ปุ่มลัดด้านบน */
}
<div className="flex justify-end mb-4 gap-2">
  <a
    href="/booking-form"
    className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
  >
    <Plus size={18} className="mr-2" />
    สร้างการจองใหม่
  </a>

  <button
    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
    onClick={handleExport}
  >
    <Printer size={18} className="mr-2" />
    พิมพ์ตารางจอง
  </button>
</div>;

{
  /* กล่องแสดงข้อมูลสรุป */
}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
    <div className="rounded-full bg-blue-100 p-3 mr-3">
      <Users size={20} className="text-blue-600" />
    </div>
    <div>
      <p className="text-sm text-gray-500">จำนวนการจองวันนี้</p>
      <p className="text-xl font-bold">
        {tourBookings.length + transferBookings.length}
      </p>
    </div>
  </div>

  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
    <div className="rounded-full bg-green-100 p-3 mr-3">
      <MapPin size={20} className="text-green-600" />
    </div>
    <div>
      <p className="text-sm text-gray-500">จำนวนทัวร์</p>
      <p className="text-xl font-bold">{tourBookings.length}</p>
    </div>
  </div>

  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
    <div className="rounded-full bg-purple-100 p-3 mr-3">
      <Car size={20} className="text-purple-600" />
    </div>
    <div>
      <p className="text-sm text-gray-500">จำนวนรถรับส่ง</p>
      <p className="text-xl font-bold">{transferBookings.length}</p>
    </div>
  </div>

  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
    <div className="rounded-full bg-yellow-100 p-3 mr-3">
      <UserCheck size={20} className="text-yellow-600" />
    </div>
    <div>
      <p className="text-sm text-gray-500">จำนวนคนทั้งหมด</p>
      <p className="text-xl font-bold">{totalPax}</p>
    </div>
  </div>
</div>;
