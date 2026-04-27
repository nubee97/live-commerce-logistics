export default function PageHeader({ title, subtitle, actions, kicker = "Operations" }) {
  return (
    <div className="pageHeader">
      <div>
        {kicker ? <div className="pageHeaderKicker">{kicker}</div> : null}
        <h1 className="pageHeaderTitle">{title}</h1>
        {subtitle ? <p className="pageHeaderSubtitle">{subtitle}</p> : null}
      </div>

      {actions ? <div className="pageHeaderActions">{actions}</div> : null}
    </div>
  );
}
