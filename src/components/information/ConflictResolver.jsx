import React, { useState, useEffect } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";

const ConflictResolver = ({
  conflicts,
  masterRecord,
  onResolve,
  onNext,
  onBack,
}) => {
  const [resolutions, setResolutions] = useState({});

  useEffect(() => {
    // Initialize with master record values
    const initialResolutions = {};
    Object.keys(conflicts).forEach((field) => {
      initialResolutions[field] = masterRecord[field] || "";
    });
    setResolutions(initialResolutions);
    onResolve(initialResolutions);
  }, [conflicts, masterRecord]);

  const handleResolutionChange = (field, value) => {
    const newResolutions = { ...resolutions, [field]: value };
    setResolutions(newResolutions);
    onResolve(newResolutions);
  };

  const renderConflictField = (field, conflictData) => {
    const fieldLabels = {
      description: "รายละเอียด",
      phone: "เบอร์โทร",
    };

    return (
      <div key={field} className="border rounded-md p-4 mb-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center">
          <AlertCircle className="text-yellow-500 mr-2" size={18} />
          ข้อขัดแย้ง: {fieldLabels[field] || field}
        </h4>

        <div className="space-y-3">
          {/* Master option */}
          <label className="flex items-start space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name={field}
              value={conflictData.master}
              checked={resolutions[field] === conflictData.master}
              onChange={(e) => handleResolutionChange(field, e.target.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-green-700">Master Record:</div>
              <div className="text-sm">{conflictData.master}</div>
              <div className="text-xs text-gray-500">
                จาก: {masterRecord.value}
              </div>
            </div>
          </label>

          {/* Duplicate options */}
          {conflictData.duplicates.map((duplicate, index) => (
            <label
              key={index}
              className="flex items-start space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name={field}
                value={duplicate[field]}
                checked={resolutions[field] === duplicate[field]}
                onChange={(e) => handleResolutionChange(field, e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-orange-700">
                  Duplicate Record:
                </div>
                <div className="text-sm">{duplicate[field]}</div>
                <div className="text-xs text-gray-500">
                  จาก: {duplicate.value}
                </div>
              </div>
            </label>
          ))}

          {/* Custom input option */}
          <label className="flex items-start space-x-3 p-3 border rounded-md">
            <input
              type="radio"
              name={field}
              value="custom"
              checked={
                resolutions[field] !== conflictData.master &&
                !conflictData.duplicates.some(
                  (d) => d[field] === resolutions[field]
                )
              }
              onChange={() => handleResolutionChange(field, "")}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-blue-700">กรอกเอง:</div>
              <input
                type="text"
                value={
                  resolutions[field] !== conflictData.master &&
                  !conflictData.duplicates.some(
                    (d) => d[field] === resolutions[field]
                  )
                    ? resolutions[field]
                    : ""
                }
                onChange={(e) => handleResolutionChange(field, e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`กรอก${fieldLabels[field] || field}ใหม่...`}
              />
            </div>
          </label>
        </div>
      </div>
    );
  };

  const hasConflicts = Object.keys(conflicts).length > 0;
  const allResolved = Object.keys(conflicts).every(
    (field) => resolutions[field] && resolutions[field].trim() !== ""
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Step 3: แก้ไขความขัดแย้ง</h3>

      {!hasConflicts ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-4">
          <div className="text-green-700">
            ไม่พบความขัดแย้งในข้อมูล สามารถดำเนินการต่อได้
          </div>
        </div>
      ) : (
        <>
          <p className="text-gray-600 mb-4">
            พบความขัดแย้งในข้อมูลระหว่าง Master Record และ Duplicate Records
            กรุณาเลือกข้อมูลที่ต้องการเก็บไว้
          </p>

          {Object.entries(conflicts).map(([field, conflictData]) =>
            renderConflictField(field, conflictData)
          )}
        </>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          ย้อนกลับ
        </button>
        <button
          onClick={onNext}
          disabled={hasConflicts && !allResolved}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          ถัดไป <ArrowRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );
};

export default ConflictResolver;
