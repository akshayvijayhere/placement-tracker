const CONFIG = {
  API_BASE_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:5001"
      : "https://placement-tracker-backend-skdo.onrender.com", // Live Render backend URL
};
