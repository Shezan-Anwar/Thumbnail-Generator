export default function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden="true">
          ▶
        </span>
        <div>
          <h1 className="header__title">ThumbForge</h1>
          <p className="header__tagline">AI-powered YouTube thumbnail generator</p>
        </div>
      </div>
    </header>
  );
}
