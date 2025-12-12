import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import '../styles/App.css';

function Home() {
  const navigate = useNavigate();
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="app-title">🔐 OrbitXPay Wallet</h1>
          <p className="app-subtitle">
            Welcome to your self-custodial wallet management system
          </p>
          <div className="auth-buttons">
            {authenticated ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/createWallet')}
                >
                  Create Wallet
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/profile')}
                >
                  View Profile
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/createWallet')}
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

