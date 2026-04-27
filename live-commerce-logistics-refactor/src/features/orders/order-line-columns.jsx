export function buildOrderLineColumns({
  selectedProducts,
  setSelectedProducts,
  productOptions,
  setOptions,
  giftOptions,
  saving,
  isLocked,
  mapSelectionToPatch,
  updateLine,
}) {
  return [
    {
      key: "select",
      label: "",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedProducts.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedProducts([...selectedProducts, row.id]);
            } else {
              setSelectedProducts(selectedProducts.filter((id) => id !== row.id));
            }
          }}
        />
      ),
    },
    {
      key: "itemType",
      label: "Type",
      type: "select",
      options: [
        { value: "PRODUCT", label: "Product" },
        { value: "SET", label: "Set" },
        { value: "GIFT", label: "Gift" },
      ],
    },
    {
      key: "itemCode",
      label: "Select Catalog Item",
      render: (row) => {
        const opts = row.itemType === "PRODUCT" ? productOptions : row.itemType === "SET" ? setOptions : giftOptions;

        return (
          <select
            className="ordersEditableSelect"
            size={1}
            value={row.sku || row.itemCode || ""}
            disabled={saving || isLocked}
            onChange={(e) => {
              const code = e.target.value;
              const patch = mapSelectionToPatch(row.itemType, code);
              updateLine(row.id, patch);
            }}
          >
            <option value="">Select…</option>
            {opts.map((op) => (
              <option key={`${op.type}_${op.value}`} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "itemName",
      label: "Official Name",
      render: (row) => <span>{row.officialName || row.itemName || ""}</span>,
    },
    {
      key: "sku",
      label: "SKU / Code",
      render: (row) => <span>{row.sku || row.itemCode || ""}</span>,
    },
    { key: "qty", label: "Qty", type: "number" },
    {
      key: "salePrice",
      label: "Sale Price",
      render: (row) => <span>{row.retailPrice || row.salePrice}</span>,
    },
  ];
}
