console.log("Registration Page Script Loaded 🚀");

document.addEventListener("DOMContentLoaded", () => {
  // OTP Modal Elements
  const otpModal = document.getElementById("otpModal");
  const otpEmailPlaceholder = document.getElementById("otpEmailPlaceholder");
  const otpDigits = document.querySelectorAll(".otp-digit");
  const otpCountdown = document.getElementById("otpCountdown");
  const resendOtpBtn = document.getElementById("resendOtpBtn");
  const cancelOtpBtn = document.getElementById("cancelOtpBtn");
  const submitOtpBtn = document.getElementById("submitOtpBtn");

  let timerInterval = null;
  let countdownSeconds = 300; // 5 minutes

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

  // Form Validation and OTP dispatching
  const registerForm = document.querySelector("form");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Form submit event listener triggered! 📨");

      const passwordInput = document.getElementById("registerPassword");
      const emailInput = document.getElementById("registerEmail");
      const usernameInput = document.getElementById("registerUsername");
      const nameInput = document.getElementById("registerName");

      if (!nameInput || !usernameInput || !emailInput || !passwordInput) {
        console.error("Error: Some inputs could not be selected from the DOM.");
        alert("Error: Some form input fields could not be found!");
        return;
      }

      const name = nameInput.value.trim();
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (name.length < 3) {
        alert("Full name must be at least 3 characters long.");
        return;
      }

      if (username.length < 3) {
        alert("Username must be at least 3 characters long.");
        return;
      }

      if (!email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      // Send OTP first before creating the user
      fetch(`${CONFIG.API_BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(
                err.message || "Failed to send verification code",
              );
            });
          }
          return response.json();
        })
        .then((data) => {
          otpEmailPlaceholder.textContent = email;
          otpDigits.forEach((input) => (input.value = ""));
          otpModal.style.display = "flex";
          otpDigits[0].focus();
          startCountdown();
          alert(data.message);
        })
        .catch((err) => {
          alert("Error: " + err.message);
        });
    });
  }

  // Auto-tabbing focus logic for OTP digits
  otpDigits.forEach((digitInput, index) => {
    digitInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (val.length === 1 && index < otpDigits.length - 1) {
        otpDigits[index + 1].focus();
      }
    });

    digitInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        otpDigits[index - 1].focus();
      }
    });
  });

  function startCountdown() {
    clearInterval(timerInterval);
    countdownSeconds = 300;
    resendOtpBtn.disabled = true;
    resendOtpBtn.style.cursor = "not-allowed";

    timerInterval = setInterval(() => {
      countdownSeconds--;
      const mins = Math.floor(countdownSeconds / 60);
      const secs = countdownSeconds % 60;
      otpCountdown.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      if (countdownSeconds <= 0) {
        clearInterval(timerInterval);
        otpCountdown.textContent = "Expired";
        resendOtpBtn.disabled = false;
        resendOtpBtn.style.cursor = "pointer";
      }
    }, 1000);
  }

  if (cancelOtpBtn) {
    cancelOtpBtn.addEventListener("click", () => {
      clearInterval(timerInterval);
      otpModal.style.display = "none";
    });
  }

  if (resendOtpBtn) {
    resendOtpBtn.addEventListener("click", () => {
      const email = otpEmailPlaceholder.textContent;
      fetch(`${CONFIG.API_BASE_URL}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to resend code");
          return res.json();
        })
        .then((data) => {
          alert(data.message);
          startCountdown();
        })
        .catch((err) => alert(err.message));
    });
  }

  if (submitOtpBtn) {
    submitOtpBtn.addEventListener("click", () => {
      let otp = "";
      otpDigits.forEach((input) => (otp += input.value.trim()));

      if (otp.length !== 6) {
        alert("Please enter the complete 6-digit code.");
        return;
      }

      const name = document.getElementById("registerName").value.trim();
      const username = document.getElementById("registerUsername").value.trim();
      const email = otpEmailPlaceholder.textContent;
      const password = document.getElementById("registerPassword").value;

      fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, otp }),
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "Registration failed");
            });
          }
          return res.json();
        })
        .then((data) => {
          clearInterval(timerInterval);
          otpModal.style.display = "none";
          localStorage.setItem("token", data.token);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          window.location.href = "dashboard.html";
        })
        .catch((err) => alert(err.message));
    });
  }

  // Developer Mock Sign-In Helper function
  const triggerMockGoogleSignIn = () => {
    fetch(`${CONFIG.API_BASE_URL}/api/auth/google/mock`, {
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

  // Google Sign-In Integration (Instant Initializer)
  const initGoogleSignIn = () => {
    const clientId =
      "115784618885-tnckr4693u6jg0j219fn6pkih3dl6ljg.apps.googleusercontent.com";
    if (
      typeof google !== "undefined" &&
      google.accounts &&
      google.accounts.id
    ) {
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
    } else {
      // Retry in 50ms if script is still loading async
      setTimeout(initGoogleSignIn, 50);
    }
  };

  initGoogleSignIn();

  function handleGoogleLogin(response) {
    fetch(`${CONFIG.API_BASE_URL}/api/auth/google`, {
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
