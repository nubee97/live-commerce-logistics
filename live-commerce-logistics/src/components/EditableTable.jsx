// import React from "react";

// function getCellStyle(column = {}) {
//   const style = {};

//   if (column.width) style.width = column.width;
//   if (column.minWidth) style.minWidth = column.minWidth;
//   if (column.maxWidth) style.maxWidth = column.maxWidth;
//   if (column.align) style.textAlign = column.align;

//   return style;
// }

// function getCellClass(column = {}, base = "") {
//   const classes = [base];

//   if (column.wrap) classes.push("etableWrapCell");
//   else classes.push("etableClampCell");

//   if (column.type === "number") classes.push("etableNumberCell");
//   if (column.compact) classes.push("etableCompactCell");
//   if (column.className) classes.push(column.className);

//   return classes.filter(Boolean).join(" ");
// }

// export default function EditableTable({
//   rows = [],
//   columns = [],
//   onAdd,
//   onUpdate,
//   onDelete,
//   addLabel = "Add row",
//   emptyText = "No rows yet.",
// }) {
//   const safeRows = Array.isArray(rows) ? rows : [];
//   const safeCols = Array.isArray(columns) ? columns : [];

//   function handleDelete(rowId) {
//     if (typeof onDelete !== "function") return;
//     const ok = window.confirm("Delete this row?");
//     if (!ok) return;
//     onDelete(rowId);
//   }

//   return (
//     <div>
//       <div className="toolbar noPrint">
//         <button
//           className="btn"
//           onClick={() => onAdd?.()}
//           type="button"
//         >
//           {addLabel}
//         </button>
//         <div className="small">{safeRows.length} row(s)</div>
//       </div>

//       <div className="tableWrap">
//         <table className="editableTablePro">
//           <thead>
//             <tr>
//               {safeCols.map((c) => (
//                 <th
//                   key={c.key}
//                   className={getCellClass(c, "etableHeadCell")}
//                   style={getCellStyle(c)}
//                   title={c.label}
//                 >
//                   {c.label}
//                 </th>
//               ))}
//               <th
//                 className="right noPrint etableHeadCell"
//                 style={{ minWidth: 110 }}
//               >
//                 Actions
//               </th>
//             </tr>
//           </thead>

//           <tbody>
//             {safeRows.length === 0 && (
//               <tr>
//                 <td colSpan={safeCols.length + 1} className="small">
//                   {emptyText}
//                 </td>
//               </tr>
//             )}

//             {safeRows.map((r) => (
//               <tr key={r.id}>
//                 {safeCols.map((c) => {
//                   const value = r?.[c.key] ?? "";
//                   const type = c.type || "text";
//                   const cellStyle = getCellStyle(c);
//                   const cellClass = getCellClass(c, "etableBodyCell");
//                   const titleText =
//                     typeof value === "string" || typeof value === "number"
//                       ? String(value)
//                       : "";

//                   if (c.readOnly) {
//                     return (
//                       <td
//                         key={c.key}
//                         className={cellClass}
//                         style={cellStyle}
//                         title={titleText}
//                       >
//                         <div className={c.wrap ? "etableWrapText" : "etableClampText"}>
//                           {String(value)}
//                         </div>
//                       </td>
//                     );
//                   }

//                   if (c.render) {
//                     return (
//                       <td
//                         key={c.key}
//                         className={cellClass}
//                         style={cellStyle}
//                         title={!c.disableTitle ? titleText : undefined}
//                       >
//                         <div className={c.wrap ? "etableWrapText" : "etableClampText"}>
//                           {c.render(r)}
//                         </div>
//                       </td>
//                     );
//                   }

//                   return (
//                     <td
//                       key={c.key}
//                       className={cellClass}
//                       style={cellStyle}
//                       title={titleText}
//                     >
//                       {type === "select" ? (
//                         <select
//                           className={`select ${c.compact ? "etableCompactInput" : ""}`}
//                           value={value}
//                           onChange={(e) =>
//                             onUpdate?.(r.id, { [c.key]: e.target.value })
//                           }
//                         >
//                           {(c.options || []).map((op) => (
//                             <option key={op.value} value={op.value}>
//                               {op.label}
//                             </option>
//                           ))}
//                         </select>
//                       ) : (
//                         <input
//                           className={`input ${c.compact ? "etableCompactInput" : ""}`}
//                           type={type}
//                           value={value}
//                           title={titleText}
//                           onChange={(e) => {
//                             const v =
//                               type === "number"
//                                 ? e.target.value === ""
//                                   ? ""
//                                   : Number(e.target.value)
//                                 : e.target.value;

