import type { CSSProperties } from 'react';

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8fafc',
  color: '#0f172a',
  padding: '3rem 1.5rem',
  textAlign: 'center'
};

const cardStyle: CSSProperties = {
  maxWidth: '36rem',
  lineHeight: 1.6
};

export default function Home() {
  return (
    <main style={containerStyle}>
      <section style={cardStyle}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Possible Website API</h1>
        <p style={{ fontSize: '1rem', marginTop: '1rem', color: '#475569' }}>
          This workspace exposes typed HTTP handlers via the Next.js App Router. Use the <code>/api/health</code>
          route as a baseline for monitoring and future integrations.
        </p>
      </section>
    </main>
  );
}
