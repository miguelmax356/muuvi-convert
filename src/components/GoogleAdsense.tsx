import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function GoogleAdsense() {
  const { isPremium, user } = useAuth();

  useEffect(() => {
    if (isPremium || !user) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxxxxxxxxxxxxxxx';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [isPremium, user]);

  if (isPremium || !user) return null;

  return (
    <div className="my-6">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client="ca-pub-xxxxxxxxxxxxxxxx"
        data-ad-slot="xxxxxxxx"
      ></ins>
    </div>
  );
}

export { GoogleAdsense as GoogleAd };
