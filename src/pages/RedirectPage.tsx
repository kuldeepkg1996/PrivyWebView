import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/App.css';

const REDIRECT_DELAY_MS = 3000;

function RedirectPage() {
  const [searchParams] = useSearchParams();
  const encodedUrl = searchParams.get('url') || 'orbitxpay://walletscreen';
  
  // React Router's searchParams.get() automatically decodes the value once
  // So encodedUrl should already be decoded
  let redirectUrl = encodedUrl;
  
  // Double-check: if it looks like it's still encoded (contains %), try decoding again
  if (encodedUrl.includes('%')) {
    try {
      const decoded = decodeURIComponent(encodedUrl);
      redirectUrl = decoded;
      console.log('RedirectPage - Double-decoded URL');
    } catch (e) {
      console.warn('RedirectPage - Failed to double-decode, using as-is:', e);
    }
  }
  
  console.log('RedirectPage - Raw URL from params:', encodedUrl);
  console.log('RedirectPage - Final redirect URL:', redirectUrl);
  console.log('RedirectPage - URL includes userId:', redirectUrl.includes('userId='));
  console.log('RedirectPage - URL length:', redirectUrl.length);
  
  // Extract and verify userId is present
  const userIdMatch = redirectUrl.match(/[?&]userId=([^&]*)/);
  if (userIdMatch) {
    console.log('RedirectPage - Found userId in URL:', decodeURIComponent(userIdMatch[1]));
  } else {
    console.error('RedirectPage - ERROR: userId parameter NOT found in URL!');
    console.error('RedirectPage - Full URL:', redirectUrl);
  }

  useEffect(() => {
    // Don't redirect if we're using the fallback URL (no userId means it's the default)
    if (redirectUrl === 'orbitxpay://walletscreen' || !redirectUrl.includes('userId=')) {
      console.error('RedirectPage - ERROR: Invalid redirect URL or missing userId!');
      console.error('RedirectPage - URL:', redirectUrl);
      return;
    }
    
    const timer = setTimeout(() => {
      try {
        console.log('RedirectPage - About to redirect to:', redirectUrl);
        console.log('RedirectPage - URL parameter count:', (redirectUrl.match(/[?&]/g) || []).length);
        
        // Final verification that userId is still present
        if (!redirectUrl.includes('userId=')) {
          console.error('ERROR: userId is missing from redirect URL before redirect!');
          console.error('Full URL:', redirectUrl);
          return; // Don't redirect if userId is missing
        }
        
        // Try multiple redirect methods to ensure InAppBrowser receives the full URL
        console.log('RedirectPage - Executing redirect...');
        
        // Method 1: Try iframe redirect first (sometimes preserves URL better with InAppBrowser)
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = redirectUrl;
          document.body.appendChild(iframe);
          console.log('RedirectPage - Used iframe redirect method');
          
          // Also try window.location as backup
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 100);
        } catch (iframeError) {
          console.warn('RedirectPage - Iframe redirect failed, using window.location:', iframeError);
          // Fallback to window.location.replace
          window.location.replace(redirectUrl);
        }
      } catch (err) {
        console.error('Redirect error:', err);
        // Don't use fallback - if redirect fails, log error but don't redirect without userId
        console.error('RedirectPage - Failed to redirect, not using fallback to preserve userId');
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

