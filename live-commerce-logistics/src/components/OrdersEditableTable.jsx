import React from "react";
import "./OrdersEditableTable.css";

function getCellStyle(column = {}) {
  const style = {};

  if (column.width) style.width = column.width;
  if (column.minWidth) style.minWidth = column.minWidth;
  if (column.maxWidth) style.maxWidth = column.maxWidth;
  if (column.align) style.textAlign = column.align;

  return style;
}

export default function OrdersEditableTable({
  rows = [],
  columns = [],
  onUpdate,
  onDelete,
  emptyText = "No rows yet.",
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeCols = Array.isArray(columns) ? columns : [];

  return (
    <div className="ordersEditableShell">
      <div className="ordersEditableWrap">
        <table className="ordersEditableTable">
          <thead>
            <tr>
              {safeCols.map((c) => (
                <th
                  key={c.key}
                  className="ordersEditableHeadCell"
                  style={getCellStyle(c)}
                  title={c.label}
                >
                  {c.label}
                </th>
              ))}
              <th className="ordersEditableHeadCell ordersEditableActionHead">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {safeRows.length === 0 && (
              <tr>
                <td colSpan={safeCols.length + 1} className="ordersEditableEmpty">
                  {emptyText}
                </td>
              </tr>
            )}

            {safeRows.map((r) => (
              <tr key={r.id} className="ordersEditableRow">
                {safeCols.map((c) => {
                  const value = r?.[c.key] ?? "";
                  const type = c.type || "text";
                  const titleText =
                    typeof value === "string" || typeof value === "number"
                      ? String(value)
                      : "";

                  if (c.render) {
                    return (
                      <td
                        key={c.key}
                        className="ordersEditableBodyCell"
                        style={getCellStyle(c)}
                        title={!c.disableTitle ? titleText : undefined}
                      >
                        {c.render(r)}
                      </td>
                    );
                  }

                  if (type === "select") {
                    return (
                      <td
                        key={c.key}
                        className="ordersEditableBodyCell"
                        style={getCellStyle(c)}
                      >
                        <select
                          className="ordersEditableSelect"
                          value={value}
                          onChange={(e) =>
                            onUpdate(r.id, { [c.key]: e.target.value })
                          }
                        >
                          {(c.options || []).map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={c.key}
                      className="ordersEditableBodyCell"
                      style={getCellStyle(c)}
                      title={titleText}
                    >
                      <input
                        className="ordersEditableInput"
                        type={type}
                        value={value}
                        onChange={(e) => {
                          const v =
                            type === "number"
                              ? e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                              : e.target.value;
                          onUpdate(r.id, { [c.key]: v });
                        }}
                        placeholder={c.placeholder || ""}
                      />
                    </td>
                  );
                })}

                <td className="ordersEditableBodyCell ordersEditableActionCell">
                  <button
                    className="ordersEditableDeleteBtn"
                    onClick={() => onDelete(r.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}