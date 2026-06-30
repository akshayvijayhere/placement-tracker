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
      fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
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

  // Forgot Password / Password Reset Flow
  const forgotLink = document.getElementById("forgotPasswordLink");
  const forgotModal = document.getElementById("forgotPasswordModal");
  const cancelResetBtn = document.getElementById("cancelResetBtn");
  const resetDigits = document.querySelectorAll("#forgotStepReset .otp-digit");
  let resetTimerInterval = null;
  let resetCountdownSeconds = 300;

  // Reset Password Visibility Toggle
  const toggleResetPass = document.getElementById("toggleResetPassword");
  if (toggleResetPass) {
    toggleResetPass.addEventListener("click", () => {
      const resetPassInput = document.getElementById("resetNewPassword");
      if (resetPassInput.type === "password") {
        resetPassInput.type = "text";
        toggleResetPass.classList.remove("fa-eye");
        toggleResetPass.classList.add("fa-eye-slash");
      } else {
        resetPassInput.type = "password";
        toggleResetPass.classList.remove("fa-eye-slash");
        toggleResetPass.classList.add("fa-eye");
      }
    });
  }

  function startResetCountdown() {
    clearInterval(resetTimerInterval);
    resetCountdownSeconds = 60; // 1 minute cooldown to resend
    const resendBtn = document.getElementById("resendResetBtn");
    resendBtn.disabled = true;
    resendBtn.style.cursor = "not-allowed";

    const countdownText = document.getElementById("resetCountdown");

    resetTimerInterval = setInterval(() => {
      resetCountdownSeconds--;
      const mins = Math.floor(resetCountdownSeconds / 60);
      const secs = resetCountdownSeconds % 60;
      countdownText.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      if (resetCountdownSeconds <= 0) {
        clearInterval(resetTimerInterval);
        countdownText.textContent = "Expired";
        resendBtn.disabled = false;
        resendBtn.style.cursor = "pointer";
      }
    }, 1000);
  }

  // Auto-tabbing focus logic for OTP digits
  resetDigits.forEach((digitInput, index) => {
    digitInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (val && index < resetDigits.length - 1) {
        resetDigits[index + 1].focus();
      }
    });

    digitInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !digitInput.value && index > 0) {
        resetDigits[index - 1].focus();
      }
    });
  });

  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      forgotModal.style.display = "flex";
      document.getElementById("forgotStepEmail").style.display = "block";
      document.getElementById("forgotStepReset").style.display = "none";
      document.getElementById("forgotEmail").value = "";
      document.getElementById("resetNewPassword").value = "";
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", () => {
      clearInterval(resetTimerInterval);
      forgotModal.style.display = "none";
    });
  }

  const sendCodeBtn = document.getElementById("sendResetCodeBtn");
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener("click", () => {
      const email = document.getElementById("forgotEmail").value.trim();
      if (!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
      }

      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = "Sending...";

      fetch(`${CONFIG.API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((res) => {
          sendCodeBtn.disabled = false;
          sendCodeBtn.textContent = "Send Reset Code";
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "Failed to send reset code");
            });
          }
          return res.json();
        })
        .then((data) => {
          alert(data.message);
          document.getElementById("forgotStepEmail").style.display = "none";
          document.getElementById("forgotStepReset").style.display = "block";
          document.getElementById("resetEmailPlaceholder").textContent = email;
          resetDigits.forEach((input) => (input.value = ""));
          resetDigits[0].focus();
          startResetCountdown();

          if (data.otp) {
            const digits = data.otp.split("");
            resetDigits.forEach((input, idx) => {
              if (digits[idx]) input.value = digits[idx];
            });
            alert(`For testing purpose, reset code is: ${data.otp}`);
          }
        })
        .catch((err) => {
          sendCodeBtn.disabled = false;
          sendCodeBtn.textContent = "Send Reset Code";
          alert(err.message);
        });
    });
  }

  const submitResetBtn = document.getElementById("submitResetBtn");
  if (submitResetBtn) {
    submitResetBtn.addEventListener("click", () => {
      const email = document.getElementById("forgotEmail").value.trim();
      const newPassword = document.getElementById("resetNewPassword").value;

      let otp = "";
      resetDigits.forEach((input) => (otp += input.value.trim()));

      if (otp.length < 6) {
        alert("Please enter the full 6-digit verification code.");
        return;
      }

      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      submitResetBtn.disabled = true;
      submitResetBtn.textContent = "Resetting...";

      fetch(`${CONFIG.API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      })
        .then((res) => {
          submitResetBtn.disabled = false;
          submitResetBtn.textContent = "Reset Password";
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "Failed to reset password");
            });
          }
          return res.json();
        })
        .then((data) => {
          alert(data.message);
          clearInterval(resetTimerInterval);
          forgotModal.style.display = "none";
        })
        .catch((err) => {
          submitResetBtn.disabled = false;
          submitResetBtn.textContent = "Reset Password";
          alert(err.message);
        });
    });
  }

  const resendResetBtn = document.getElementById("resendResetBtn");
  if (resendResetBtn) {
    resendResetBtn.addEventListener("click", () => {
      const email = document.getElementById("forgotEmail").value.trim();
      fetch(`${CONFIG.API_BASE_URL}/api/auth/forgot-password`, {
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
          startResetCountdown();

          if (data.otp) {
            const digits = data.otp.split("");
            resetDigits.forEach((input, idx) => {
              if (digits[idx]) input.value = digits[idx];
            });
            alert(`For testing purpose, reset code is: ${data.otp}`);
          }
        })
        .catch((err) => alert(err.message));
    });
  }
});
