document.addEventListener("DOMContentLoaded", () => {
  // Inject Streak & Badges styles
  function injectStreakStyles() {
    if (document.getElementById("streakStyles")) return;
    const style = document.createElement("style");
    style.id = "streakStyles";
    style.textContent = `
      .streak-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        color: #ea580c;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        cursor: pointer;
        user-select: none;
        transition: all 0.2s ease;
        margin-right: 12px;
      }
      .streak-badge:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(234, 88, 12, 0.15);
      }
      .streak-badge .fire-icon {
        font-size: 16px;
        animation: wiggle 1s infinite alternate;
        display: inline-block;
      }
      @keyframes wiggle {
        0% { transform: rotate(-5deg) scale(1); }
        100% { transform: rotate(10deg) scale(1.1); }
      }
      body.dark-theme .streak-badge {
        background: #1e1e30;
        border-color: #2d2d44;
        color: #fb923c;
        box-shadow: none;
      }

      /* Badges Grid styling */
      .badges-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      .badge-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0.4;
        filter: grayscale(100%);
      }
      .badge-item.unlocked {
        opacity: 1;
        filter: none;
        background: white;
        box-shadow: 0 4px 12px rgba(91, 92, 255, 0.05);
        border-color: rgba(91, 92, 255, 0.15);
      }
      .badge-item.unlocked:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(91, 92, 255, 0.12);
      }
      .badge-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }
      .badge-name {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 4px;
      }
      .badge-desc {
        font-size: 11px;
        color: #64748b;
      }
      body.dark-theme .badge-item {
        background: #151522;
        border-color: #2d2d44;
      }
      body.dark-theme .badge-item.unlocked {
        background: #1e1e30;
        border-color: rgba(91, 92, 255, 0.2);
      }
      body.dark-theme .badge-name {
        color: #f1f5f9;
      }
      body.dark-theme .badge-desc {
        color: #94a3b8;
      }
    `;
    document.head.appendChild(style);
  }

  // Render Streak Topbar fire icon
  function renderStreakBadge(streakCount) {
    injectStreakStyles();
    const container = document.querySelector(".top-actions, .topbar-right");
    if (!container) return;

    if (document.getElementById("streakBadge")) {
      document
        .getElementById("streakBadge")
        .querySelector(".streak-count").textContent = streakCount || 0;
      return;
    }

    const badge = document.createElement("div");
    badge.id = "streakBadge";
    badge.className = "streak-badge";
    badge.title = "Your daily consistency streak!";
    badge.innerHTML = `
      <span class="fire-icon">🔥</span>
      <span class="streak-count">${streakCount || 0}</span>
    `;

    const avatarLink = container.querySelector("a[href='profile.html']");
    if (avatarLink) {
      container.insertBefore(badge, avatarLink);
    } else {
      container.appendChild(badge);
    }
  }

  const allBadges = [
    {
      id: "first-action",
      name: "Getting Started",
      desc: "Perform your first update.",
      icon: "🎓",
    },
    {
      id: "3-day-streak",
      name: "3-Day Warrior",
      desc: "Maintain a streak of 3 days.",
      icon: "🎖️",
    },
    {
      id: "7-day-streak",
      name: "7-Day Warrior",
      desc: "Maintain a streak of 7 days.",
      icon: "🏆",
    },
    {
      id: "30-day-streak",
      name: "30-Day Legend",
      desc: "Maintain a streak of 30 days.",
      icon: "👑",
    },
  ];

  function renderBadges(unlockedIds) {
    injectStreakStyles();
    const grid = document.getElementById("badgesGrid");
    if (!grid) return;
    grid.innerHTML = "";

    allBadges.forEach((badge) => {
      const isUnlocked = unlockedIds && unlockedIds.includes(badge.id);
      const item = document.createElement("div");
      item.className = `badge-item ${isUnlocked ? "unlocked" : "locked"}`;
      item.innerHTML = `
        <div class="badge-icon">${badge.icon}</div>
        <div class="badge-name">${badge.name}</div>
        <div class="badge-desc">${isUnlocked ? badge.desc : "Locked"}</div>
      `;
      grid.appendChild(item);
    });
  }

  // Auth Guard
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!token || !currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Global Theme Check
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  // Render profile avatar if saved in localStorage
  const avatarEl = document.querySelector(".avatar");
  if (avatarEl && currentUser && currentUser.profileImage) {
    avatarEl.innerHTML = `<img src="${currentUser.profileImage}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
  }

  // Load Dynamic Overview Counts from backend
  fetch(`${CONFIG.API_BASE_URL}/api/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const overviewItems = document.querySelectorAll(".overview-item");
      overviewItems.forEach((item) => {
        const label = item.querySelector(".label").textContent.trim();
        const numberEl = item.querySelector(".number");
        if (label === "Applications") {
          numberEl.textContent = data.totalApplications;
        } else if (label === "Selected") {
          numberEl.textContent = data.selected;
        } else if (label === "DSA Topics") {
          numberEl.textContent = Object.keys(data.dsaProgress.topics).length;
        } else if (label === "Questions Solved") {
          numberEl.textContent = data.dsaProgress.solvedQuestions;
        }
      });
    })
    .catch((err) => console.error("Error loading statistics:", err));

  // Dark Mode Toggle Button Logic
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    const icon = themeToggleBtn.querySelector("i");
    if (document.body.classList.contains("dark-theme")) {
      icon.className = "fa-solid fa-sun";
    } else {
      icon.className = "fa-solid fa-moon";
    }

    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
      showToast(isDark ? "Dark Mode Enabled 🌙" : "Light Mode Enabled ☀️");
    });
  }

  // Helper to update avatars across profile UI
  const updateAvatarUI = (url) => {
    if (!url) return;
    const profileImg = document.querySelector(".profile-image img");
    if (profileImg) profileImg.src = url;
    const avatarEl = document.querySelector(".avatar");
    if (avatarEl) {
      avatarEl.innerHTML = `<img src="${url}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
    }
  };

  // Load Profile Information Form State from Backend
  const saveBtn = document.querySelector(".save-btn");
  const inputs = document.querySelectorAll(".form-grid input");

  // Pre-populate user details from localStorage instantly to avoid flashes of wrong data
  const profileCardName = document.querySelector(".profile-details h2");
  if (profileCardName && currentUser && currentUser.name) {
    profileCardName.textContent = currentUser.name;
  }
  const profileCardEmail = document.querySelector(".profile-details .email");
  if (profileCardEmail && currentUser && currentUser.email) {
    profileCardEmail.textContent = currentUser.email;
  }

  // Pre-populate left card metadata spans from localStorage cache
  const metaUsername = document.querySelector(".meta-username");
  if (metaUsername && currentUser) {
    metaUsername.textContent = currentUser.username || "Not Provided";
  }
  const metaPhone = document.querySelector(".meta-phone");
  if (metaPhone && currentUser) {
    metaPhone.textContent = currentUser.phone || "Not Provided";
  }
  const metaLocation = document.querySelector(".meta-location");
  if (metaLocation && currentUser) {
    metaLocation.textContent = currentUser.location || "India";
  }
  const metaCollege = document.querySelector(".meta-college");
  if (metaCollege && currentUser) {
    metaCollege.textContent = currentUser.college || "Not Provided";
  }

  // Pre-populate input values from local storage cache
  if (inputs.length >= 6 && currentUser) {
    inputs[0].value = currentUser.name || "";
    inputs[1].value = currentUser.email || "";
    inputs[2].value =
      currentUser.username ||
      (currentUser.email ? currentUser.email.split("@")[0] : "");
    inputs[3].value = currentUser.phone || "";
    inputs[4].value = currentUser.location || "India";
    inputs[5].value = currentUser.college || "";
  }

  fetch(`${CONFIG.API_BASE_URL}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((user) => {
      if (inputs.length >= 6) {
        inputs[0].value = user.name || "";
        inputs[1].value = user.email || "";
        inputs[2].value =
          user.username || (user.email ? user.email.split("@")[0] : "");
        inputs[3].value = user.phone || "";
        inputs[4].value = user.location || "India";
        inputs[5].value = user.college || "";

        // Update card avatar info
        const profileCardName = document.querySelector(".profile-details h2");
        if (profileCardName) profileCardName.textContent = user.name;

        const profileCardEmail = document.querySelector(
          ".profile-details .email",
        );
        if (profileCardEmail) profileCardEmail.textContent = user.email;

        // Update left card metadata text
        const metaUsername = document.querySelector(".meta-username");
        if (metaUsername)
          metaUsername.textContent = user.username || "Not Provided";

        const metaPhone = document.querySelector(".meta-phone");
        if (metaPhone) metaPhone.textContent = user.phone || "Not Provided";

        const metaLocation = document.querySelector(".meta-location");
        if (metaLocation) metaLocation.textContent = user.location || "India";

        const metaCollege = document.querySelector(".meta-college");
        if (metaCollege)
          metaCollege.textContent = user.college || "Not Provided";

        // Render profile picture if saved in database
        if (user.profileImage) {
          updateAvatarUI(user.profileImage);
        }

        // Cache the latest user object in localStorage to sync header avatars
        const localUser = {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username || "",
          phone: user.phone || "",
          location: user.location || "",
          college: user.college || "",
          profileImage: user.profileImage || "",
        };
        localStorage.setItem("currentUser", JSON.stringify(localUser));

        // Render badges & streaks
        renderBadges(user.badges);
        renderStreakBadge(user.streakCount || 0);
      }
    })
    .catch((err) => console.error("Error loading profile details:", err));

  // Save changes
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (inputs.length >= 6) {
        const name = inputs[0].value.trim();
        const email = inputs[1].value.trim();
        const username = inputs[2].value.trim();
        const phone = inputs[3].value.trim();
        const location = inputs[4].value.trim();
        const college = inputs[5].value.trim();

        // Get the current profile image (send only if it is a custom uploaded Base64 string)
        const profileImg = document.querySelector(".profile-image img");
        const profileImage =
          profileImg && profileImg.src.startsWith("data:")
            ? profileImg.src
            : "";

        if (!name) {
          alert("Full Name is required.");
          return;
        }

        if (!email) {
          alert("Email is required.");
          return;
        }

        fetch(`${CONFIG.API_BASE_URL}/api/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            email,
            username,
            phone,
            location,
            college,
            profileImage,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              return response.json().then((err) => {
                throw new Error(
                  err.message || "Failed to update profile settings",
                );
              });
            }
            return response.json();
          })
          .then((updatedUser) => {
            const profileCardName = document.querySelector(
              ".profile-details h2",
            );
            if (profileCardName) profileCardName.textContent = updatedUser.name;

            const profileCardEmail = document.querySelector(
              ".profile-details .email",
            );
            if (profileCardEmail)
              profileCardEmail.textContent = updatedUser.email;

            // Update left card metadata text
            const metaUsername = document.querySelector(".meta-username");
            if (metaUsername)
              metaUsername.textContent = updatedUser.username || "Not Provided";

            const metaPhone = document.querySelector(".meta-phone");
            if (metaPhone)
              metaPhone.textContent = updatedUser.phone || "Not Provided";

            const metaLocation = document.querySelector(".meta-location");
            if (metaLocation)
              metaLocation.textContent = updatedUser.location || "India";

            const metaCollege = document.querySelector(".meta-college");
            if (metaCollege)
              metaCollege.textContent = updatedUser.college || "Not Provided";

            // Cache the latest user object in localStorage to sync header avatars
            const localUser = {
              id: updatedUser._id || updatedUser.id,
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role,
              username: updatedUser.username || "",
              phone: updatedUser.phone || "",
              location: updatedUser.location || "",
              college: updatedUser.college || "",
              profileImage: updatedUser.profileImage || "",
            };
            localStorage.setItem("currentUser", JSON.stringify(localUser));

            showToast("Profile Settings Saved Successfully! 💾");
          })
          .catch((err) => {
            alert(err.message);
          });
      }
    });
  }
  // Edit Photo Handler
  const editPhotoBtn = document.querySelector(".edit-photo");
  const photoInput = document.getElementById("photoInput");

  if (editPhotoBtn && photoInput) {
    editPhotoBtn.addEventListener("click", () => {
      photoInput.click();
    });

    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Limit file size to 2MB to keep Mongo payload reasonable
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;

        // Immediately show preview in UI
        updateAvatarUI(base64Url);

        // Retrieve other field values to prevent clearing them
        const name = inputs[0] ? inputs[0].value.trim() : "";
        const phone = inputs[3] ? inputs[3].value.trim() : "";
        const college = inputs[5] ? inputs[5].value.trim() : "";

        // Send to backend
        fetch(`${CONFIG.API_BASE_URL}/api/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            phone,
            college,
            profileImage: base64Url,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to upload profile photo");
            }
            return response.json();
          })
          .then((updatedUser) => {
            localStorage.setItem("currentUser", JSON.stringify(updatedUser));
            showToast("Profile Photo Updated! 📸");
          })
          .catch((err) => {
            alert(err.message);
          });
      };
      reader.readAsDataURL(file);
    });
  }

  // Toast Notification
  function showToast(message) {
    let toast = document.querySelector(".toast-notification");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notification";
      toast.style.position = "fixed";
      toast.style.bottom = "24px";
      toast.style.right = "24px";
      toast.style.background = "#10b981";
      toast.style.color = "white";
      toast.style.padding = "14px 20px";
      toast.style.borderRadius = "12px";
      toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
      toast.style.zIndex = "9999";
      toast.style.fontFamily = "'Inter', sans-serif";
      toast.style.fontSize = "14px";
      toast.style.fontWeight = "600";
      toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      document.body.appendChild(toast);
    }

    toast.textContent = message;

    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 50);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
    }, 3000);
  }
  window.showToast = showToast;

  // Security actions
  document.querySelectorAll(".security-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.textContent.trim();
      if (action === "Delete Account") {
        if (
          confirm(
            "Are you sure you want to delete your account? This action is permanent!",
          )
        ) {
          fetch(`${CONFIG.API_BASE_URL}/api/profile`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error("Failed to delete account from server.");
              }
              return res.json();
            })
            .then(() => {
              localStorage.clear();
              alert(
                "Your account and all associated data have been permanently deleted.",
              );
              window.location.href = "homepage.html";
            })
            .catch((err) => {
              alert(err.message);
            });
        }
      } else {
        alert(`${action} feature is currently simulated.`);
      }
    });
  });

  // Logout button handler
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.removeAttribute("onclick");
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "homepage.html";
    });
  }

  // Initialize notifications dropdown
  initNotifications();

  // Initialize change password modal
  initChangePasswordModal();
});

