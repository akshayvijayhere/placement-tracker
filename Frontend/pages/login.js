document.addEventListener("DOMContentLoaded", () => {
  // Password Visibility Toggle
  const eyeIcon = document.querySelector(".input-box .fa-eye");
  if (eyeIcon) {
    const passwordInput = eyeIcon.previousElementSibling;
    eyeIcon.style.cursor = "pointer";
    eyeIcon.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");
      } else {
        passwordInput.type = "password";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");
      }
    });
  }

  // Form submission and routing logic
  const loginForm = document.querySelector("form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const emailInput = document.getElementById("loginEmail");
      const passwordInput = document.getElementById("loginPassword");

      if (!emailInput || !passwordInput) return;

      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      // Authenticate with backend API
      fetch("http://localhost:5001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.message || "Invalid email or password");
            });
          }
          return response.json();
        })
        .then((data) => {
          localStorage.setItem("token", data.token);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          window.location.href = "dashboard.html";
        })
        .catch((err) => {
          alert(err.message);
        });
    });
  }

  // Developer Mock Sign-In Helper function
  const triggerMockGoogleSignIn = () => {
    fetch("http://localhost:5001/api/auth/google/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Mock Login failed");
        }
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        window.location.href = "dashboard.html";
      })
      .catch((err) => alert(err.message));
  };

  // Helper to render mock Google Sign-In button if script fails
  const renderMockGoogleButton = () => {
    const btnContainer = document.getElementById("googleBtn");
    if (btnContainer) {
      btnContainer.innerHTML = `<button class="google-btn" style="width: 100%; border: 1px solid #dadce0; border-radius: 4px; padding: 10px; background: white; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
        <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" style="width: 18px; height: 18px;" />
        Continue with Google
      </button>`;
      btnContainer.querySelector("button").addEventListener("click", (e) => {
        e.preventDefault();
        if (
          confirm(
            "Would you like to use Developer Mock Sign-In to simulate the Google Login flow for testing?",
          )
        ) {
          triggerMockGoogleSignIn();
        }
      });
    }
  };

  // Google Sign-In Integration
  fetch("http://localhost:5001/api/config/google")
    .then((response) => response.json())
    .then((data) => {
      const clientId = data.clientId;
      if (
        !clientId ||
        typeof google === "undefined" ||
        !google.accounts ||
        !google.accounts.id
      ) {
        renderMockGoogleButton();
        return;
      }

      // Initialize Google Identity Services
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleLogin,
      });

      google.accounts.id.renderButton(document.getElementById("googleBtn"), {
        theme: "outline",
        size: "large",
        width: "360",
        text: "continue_with",
      });
    })
    .catch((err) => {
      console.error("Error fetching Google Auth config:", err);
      renderMockGoogleButton();
    });

  function handleGoogleLogin(response) {
    fetch("http://localhost:5001/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential: response.credential }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "Google Authentication failed");
          });
        }
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("token", data.token);
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        window.location.href = "dashboard.html";
      })
      .catch((err) => {
        alert(err.message);
      });
  }
});
