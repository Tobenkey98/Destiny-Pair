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

export function initFacebook() {
  if (facebookInitialized || document.getElementById("fb-script")) return;
  facebookInitialized = true;
  const script = document.createElement("script");
  script.id = "fb-script";
  script.src = "https://connect.facebook.net/en_US/sdk.js";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (window.FB) {
      FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || "",
        cookie: true,
        xfbml: true,
        version: "v19.0",
      });
    }
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
          reject(new Error(err?.message || err?.details || "Google sign in cancelled"));
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
        } else {
          reject(new Error(response.status === "not_authorized"
            ? "Facebook sign in was not authorized"
            : "Facebook sign in cancelled"));
        }
      },
      { scope: "public_profile,email" }
    );
  });
}
