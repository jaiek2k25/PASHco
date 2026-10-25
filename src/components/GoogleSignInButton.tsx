import React, { useEffect, useRef } from 'react';
import { decodeGoogleCredential, GoogleUserProfile } from '../utils/apiSync';

interface GoogleIdentityCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleIdentityCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type: 'standard';
          theme: 'filled_black';
          size: 'large';
          shape: 'pill';
          text: 'signin_with';
          logo_alignment: 'left';
          width: number;
        }
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  const loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')), {
        once: true,
      });
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  }).catch((error) => {
    googleScriptPromise = null;
    throw error;
  });
  googleScriptPromise = loadPromise;
  return loadPromise;
}

interface GoogleSignInButtonProps {
  clientId: string;
  onCredential: (profile: GoogleUserProfile, idToken: string) => void;
  onError: (message: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  clientId,
  onCredential,
  onError,
}) => {
  const buttonContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const container = buttonContainer.current;
    if (!clientId || !container) return;

    container.replaceChildren();
    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !container || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          cancel_on_tap_outside: true,
          callback: (response) => {
            if (!response.credential) {
              onError('Google did not return an ID token. Please try again.');
              return;
            }
            try {
              const profile = decodeGoogleCredential(response.credential, clientId);
              onCredential(profile, response.credential);
            } catch (error) {
              onError(error instanceof Error ? error.message : 'Could not read the Google identity.');
            }
          },
        });
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 280,
        });
      })
      .catch((error) => {
        if (!cancelled) {
          onError(error instanceof Error ? error.message : 'Google sign-in could not be loaded.');
        }
      });

    return () => {
      cancelled = true;
      container?.replaceChildren();
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) return null;
  return <div ref={buttonContainer} className="min-h-11" aria-label="Sign in with Google" />;
};
