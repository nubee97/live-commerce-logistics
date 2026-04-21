import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

export default function ExcelOrderImport() {

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  function handleFileUpload(e) {

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {

      try {

        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (!rows.length) {
          alert("Excel file is empty.");
          return;
        }

        const orderMap = {};

        rows.forEach((r) => {

          const customer = (r["Customer Name"] || "").trim();
          const recipient = (r["Recipient Name"] || "").trim();

          const phone = (
            r["Phone"] ||
            r["Phone Number"] ||
            r["Mobile"] ||
            ""
          )
            .toString()
            .replace(/\D/g, "");

          const address = (r["Address"] || "").trim();

          // Skip empty rows
          if (!customer && !recipient && !address) return;

          /* group orders */
          const key = `${customer}|${recipient}|${address}`;

          if (!orderMap[key]) {

            orderMap[key] = {

              orderInfo: {
                sellerName: r["Seller Name"] || "",
                customerName: customer,
                recipientName: recipient,
                phone: phone,
                shippingMethod: r["Shipping Method"] || "택배",
                address: address,
                deliveryMemo:
                  r["Delivery Memo"] ||
                  r["Shipping Memo"] ||
                  ""
              },

              items: []

            };

          }

          const sku = r["SKU"] || "";
          const qty = Number(r["Qty"] || 1);
          const price = Number(r["Price"] || 0);

          if (!sku) return;

          /* merge duplicate SKUs */
          const existing = orderMap[key].items.find(
            (i) => i.itemCode === sku
          );

          if (existing) {

            existing.qty += qty;

          } else {

            orderMap[key].items.push({
              itemCode: sku,
              itemName: r["Product Name"] || "",
              qty: qty,
              salePrice: price
            });

          }

        });

        const parsedOrders = Object.values(orderMap);

        if (!parsedOrders.length) {
          alert("No valid orders found.");
          return;
        }

        navigate("/excel-review", {
          state: { orders: parsedOrders }
        });

      } catch (err) {

        console.error(err);
        alert("Failed to parse Excel file.");

      }

      // Reset file input so same file can be uploaded again
      e.target.value = null;

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