import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { FourSquare } from "react-loading-indicators";
import { useAuth } from "../context/AuthContext";
import { api, getUserAccessToken } from "../lib/api";

function RequireOnboarding({ children }) {
  const { user, loading } = useAuth();
  const [fetched, setFetched] = useState(null);
  const [fetching, setFetching] = useState(false);

  const embedded = user?.profile_completion;
  const completion = embedded ?? fetched;

  useEffect(() => {
    if (!loading && user && !embedded && !fetching && fetched === null) {
      setFetching(true);
      api.getProfileCompletion()
        .then(setFetched)
        .catch(() => setFetched({ is_complete: true }))
        .finally(() => setFetching(false));
    }
  }, [loading, user, embedded, fetching, fetched]);

  if (loading || (getUserAccessToken() && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_verified) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email || "")}`} replace />;
  }

  if (!completion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <FourSquare color="var(--primary)" size="medium" text="" textColor="" />
      </div>
    );
  }

  if (!completion.is_complete) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

export default RequireOnboarding;
