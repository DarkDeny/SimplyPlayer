import './MainLayout.css';

export function MainLayout() {
  return (
    <div className="main-layout">
      <div className="main-layout__content">
        <div className="main-layout__center skeuo-inset">
          <div className="main-layout__welcome">
            <h1>SimplyPlayer</h1>
            <p>Open a file or drop audio files here to start playing</p>
          </div>
        </div>
      </div>
      <div className="main-layout__toolbar skeuo-panel">
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '16px' }}>
          Player controls will appear here
        </p>
      </div>
    </div>
  );
}
