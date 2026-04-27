export default function OrderListFilters({
  dateType,
  setDateType,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  detailField,
  setDetailField,
  keyword,
  setKeyword,
  lifecycleFilter,
  setLifecycleFilter,
  clearFilters,
}) {
  return (
    <section className="premiumFilterCard">
      <div className="premiumFilterGrid">
        <div>
          <label>조회기간</label>
          <select value={dateType} onChange={(e) => setDateType(e.target.value)} className="premiumField">
            <option value="payment">결제일</option>
            <option value="order">주문일</option>
            <option value="confirm">발주확인일</option>
            <option value="ship">배송처리일</option>
          </select>
        </div>

        <div>
          <label>시작일</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="premiumField" />
        </div>

        <div>
          <label>종료일</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="premiumField" />
        </div>

        <div>
          <label>상세 조건</label>
          <select value={detailField} onChange={(e) => setDetailField(e.target.value)} className="premiumField">
            <option value="ALL">전체</option>
            <option value="seller">셀러명</option>
            <option value="customer">고객명</option>
            <option value="nickname">닉네임</option>
            <option value="product">제품명</option>
          </select>
        </div>

        <div className="span2">
          <label>검색</label>
          <input
            className="premiumField"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search seller, customer, product, phone, address..."
          />
        </div>

        <div>
          <label>상태</label>
          <select value={lifecycleFilter} onChange={(e) => setLifecycleFilter(e.target.value)} className="premiumField">
            <option value="ALL">전체 상태</option>
            <option value="NEW">신규주문</option>
            <option value="EXCEL_CONFIRMED">발주확인</option>
            <option value="IN_TRANSIT">배송 중</option>
            <option value="DELIVERED">배송완료</option>
          </select>
        </div>

        <div className="filterActionCell">
          <button className="premiumOrderBtn ghost" onClick={clearFilters}>
            필터 초기화
          </button>
        </div>
      </div>
    </section>
  );
}
