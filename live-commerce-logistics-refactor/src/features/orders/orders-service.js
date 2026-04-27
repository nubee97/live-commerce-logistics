import * as XLSX from "xlsx";
import { loadAppData, upsertOrder, replaceOrderItems, deleteOrderWithItems } from "../../lib/db.js";

export async function refreshOrdersWorkspace({ setState, currentSelectedId = "", preferredSelectedId = "" }) {
  const fresh = await loadAppData();
  setState(fresh);

  return preferredSelectedId || (fresh.orders || []).find((order) => order.id === currentSelectedId)?.id || fresh.orders?.[0]?.id || "";
}

export async function persistOrderBundle({ order, lines, setState, currentSelectedId = "", preferredSelectedId = "" }) {
  await upsertOrder(order);
  await replaceOrderItems(order.id, lines);

  return refreshOrdersWorkspace({
    setState,
    currentSelectedId,
    preferredSelectedId: preferredSelectedId || order.id,
  });
}

export async function deleteOrderBundle({ orderId, setState, currentSelectedId = "" }) {
  await deleteOrderWithItems(orderId);
  const fresh = await loadAppData();
  setState(fresh);

  if (currentSelectedId === orderId) {
    return fresh.orders?.[0]?.id || "";
  }

  return currentSelectedId;
}

export function downloadOrdersTemplateFile() {
  const template = [
    {
      "Customer Name": "John Doe",
      "Recipient Name": "Jane Doe",
      "Phone Number": "01012345678",
      "Shipping Method": "택배",
      Address: "Seoul Gangnam",
      "Shipping Memo": "Leave at door",
      SKU: "BNG-001",
      "Product Name": "Braiding Gel",
      Qty: 2,
      Price: 15000,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  XLSX.writeFile(workbook, "order_template.xlsx");
}
