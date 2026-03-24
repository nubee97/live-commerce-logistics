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

      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) return;

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
          .replace(/\D/g, ""); // remove spaces/dashes

        const address = (r["Address"] || "").trim();

        /* group orders by all required fields */
        // const key = `${customer}|${recipient}|${phone}|${address}`;
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

        /* merge identical SKUs instead of duplicating rows */
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

      navigate("/excel-review", {
        state: { orders: parsedOrders }
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