import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

export default function ExcelOrderImport({ onParsed }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (!rows.length) return;

      const first = rows[0];

      // Normalize Excel headers
      const orderInfo = {
        sellerName: first["Seller Name"] || "",
        customerName: first["Customer Name"] || "",
        recipientName: first["Recipient Name"] || "",
        phone:
          first["Phone"] ||
          first["Phone Number"] ||
          first["Mobile"] ||
          "",
        shippingMethod: first["Shipping Method"] || "택배",
        address: first["Address"] || "",
        deliveryMemo:
          first["Delivery Memo"] ||
          first["Shipping Memo"] ||
          ""
      };

      const items = rows.map((r) => ({
        itemCode: r["SKU"] || "",
        itemName: r["Product Name"] || "",
        qty: Number(r["Qty"] || 1),
        salePrice: Number(r["Price"] || 0)
      }));

      navigate("/excel-review", {
        state: { orderInfo, items }
      });
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="excelUpload">
      <input
        type="file"
        accept=".xlsx,.xls"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
      <button
        className="btn primary"
        onClick={() => fileInputRef.current.click()}
      >
        Import Excel File
      </button>
    </div>
  );
}