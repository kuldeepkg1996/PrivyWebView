import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/App.css';

const REDIRECT_DELAY_MS = 3000;

function RedirectPage() {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('url') || 'orbitxpay://walletscreen';

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.location.href = redirectUrl;
      } catch (err) {
        console.error('Redirect error:', err);
        // Fallback: try to redirect to app
        window.location.href = 'orbitxpay://walletscreen';
      }
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [redirectUrl]);

  return (
    <div className="app-container">
      <div className="loading-container">
        <div className="spinner" />
        <p>Redirecting to app...</p>
      </div>
    </div>
  );
}

export default RedirectPage;

