import ExcelOrderImport from "../../components/ExcelOrderImport.jsx";

export default function OrdersImportModal({ show, onClose, onParsed }) {
  if (!show) return null;

  return (
    <div className="ordersPremiumModal">
      <div className="ordersPremiumModalCard">
        <div className="ordersPremiumModalHead">
          <div>
            <h3>Excel Import</h3>
            <p>Upload your order sheet and review before confirming.</p>
          </div>
          <button type="button" className="ordersPremiumGhostBtn" onClick={onClose}>
            Close
          </button>
        </div>

        <ExcelOrderImport onParsed={onParsed} />
      </div>
    </div>
  );
}