//                             onUpdate?.(r.id, { [c.key]: v });
//                           }}
//                           placeholder={c.placeholder || ""}
//                         />
//                       )}
//                     </td>
//                   );
//                 })}

//                 <td className="right noPrint" style={{ minWidth: 110 }}>
//                   <button
//                     className="btn danger"
//                     onClick={() => handleDelete(r.id)}
//                     type="button"
//                   >
//                     Delete
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
import React from "react";
import "./EditableTablePremium.css";

function getCellStyle(column = {}) {
  const style = {};

  if (column.width) style.width = column.width;
  if (column.minWidth) style.minWidth = column.minWidth;
  if (column.maxWidth) style.maxWidth = column.maxWidth;
  if (column.align) style.textAlign = column.align;

  return style;
}

function getCellClass(column = {}, base = "") {
  const classes = [base];

  if (column.wrap) classes.push("etableWrapCell");
  else classes.push("etableClampCell");

  if (column.type === "number") classes.push("etableNumberCell");
  if (column.compact) classes.push("etableCompactCell");
  if (column.className) classes.push(column.className);

  return classes.filter(Boolean).join(" ");
}

export default function EditableTable({
  rows = [],
  columns = [],
  onAdd,
  onUpdate,
  onDelete,
  addLabel = "Add row",
  emptyText = "No rows yet.",
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeCols = Array.isArray(columns) ? columns : [];

  return (
    <div className="premiumEditableTableShell">
      <div className="premiumEditableToolbar noPrint">
        <button className="premiumEditableToolbarBtn" onClick={onAdd} type="button">
          {addLabel}
        </button>
        <div className="premiumEditableCount">{safeRows.length} row(s)</div>
      </div>

      <div className="premiumEditableTableWrap">
        <table className="premiumEditableTable">
          <thead>
            <tr>
              {safeCols.map((c) => (
                <th
                  key={c.key}
                  className={getCellClass(c, "premiumEditableHeadCell")}
                  style={getCellStyle(c)}
                  title={c.label}
                >
                  {c.label}
                </th>
              ))}
              <th
                className="premiumEditableHeadCell premiumEditableActionHead right noPrint"
                style={{ minWidth: 110 }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {safeRows.length === 0 && (
              <tr>
                <td
                  colSpan={safeCols.length + 1}
                  className="premiumEditableEmpty"
                >
                  {emptyText}
                </td>
              </tr>
            )}

            {safeRows.map((r) => (
              <tr key={r.id} className="premiumEditableRow">
                {safeCols.map((c) => {
                  const value = r?.[c.key] ?? "";
                  const type = c.type || "text";
                  const cellStyle = getCellStyle(c);
                  const cellClass = getCellClass(c, "premiumEditableBodyCell");
                  const titleText =
                    typeof value === "string" || typeof value === "number"
                      ? String(value)
                      : "";

                  if (c.readOnly) {
                    return (
                      <td
                        key={c.key}
                        className={cellClass}
                        style={cellStyle}
                        title={titleText}
                      >
                        <div
                          className={
                            c.wrap
                              ? "premiumEditableWrapText"
                              : "premiumEditableClampText"
                          }
                        >
                          {String(value)}
                        </div>
                      </td>
                    );
                  }

                  if (c.render) {
                    return (
                      <td
                        key={c.key}
                        className={cellClass}
                        style={cellStyle}
                        title={!c.disableTitle ? titleText : undefined}
                      >
                        <div
                          className={
                            c.wrap
                              ? "premiumEditableWrapText"
                              : "premiumEditableClampText"
                          }
                        >
                          {c.render(r)}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={c.key}
                      className={cellClass}
                      style={cellStyle}
                      title={titleText}
                    >
                      {type === "select" ? (
                        <select
                          className={`premiumEditableSelect ${
                            c.compact ? "premiumEditableCompactInput" : ""
                          }`}
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
                      ) : (
                        <input
                          className={`premiumEditableInput ${
                            c.compact ? "premiumEditableCompactInput" : ""
                          }`}
                          type={type}
                          value={value}
                          title={titleText}
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
                      )}
                    </td>
                  );
                })}

                <td className="premiumEditableBodyCell premiumEditableActionCell right noPrint">
                  {onDelete ? (
                    <button
                      className="premiumEditableDeleteBtn"
                      onClick={() => onDelete(r.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="premiumEditableActionMuted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}