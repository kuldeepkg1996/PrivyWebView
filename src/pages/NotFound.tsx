import { useNavigate } from 'react-router-dom';
import '../styles/NotFound.css';

function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <div className="not-found-icon">
          <span className="icon-404">404</span>
        </div>
        
        <h1 className="not-found-title">Page Not Found</h1>
        
        <p className="not-found-description">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>


        {/* <div className="not-found-links">
          <p className="links-title">Quick Links:</p>
          <div className="links-grid">
            <button className="link-item" onClick={() => navigate('/profile')}>
              👤 Profile
            </button>
            <button className="link-item" onClick={() => navigate('/signTransaction')}>
              💸 Sign Transaction
            </button>
            <button className="link-item" onClick={() => navigate('/evm/signMessage')}>
              ✍️ Sign Message
            </button>
            <button className="link-item" onClick={() => navigate('/evm/signdata')}>
              📝 Sign Data
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
}

export default NotFound;
