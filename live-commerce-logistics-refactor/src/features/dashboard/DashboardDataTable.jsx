import { computeSetStock, parseProductsInside } from "../../lib/inventory.js";
import {
  formatDate,
  getCodeText,
  getDisplayImage,
  getPrimaryText,
} from "./dashboard-view-model.js";

function DashboardNameCell({ row, tableKey, state, giftRows, handleImageUpload }) {
  const image = getDisplayImage(state, row, tableKey, giftRows, parseProductsInside);
  const primary = getPrimaryText(row, tableKey) || "-";
  const code = getCodeText(row, tableKey) || "No code";

  return (
    <div className="dashboardProductCell">
      <img className="dashboardProductThumb" src={image} alt={primary} />

      <div className="dashboardProductText">
        <div className="dashboardProductName">{primary}</div>
        <div className="dashboardProductMeta">{code}</div>

        <label className="dashboardUploadLabel">
          Change image
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(tableKey, row, file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function DashboardSelectionHeader({ allVisibleSelected, toggleSelectAllVisible }) {
  return (
    <th className="dashboardCheckCol">
      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
    </th>
  );
}

function DashboardSelectionCell({ rowId, selectedIds, toggleSelectOne }) {
  return (
    <td className="dashboardCheckCol">
      <input
        type="checkbox"
        checked={selectedIds.includes(rowId)}
        onChange={() => toggleSelectOne(rowId)}
      />
    </td>
  );
}

export default function DashboardDataTable({
  active,
  pagedRows,
  selectedIds,
  allVisibleSelected,
  toggleSelectAllVisible,
  toggleSelectOne,
  handleUpdate,
  handleImageUpload,
  state,
  giftRows,
}) {
  if (active === "mainProducts") {
    return (
      <div className="dashboardTableWrap">
        <table className="dashboardTable">
          <thead>
            <tr>
              <DashboardSelectionHeader
                allVisibleSelected={allVisibleSelected}
                toggleSelectAllVisible={toggleSelectAllVisible}
              />
              <th>Product</th>
              <th>Supply</th>
              <th>Consumer</th>
              <th>Lowest</th>
              <th>Live</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <DashboardSelectionCell
                  rowId={row.id}
                  selectedIds={selectedIds}
                  toggleSelectOne={toggleSelectOne}
                />
                <td>
                  <DashboardNameCell
                    row={row}
                    tableKey={active}
                    state={state}
                    giftRows={giftRows}
                    handleImageUpload={handleImageUpload}
                  />
                </td>
                <td>
                  <input
                    className="dashboardCellInput"
                    type="number"
                    value={row.supplyPrice ?? 0}
                    onChange={(e) =>
                      handleUpdate(active, row.id, { supplyPrice: Number(e.target.value || 0) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="dashboardCellInput"
                    type="number"
                    value={row.retailPrice ?? 0}
                    onChange={(e) =>
                      handleUpdate(active, row.id, { retailPrice: Number(e.target.value || 0) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="dashboardCellInput"
                    type="number"
                    value={row.lowestPrice ?? 0}
                    onChange={(e) =>
                      handleUpdate(active, row.id, { lowestPrice: Number(e.target.value || 0) })
                    }
                  />
                </td>
                <td>
                  <input
                    className="dashboardCellInput"
                    type="number"
                    value={row.onlinePrice ?? 0}
                    onChange={(e) =>
                      handleUpdate(active, row.id, { onlinePrice: Number(e.target.value || 0) })
                    }
                  />
                </td>
                <td>{formatDate(row.lastModified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (active === "catalogProducts") {
    return (
      <div className="dashboardTableWrap">
        <table className="dashboardTable">
          <thead>
            <tr>
              <DashboardSelectionHeader
                allVisibleSelected={allVisibleSelected}
                toggleSelectAllVisible={toggleSelectAllVisible}
              />
              <th>Product</th>
              <th>SKU</th>
              <th>Supply</th>
              <th>Consumer</th>
              <th>Lowest</th>
              <th>Live</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <DashboardSelectionCell rowId={row.id} selectedIds={selectedIds} toggleSelectOne={toggleSelectOne} />
                <td>
                  <DashboardNameCell row={row} tableKey={active} state={state} giftRows={giftRows} handleImageUpload={handleImageUpload} />
                </td>
                <td><input className="dashboardCellInput" value={row.sku ?? ""} onChange={(e) => handleUpdate(active, row.id, { sku: e.target.value })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.supplyPrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { supplyPrice: Number(e.target.value || 0) })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.consumerPrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { consumerPrice: Number(e.target.value || 0) })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.lowestPrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { lowestPrice: Number(e.target.value || 0) })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.livePrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { livePrice: Number(e.target.value || 0) })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.stock ?? 0} onChange={(e) => handleUpdate(active, row.id, { stock: Number(e.target.value || 0) })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (active === "catalogEvents") {
    return (
      <div className="dashboardTableWrap">
        <table className="dashboardTable">
          <thead>
            <tr>
              <DashboardSelectionHeader allVisibleSelected={allVisibleSelected} toggleSelectAllVisible={toggleSelectAllVisible} />
              <th>Event Product</th>
              <th>Event SKU</th>
              <th>Supply</th>
              <th>Sale</th>
              <th>Consumer</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <DashboardSelectionCell rowId={row.id} selectedIds={selectedIds} toggleSelectOne={toggleSelectOne} />
                <td><DashboardNameCell row={row} tableKey={active} state={state} giftRows={giftRows} handleImageUpload={handleImageUpload} /></td>
                <td><input className="dashboardCellInput" value={row.eventSku ?? ""} onChange={(e) => handleUpdate(active, row.id, { eventSku: e.target.value })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.supplyPrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { supplyPrice: Number(e.target.value || 0) })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.salePrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { salePrice: Number(e.target.value || 0) })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.consumerPrice ?? 0} onChange={(e) => handleUpdate(active, row.id, { consumerPrice: Number(e.target.value || 0) })} /></td>
                <td>{formatDate(row.lastModified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (active === "aliasTable") {
    return (
      <div className="dashboardTableWrap">
        <table className="dashboardTable">
          <thead>
            <tr>
              <DashboardSelectionHeader allVisibleSelected={allVisibleSelected} toggleSelectAllVisible={toggleSelectAllVisible} />
              <th>Alias</th>
              <th>Target Type</th>
              <th>Target SKU</th>
              <th>Official Name</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <DashboardSelectionCell rowId={row.id} selectedIds={selectedIds} toggleSelectOne={toggleSelectOne} />
                <td><input className="dashboardCellInput" value={row.aliasName ?? ""} onChange={(e) => handleUpdate(active, row.id, { aliasName: e.target.value })} /></td>
                <td>
                  <select className="dashboardCellInput" value={row.targetType ?? "PRODUCT"} onChange={(e) => handleUpdate(active, row.id, { targetType: e.target.value })}>
                    <option value="PRODUCT">PRODUCT</option>
                    <option value="SET">SET</option>
                    <option value="GIFT">GIFT</option>
                  </select>
                </td>
                <td><input className="dashboardCellInput" value={row.targetSku ?? ""} onChange={(e) => handleUpdate(active, row.id, { targetSku: e.target.value })} /></td>
                <td><input className="dashboardCellInput" value={row.officialName ?? ""} onChange={(e) => handleUpdate(active, row.id, { officialName: e.target.value })} /></td>
                <td>
                  <input type="checkbox" checked={!!row.active} onChange={(e) => handleUpdate(active, row.id, { active: e.target.checked })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (active === "setProducts") {
    return (
      <div className="dashboardTableWrap">
        <table className="dashboardTable">
          <thead>
            <tr>
              <DashboardSelectionHeader allVisibleSelected={allVisibleSelected} toggleSelectAllVisible={toggleSelectAllVisible} />
              <th>Set Product</th>
              <th>Set Code</th>
              <th>Products Inside</th>
              <th>Computed Stock</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <DashboardSelectionCell rowId={row.id} selectedIds={selectedIds} toggleSelectOne={toggleSelectOne} />
                <td><DashboardNameCell row={row} tableKey={active} state={state} giftRows={giftRows} handleImageUpload={handleImageUpload} /></td>
                <td><input className="dashboardCellInput" value={row.setCode ?? ""} onChange={(e) => handleUpdate(active, row.id, { setCode: e.target.value })} /></td>
                <td><input className="dashboardCellInput" value={row.productsInside ?? ""} onChange={(e) => handleUpdate(active, row.id, { productsInside: e.target.value })} placeholder="CODE:1;CODE:2" /></td>
                <td>{computeSetStock(state, row.setCode)}</td>
                <td>{formatDate(row.lastModified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (active === "setComponents") {
    return (
      <div className="dashboardTableWrap">
        <table className="dashboardTable">
          <thead>
            <tr>
              <DashboardSelectionHeader allVisibleSelected={allVisibleSelected} toggleSelectAllVisible={toggleSelectAllVisible} />
              <th>Set Code</th>
              <th>Product Code</th>
              <th>Qty / Set</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id}>
                <DashboardSelectionCell rowId={row.id} selectedIds={selectedIds} toggleSelectOne={toggleSelectOne} />
                <td><input className="dashboardCellInput" value={row.setCode ?? ""} onChange={(e) => handleUpdate(active, row.id, { setCode: e.target.value })} /></td>
                <td><input className="dashboardCellInput" value={row.productCode ?? ""} onChange={(e) => handleUpdate(active, row.id, { productCode: e.target.value })} /></td>
                <td><input className="dashboardCellInput" type="number" value={row.qtyPerSet ?? 1} onChange={(e) => handleUpdate(active, row.id, { qtyPerSet: Number(e.target.value || 0) })} /></td>
                <td>{formatDate(row.lastModified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="dashboardTableWrap">
      <table className="dashboardTable">
        <thead>
          <tr>
            <DashboardSelectionHeader allVisibleSelected={allVisibleSelected} toggleSelectAllVisible={toggleSelectAllVisible} />
            <th>Gift</th>
            <th>Gift Code</th>
            <th>Stock</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((row) => (
            <tr key={row.id}>
              <DashboardSelectionCell rowId={row.id} selectedIds={selectedIds} toggleSelectOne={toggleSelectOne} />
              <td><DashboardNameCell row={row} tableKey={active} state={state} giftRows={giftRows} handleImageUpload={handleImageUpload} /></td>
              <td><input className="dashboardCellInput" value={row.giftCode ?? ""} onChange={(e) => handleUpdate(active, row.id, { giftCode: e.target.value })} /></td>
              <td><input className="dashboardCellInput" type="number" value={row.stock ?? 0} onChange={(e) => handleUpdate(active, row.id, { stock: Number(e.target.value || 0) })} /></td>
              <td>{formatDate(row.lastModified)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