// Dynamic Notification Dropdown Setup Helper
function initNotifications() {
  const notificationWrapper = document.querySelector(".notification");
  if (!notificationWrapper) return;

  // Wrap the existing .notification inside a .notification-container
  const parent = notificationWrapper.parentNode;
  const container = document.createElement("div");
  container.className = "notification-container";
  parent.replaceChild(container, notificationWrapper);
  container.appendChild(notificationWrapper);

  // Create Dropdown Element
  const dropdown = document.createElement("div");
  dropdown.className = "notification-dropdown";
  dropdown.id = "notificationDropdown";

  dropdown.innerHTML = `
    <div class="dropdown-header">
      <h3>Notifications</h3>
      <button class="mark-all-read-btn" id="markAllReadBtn">Mark all as read</button>
    </div>
    <div class="notification-list" id="notificationList"></div>
    <div class="dropdown-footer">
      <a href="#" class="view-all-link">View all alerts</a>
    </div>
  `;
  container.appendChild(dropdown);

  // Setup mock notifications in localStorage to persist read/unread status!
  let notifications = JSON.parse(localStorage.getItem("notifications"));
  if (!notifications) {
    notifications = [
      {
        id: 1,
        text: "Google recruitment drive registration deadline is tonight at 11:59 PM!",
        time: "2 hours ago",
        unread: true,
      },
      {
        id: 2,
        text: "Your application status for Microsoft has been updated to: Resume Screen Cleared.",
        time: "5 hours ago",
        unread: true,
      },
      {
        id: 3,
        text: "Placement Cell: Please review your profile data and upload your latest resume.",
        time: "1 day ago",
        unread: true,
      },
    ];
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }

  const badge = notificationWrapper.querySelector("span");

  function updateBadge() {
    const unreadCount = notifications.filter((n) => n.unread).length;
    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = "flex";
        badge.textContent = unreadCount;
      } else {
        badge.style.display = "none";
      }
    }
  }

  function renderList() {
    const listContainer = dropdown.querySelector("#notificationList");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (notifications.length === 0) {
      listContainer.innerHTML = `<div class="notification-empty">No new notifications</div>`;
      return;
    }

    notifications.forEach((n) => {
      const item = document.createElement("div");
      item.className = `notification-item ${n.unread ? "unread" : ""}`;
      item.innerHTML = `
        <p>${n.text}</p>
        <span class="notification-time">${n.time}</span>
      `;

      item.addEventListener("click", () => {
        n.unread = false;
        localStorage.setItem("notifications", JSON.stringify(notifications));
        renderList();
        updateBadge();
      });

      listContainer.appendChild(item);
    });
  }

  // Toggle Dropdown
  notificationWrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
  });

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });

  // Mark all as read
  const markReadBtn = dropdown.querySelector("#markAllReadBtn");
  if (markReadBtn) {
    markReadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifications.forEach((n) => (n.unread = false));
      localStorage.setItem("notifications", JSON.stringify(notifications));
      renderList();
      updateBadge();
    });
  }

  // Initial render
  renderList();
  updateBadge();
}

