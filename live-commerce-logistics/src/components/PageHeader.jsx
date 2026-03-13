export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="pageHeader">
      <div>
        <h1 className="pageHeaderTitle">{title}</h1>
        {subtitle ? <p className="pageHeaderSubtitle">{subtitle}</p> : null}
      </div>

      {actions ? <div className="pageHeaderActions">{actions}</div> : null}
    </div>
  );
}