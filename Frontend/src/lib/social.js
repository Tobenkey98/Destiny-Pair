let googleInitialized = false;
let facebookInitialized = false;

export function initGoogle() {
  if (googleInitialized || document.getElementById("gsi-script")) return;
  googleInitialized = true;
  const script = document.createElement("script");
  script.id = "gsi-script";
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = () => { window.__gsiLoaded = true; };
  document.body.appendChild(script);
}

const FACEBOOK_SDK_VERSION = "v26.0";

export function initFacebook() {
  if (facebookInitialized || document.getElementById("fb-script")) return;
  facebookInitialized = true;
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
  const script = document.createElement("script");
  script.id = "fb-script";
  script.src = "https://connect.facebook.net/en_US/sdk.js";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (window.FB) {
      FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: FACEBOOK_SDK_VERSION,
      });
    }
  };
  script.onerror = () => {
    facebookInitialized = false;
  };
  document.body.appendChild(script);
}

export function loginWithGoogle() {
  return new Promise((resolve, reject) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      reject(new Error("Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env"));
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services not loaded yet. Try again."));
      return;
    }
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: (response) => {
          if (response.access_token) {
            resolve({
              provider: "google",
              access_token: response.access_token,
              first_name: "",
              last_name: "",
            });
          } else if (response.error) {
            reject(new Error(response.error_description || response.error || "Google sign in failed"));
          } else {
            reject(new Error("Google sign in failed"));
          }
        },
        error_callback: (err) => {
          const type = err?.type || "";
          const detail = err?.message || err?.details || "";
          if (type === "popup_failed_to_open") {
            reject(new Error("Google sign-in popup could not open. Please allow pop-ups for this site and try again."));
          } else if (type === "popup_closed_by_user") {
            reject(new Error(`Google sign in was cancelled. If an "Access blocked" page appeared in the popup, add this exact address (${window.location.origin}) to the Google Cloud OAuth "Authorized JavaScript origins" for this app.`));
          } else if (type === "access_denied") {
            reject(new Error("Google sign in was not authorized."));
          } else {
            reject(new Error(detail || "Google sign in failed. Please try again."));
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      reject(new Error(e.message || "Failed to initialize Google sign in"));
    }
  });
}

export function loginWithFacebook() {
  return new Promise((resolve, reject) => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
    if (!appId || appId === "your-facebook-app-id") {
      reject(new Error("Facebook Login is not configured. Set VITE_FACEBOOK_APP_ID in .env"));
      return;
    }
    if (!window.FB) {
      reject(new Error("Facebook SDK not loaded yet. Try again."));
      return;
    }
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve({
            provider: "facebook",
            access_token: response.authResponse.accessToken,
            first_name: "",
            last_name: "",
          });
          return;
        }
        if (response?.error) {
          reject(new Error(`Facebook sign in failed: ${response.error.message || response.error.code || "Unknown error"}`));
          return;
        }
        switch (response?.status) {
          case "not_authorized":
            reject(new Error("Facebook sign in was not authorized"));
            break;
          case "unknown":
            reject(new Error("Facebook sign in did not complete. The popup closed without connecting. Check that this site's address (http://localhost:5174) is added to your Facebook app's domains / OAuth settings and that the app is in Live mode, then try again."));
            break;
          default:
            reject(new Error("Facebook sign in failed. Please try again."));
        }
      },
      { scope: "public_profile,email" }
    );
  });
}