// Change Password Modal setup
function initChangePasswordModal() {
  const openBtn = document.getElementById("changePasswordBtn");
  const modal = document.getElementById("changePasswordModal");
  const closeBtn = document.getElementById("closePasswordModalBtn");
  const cancelBtn = document.getElementById("cancelPasswordBtn");
  const submitBtn = document.getElementById("submitPasswordBtn");

  const currentPass = document.getElementById("currentPasswordInput");
  const newPass = document.getElementById("newPasswordInput");
  const confirmPass = document.getElementById("confirmPasswordInput");

  if (!openBtn || !modal) return;

  const token = localStorage.getItem("token");

  // Password toggle icons
  const toggles = modal.querySelectorAll(".toggle-password");

  const changeStepForm = document.getElementById("changePasswordStepForm");
  const changeStepOtp = document.getElementById("changePasswordStepOtp");
  const confirmChangeBtn = document.getElementById("confirmChangePasswordBtn");
  const resendChangeOtpBtn = document.getElementById("resendChangeOtpBtn");
  const cancelChangeOtpBtn = document.getElementById("cancelChangeOtpBtn");
  const changeDigits = changeStepOtp.querySelectorAll(".otp-digit");

  let changeTimerInterval = null;
  let changeCountdownSeconds = 300;

  function startChangeCountdown() {
    clearInterval(changeTimerInterval);
    changeCountdownSeconds = 60; // 1 minute resend cooldown
    resendChangeOtpBtn.disabled = true;
    resendChangeOtpBtn.style.cursor = "not-allowed";

    const countdownText = document.getElementById("changeCountdown");

    changeTimerInterval = setInterval(() => {
      changeCountdownSeconds--;
      const mins = Math.floor(changeCountdownSeconds / 60);
      const secs = changeCountdownSeconds % 60;
      countdownText.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

      if (changeCountdownSeconds <= 0) {
        clearInterval(changeTimerInterval);
        countdownText.textContent = "Expired";
        resendChangeOtpBtn.disabled = false;
        resendChangeOtpBtn.style.cursor = "pointer";
      }
    }, 1000);
  }

  // Auto-tabbing focus logic for OTP digits
  changeDigits.forEach((digitInput, index) => {
    digitInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (val && index < changeDigits.length - 1) {
        changeDigits[index + 1].focus();
      }
    });

    digitInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !digitInput.value && index > 0) {
        changeDigits[index - 1].focus();
      }
    });
  });

  if (cancelChangeOtpBtn) {
    cancelChangeOtpBtn.addEventListener("click", () => {
      clearInterval(changeTimerInterval);
      changeStepForm.style.display = "block";
      changeStepOtp.style.display = "none";
    });
  }

  function openModal() {
    // Clear values first
    currentPass.value = "";
    newPass.value = "";
    confirmPass.value = "";
    currentPass.type = "password";
    newPass.type = "password";
    confirmPass.type = "password";
    const resetProfileNewPasswordInput = document.getElementById(
      "resetProfileNewPasswordInput",
    );
    if (resetProfileNewPasswordInput) {
      resetProfileNewPasswordInput.value = "";
      resetProfileNewPasswordInput.type = "password";
    }

    toggles.forEach((toggle) => {
      toggle.classList.remove("fa-eye-slash");
      toggle.classList.add("fa-eye");
    });

    changeStepForm.style.display = "block";
    changeStepOtp.style.display = "none";
    clearInterval(changeTimerInterval);

    modal.classList.add("show");
  }

  function closeModal() {
    clearInterval(changeTimerInterval);
    modal.classList.remove("show");
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Toggle Password Visibility Click Listeners
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        toggle.classList.remove("fa-eye");
        toggle.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        toggle.classList.remove("fa-eye-slash");
        toggle.classList.add("fa-eye");
      }
    });
  });

  // Forgot password in profile modal trigger
  const forgotLink = document.getElementById("forgotPassProfileLink");
  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();

      const currentUserStr = localStorage.getItem("currentUser");
      if (!currentUserStr) {
        alert("User data not found. Please log in again.");
        return;
      }
      const currentUser = JSON.parse(currentUserStr);
      const email = currentUser.email;

      forgotLink.style.pointerEvents = "none";
      forgotLink.textContent = "Sending Code...";

      fetch(`${CONFIG.API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((res) => {
          forgotLink.style.pointerEvents = "auto";
          forgotLink.textContent = "Forgot password?";
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "Failed to send reset code");
            });
          }
          return res.json();
        })
        .then((data) => {
          alert(data.message);
          changeStepForm.style.display = "none";
          changeStepOtp.style.display = "block";
          const resetProfileNewPasswordInput = document.getElementById(
            "resetProfileNewPasswordInput",
          );
          if (resetProfileNewPasswordInput) {
            resetProfileNewPasswordInput.value = "";
          }
          changeDigits.forEach((input) => (input.value = ""));
          changeDigits[0].focus();
          startChangeCountdown();

          if (data.otp) {
            const digits = data.otp.split("");
            changeDigits.forEach((input, idx) => {
              if (digits[idx]) input.value = digits[idx];
            });
            alert(`For testing purpose, reset code is: ${data.otp}`);
          }
        })
        .catch((err) => {
          forgotLink.style.pointerEvents = "auto";
          forgotLink.textContent = "Forgot password?";
          alert(err.message);
        });
    });
  }

  // Normal Password Change update trigger
  submitBtn.addEventListener("click", () => {
    const currentPassword = currentPass.value.trim();
    const newPassword = newPass.value.trim();
    const confirmPassword = confirmPass.value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    // Disable button during request
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    fetch(`${CONFIG.API_BASE_URL}/api/profile/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then((res) => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Update Password";
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message || "Failed to update password");
          });
        }
        return res.json();
      })
      .then((data) => {
        showToast("Password Updated Successfully! 🔐");
        closeModal();
      })
      .catch((err) => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Update Password";
        alert(err.message);
      });
  });

  // Verify and Reset Password using OTP trigger
  if (confirmChangeBtn) {
    confirmChangeBtn.addEventListener("click", () => {
      const currentUserStr = localStorage.getItem("currentUser");
      if (!currentUserStr) return;
      const currentUser = JSON.parse(currentUserStr);
      const email = currentUser.email;

      const newPassword = document.getElementById(
        "resetProfileNewPasswordInput",
      ).value;

      let otp = "";
      changeDigits.forEach((input) => (otp += input.value.trim()));

      if (otp.length < 6) {
        alert("Please enter the full 6-digit verification code.");
        return;
      }

      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      confirmChangeBtn.disabled = true;
      confirmChangeBtn.textContent = "Resetting...";

      fetch(`${CONFIG.API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      })
        .then((res) => {
          confirmChangeBtn.disabled = false;
          confirmChangeBtn.textContent = "Verify & Reset Password";
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "Failed to reset password");
            });
          }
          return res.json();
        })
        .then((data) => {
          showToast("Password Reset Successfully! 🔐");
          clearInterval(changeTimerInterval);
          closeModal();
        })
        .catch((err) => {
          confirmChangeBtn.disabled = false;
          confirmChangeBtn.textContent = "Verify & Reset Password";
          alert(err.message);
        });
    });
  }

  // Resend OTP trigger in profile
  if (resendChangeOtpBtn) {
    resendChangeOtpBtn.addEventListener("click", () => {
      const currentUserStr = localStorage.getItem("currentUser");
      if (!currentUserStr) return;
      const currentUser = JSON.parse(currentUserStr);
      const email = currentUser.email;

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
          startChangeCountdown();

          if (data.otp) {
            const digits = data.otp.split("");
            changeDigits.forEach((input, idx) => {
              if (digits[idx]) input.value = digits[idx];
            });
            alert(`For testing purpose, reset code is: ${data.otp}`);
          }
        })
        .catch((err) => alert(err.message));
    });
  }
}
