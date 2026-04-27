import StatusBadge from "../../components/StatusBadge.jsx";

export default function OrderDetailsPanel({
  selected,
  sellerNameDisplay,
  formCompletion,
  error,
  isMissing,
  formState,
  isLocked,
  saving,
  handleFieldChange,
  handleFieldBlur,
  applyImmediatePatch,
  onAddressLookup,
}) {
  return (
    <section className="ordersPremiumPanel ordersPremiumEditor">
      <div className="ordersPremiumPanelHead">
        <div>
          <h2>Order Details</h2>
          <p>Fill in customer and delivery information first.</p>
        </div>

        <div className="ordersPremiumMetaRow">
          <StatusBadge status={selected.status} />
          {selected.sellerSubmittedAt && (
            <span className="ordersPremiumCountChip">Confirmed • {new Date(selected.sellerSubmittedAt).toLocaleString()}</span>
          )}
          <span className="ordersPremiumIdText">ID: {selected.id}</span>
        </div>
      </div>

      {error && <div className="ordersPremiumError">{error}</div>}

      <div className="ordersPremiumTopInfoGrid">
        <div className="ordersPremiumInfoCard">
          <div className="ordersPremiumInfoLabel">Seller / Influencer</div>
          <div className="ordersPremiumInfoValue">{sellerNameDisplay}</div>
          <div className="ordersPremiumInfoSub">Automatically pulled from your login session.</div>
        </div>

        <div className="ordersPremiumInfoCard">
          <div className="ordersPremiumInfoLabel">Order Completion</div>
          <div className="ordersPremiumCompletionValue">{formCompletion}%</div>
          <div className="ordersPremiumProgressTrack">
            <div className="ordersPremiumProgressFill" style={{ width: `${formCompletion}%` }} />
          </div>
        </div>
      </div>

      <div className="ordersPremiumFormGrid">
        <div className="ordersPremiumFieldBlock">
          <label>Customer Name</label>
          <input
            className={`ordersPremiumInput ${isMissing("Customer Name") ? "error" : ""}`}
            value={formState.customerName}
            disabled={isLocked || saving}
            onChange={(e) => handleFieldChange("customerName", e.target.value)}
            onBlur={handleFieldBlur}
            placeholder="Customer account / buyer name"
          />
        </div>

        <div className="ordersPremiumFieldBlock">
          <label>Recipient Name</label>
          <input
            className={`ordersPremiumInput ${isMissing("Recipient Name") ? "error" : ""}`}
            value={formState.recipientName}
            disabled={isLocked || saving}
            onChange={(e) => handleFieldChange("recipientName", e.target.value)}
            onBlur={handleFieldBlur}
            placeholder="Actual receiver name"
          />
        </div>

        <div className="ordersPremiumFieldBlock">
          <label>Phone</label>
          <input
            className={`ordersPremiumInput ${isMissing("Phone") ? "error" : ""}`}
            value={formState.phone}
            disabled={isLocked || saving}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            onBlur={handleFieldBlur}
            placeholder="010-0000-0000"
          />
        </div>

        <div className="ordersPremiumFieldBlock">
          <label>Shipping Method</label>
          <select
            className={`ordersPremiumSelectField ${isMissing("Shipping Method") ? "error" : ""}`}
            value={formState.shippingMethod}
            disabled={isLocked || saving}
            onChange={(e) => handleFieldChange("shippingMethod", e.target.value)}
            onBlur={handleFieldBlur}
          >
            <option value="퀵">퀵</option>
            <option value="택배">택배</option>
            <option value="방문 수령">방문 수령</option>
          </select>
        </div>

        <div className="ordersPremiumAddressCard full">
          <div className="ordersPremiumInfoLabel">배송지 정보</div>

          <div className="ordersPremiumAddressRow">
            <input
              className="ordersPremiumInput small"
              value={formState.postalCode}
              disabled={isLocked || saving}
              onChange={(e) => handleFieldChange("postalCode", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="우편번호"
            />

            <button type="button" className="ordersPremiumGhostBtn" disabled={isLocked || saving} onClick={onAddressLookup}>
              주소찾기
            </button>
          </div>

          <div className="ordersPremiumAddressStack">
            <input
              className={`ordersPremiumInput ${isMissing("Address") ? "error" : ""}`}
              value={formState.addressMain}
              disabled={isLocked || saving}
              onChange={(e) => handleFieldChange("addressMain", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="주소"
            />

            <input
              className={`ordersPremiumInput ${isMissing("Address Detail") ? "error" : ""}`}
              value={formState.addressDetail}
              disabled={isLocked || saving}
              onChange={(e) => handleFieldChange("addressDetail", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="상세주소"
            />
          </div>

          <label className="ordersPremiumCheckboxRow">
            <input type="checkbox" checked={!!formState.saveAddressBook} disabled={isLocked || saving} onChange={(e) => applyImmediatePatch({ saveAddressBook: e.target.checked })} />
            <span>배송지 목록에 추가</span>
          </label>
        </div>

        <div className="ordersPremiumFieldBlock full">
          <label>배송메모</label>
          <select
            className="ordersPremiumSelectField"
            value={formState.deliveryMemo}
            disabled={isLocked || saving}
            onChange={(e) => handleFieldChange("deliveryMemo", e.target.value)}
            onBlur={handleFieldBlur}
          >
            <option value="">배송메모를 선택해 주세요.</option>
            <option value="문 앞에 놓아주세요.">문 앞에 놓아주세요.</option>
            <option value="경비실에 맡겨주세요.">경비실에 맡겨주세요.</option>
            <option value="배송 전 연락 부탁드립니다.">배송 전 연락 부탁드립니다.</option>
            <option value="부재 시 연락 부탁드립니다.">부재 시 연락 부탁드립니다.</option>
            <option value="파손 주의 부탁드립니다.">파손 주의 부탁드립니다.</option>
          </select>
        </div>
      </div>
    </section>
  );
}
