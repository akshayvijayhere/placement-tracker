document.addEventListener("DOMContentLoaded", () => {
  // Inject Streak styles
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

  // Auth Guard
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!token || !currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Render profile avatar if saved
  const avatarEl = document.querySelector(".avatar");
  if (avatarEl && currentUser && currentUser.profileImage) {
    avatarEl.innerHTML = `<img src="${currentUser.profileImage}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
  }

  // Global Theme Check
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

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
    });
  }

  // Pre-populate welcome greeting instantly to avoid flashes of wrong data
  const welcomeMsg = document.querySelector(".topbar p");
  if (welcomeMsg && currentUser && currentUser.name) {
    const firstName = currentUser.name.split(" ")[0];
    welcomeMsg.textContent = `Welcome back, ${firstName}! Here's your placement overview.`;
  }

  let dashboardData = null;

  // Stale-While-Revalidate caching: instantly load cached stats if available
  const cachedDashboard = localStorage.getItem("cachedDashboardData");
  if (cachedDashboard) {
    try {
      const parsedCacheData = JSON.parse(cachedDashboard);
      updateDashboardUI(parsedCacheData);
    } catch (e) {
      console.error("Error parsing cached dashboard data:", e);
    }
  }

  // Load and Render Stats from backend
  fetch(`${CONFIG.API_BASE_URL}/api/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    })
    .then((data) => {
      // Save stats to cache
      localStorage.setItem("cachedDashboardData", JSON.stringify(data));
      // Update UI with fresh stats
      updateDashboardUI(data);
    })
    .catch((err) => {
      console.error(err);
      if (err.message === "Unauthorized") {
        localStorage.removeItem("token");
        localStorage.removeItem("currentUser");
        window.location.href = "login.html";
      }
    });

  // Render dashboard elements
  function updateDashboardUI(data) {
    dashboardData = data;
    // 1. Update Stat Cards
    const totalAppsVal = data.totalApplications;
    const selectedCount = data.selected;
    const interviewCount = data.interview;
    const dsaProgressPercent = data.dsaProgress.percentage;

    const statCards = document.querySelectorAll(".stat-card");
    statCards.forEach((card) => {
      const title = card.querySelector("h3").textContent.trim();
      const valEl = card.querySelector("h1");
      if (title === "Total Applications") {
        valEl.textContent = totalAppsVal;
      } else if (title === "Interviews" || title === "Applied Companies") {
        valEl.textContent = interviewCount;
      } else if (title === "Selected" || title === "Selected Companies") {
        valEl.textContent = selectedCount;
      } else if (title === "DSA Statistics") {
        valEl.textContent = dsaProgressPercent + "%";
      } else if (title === "Daily Streak") {
        valEl.textContent = data.streak ? data.streak.current : 0;
      }
    });

    const streakLongestVal = document.getElementById("streakLongestVal");
    if (streakLongestVal && data.streak) {
      streakLongestVal.textContent = `Longest Streak: ${data.streak.longest || 0} days`;
    }

    if (data.streak) {
      renderStreakBadge(data.streak.current);
    }

    // Update Quick Actions Summary Box
    const summaryRows = document.querySelectorAll(
      ".quick-actions-card .summary-row",
    );
    summaryRows.forEach((row) => {
      const label = row.querySelector("span").textContent.trim();
      const valEl = row.querySelector("strong");
      if (label === "Total Applications") {
        valEl.textContent = totalAppsVal;
      } else if (label === "Interviews") {
        valEl.textContent = interviewCount;
      } else if (label === "Selected") {
        valEl.textContent = selectedCount;
      }
    });

    // 2. Update Donut Chart
    const applied = data.applied;
    const interview = data.interview;
    const rejected = data.rejected;
    const selected = data.selected;

    const totalFiltered = applied + interview + rejected + selected || 1;
    const pApplied = (applied / totalFiltered) * 100;
    const pInterview = (interview / totalFiltered) * 100;
    const pRejected = (rejected / totalFiltered) * 100;
    const pSelected = (selected / totalFiltered) * 100;

    const donutChart = document.querySelector(".donut-chart");
    if (donutChart) {
      donutChart.style.background = `conic-gradient(
        #5b5cff 0% ${pApplied}%,
        #3b82f6 ${pApplied}% ${pApplied + pInterview}%,
        #facc15 ${pApplied + pInterview}% ${pApplied + pInterview + pRejected}%,
        #10b981 ${pApplied + pInterview + pRejected}% 100%
      )`;
    }

    // Update Donut Legend Values
    const legendRows = document.querySelectorAll(".legend-row");
    legendRows.forEach((row) => {
      const label = row.querySelector(".legend-left").textContent.trim();
      const countEl = row.querySelector("strong");
      if (label.includes("Applied")) countEl.textContent = applied;
      if (label.includes("Interview")) countEl.textContent = interview;
      if (label.includes("Rejected")) countEl.textContent = rejected;
      if (label.includes("Selected")) countEl.textContent = selected;
    });

    // 3. Update DSA Progress Section
    const progressPercentEl = document.querySelector(".progress-percent");
    const mainProgressFill = document.querySelector(".main-progress-fill");
    const questionCountEl = document.querySelector(".question-count");

    if (progressPercentEl)
      progressPercentEl.textContent = data.dsaProgress.percentage + "%";
    if (mainProgressFill)
      mainProgressFill.style.width = data.dsaProgress.percentage + "%";
    if (questionCountEl)
      questionCountEl.textContent = `${data.dsaProgress.solvedQuestions} / ${data.dsaProgress.totalQuestions}`;

    // Normalize topics from backend for robust, case-insensitive, singular/plural matching
    const cleanTopicName = (name) => {
      let cleaned = name.toLowerCase().trim();
      // Remove trailing 's' if it exists (for singular/plural match)
      if (cleaned.endsWith("s") && cleaned.length > 1) {
        cleaned = cleaned.slice(0, -1);
      }
      // Remove spaces, hyphens, and underscores
      cleaned = cleaned.replace(/[\s\-_]/g, "");
      // Handle common abbreviations
      if (cleaned === "dp" || cleaned === "dynamicprogramming") {
        return "dynamicprogramming";
      }
      return cleaned;
    };

    const normalizedTopics = {};
    if (data.dsaProgress.topics) {
      Object.keys(data.dsaProgress.topics).forEach((key) => {
        normalizedTopics[cleanTopicName(key)] = data.dsaProgress.topics[key];
      });
    }

    // Update Topic-wise Progress
    const topicRows = document.querySelectorAll(".topic-row");
    topicRows.forEach((row) => {
      const spanEls = row.querySelectorAll("span");
      if (spanEls.length < 2) return;

      const topicName = spanEls[0].textContent.trim();
      const percentEl = spanEls[1];
      const fillBar = row.querySelector(".fill");

      const cleanedHtmlName = cleanTopicName(topicName);
      const p =
        normalizedTopics[cleanedHtmlName] !== undefined
          ? normalizedTopics[cleanedHtmlName]
          : 0;

      if (percentEl) {
        percentEl.textContent = p + "%";
      }
      if (fillBar) {
        fillBar.classList.remove(
          "fill80",
          "fill70",
          "fill60",
          "fill40",
          "fill30",
        );
        fillBar.style.width = p + "%";
      }
    });

    // 4. Update Recent Applications Table
    const recentTableBody = document.querySelector(".recent-table tbody");
    if (recentTableBody) {
      recentTableBody.innerHTML = "";
      data.recentApplications.forEach((app) => {
        const tr = document.createElement("tr");

        let statusClass = "applied";
        if (app.status.toLowerCase() === "interview") statusClass = "interview";
        if (app.status.toLowerCase() === "rejected") statusClass = "rejected";
        if (app.status.toLowerCase() === "selected") statusClass = "selected";
        if (app.status.toLowerCase() === "oa") statusClass = "applied";

        tr.innerHTML = `
          <td>${app.company}</td>
          <td>${app.role}</td>
          <td><span class="status ${statusClass}">${app.status}</span></td>
          <td>${app.date}</td>
        `;
        recentTableBody.appendChild(tr);
      });
    }
  }

  // Quick Action Buttons Actions
  const addAppBtn = document.querySelector(".action-btn.primary");
  if (addAppBtn) {
    addAppBtn.addEventListener("click", () => {
      window.location.href = "applications.html?action=add";
    });
  }

  const updateDsaBtn = document.querySelector(".action-btn.secondary");
  if (updateDsaBtn) {
    updateDsaBtn.addEventListener("click", () => {
      window.location.href = "dsa_tracker.html";
    });
  }

  const viewReportsBtn = document.querySelector(".action-btn.outline");
  const modalBackdrop = document.getElementById("reportModalBackdrop");
  const closeModalBtn = document.getElementById("closeReportModalBtn");

  if (viewReportsBtn && modalBackdrop && closeModalBtn) {
    viewReportsBtn.addEventListener("click", () => {
      if (!dashboardData) {
        alert("Dashboard data is still loading. Please try again in a moment.");
        return;
      }

      // Calculate conversion metrics
      const total = dashboardData.totalApplications || 1;
      const interviewRate =
        ((dashboardData.interview / total) * 100).toFixed(1) + "%";
      const selectionRate =
        ((dashboardData.selected / total) * 100).toFixed(1) + "%";

      // Find highest package from recent selected applications list (or default)
      let maxSelectedPkg = 0;
      if (dashboardData.recentApplications) {
        dashboardData.recentApplications.forEach((app) => {
          if (app.status === "Selected" && app.pkg) {
            const val = parseInt(app.pkg.replace(/[^0-9]/g, ""));
            if (!isNaN(val) && val > maxSelectedPkg) {
              maxSelectedPkg = val;
            }
          }
        });
      }
      const highestCTC =
        maxSelectedPkg > 0 ? `${maxSelectedPkg} LPA` : "45 LPA";

      // Set metric texts
      document.getElementById("metricInterviewRate").textContent =
        interviewRate;
      document.getElementById("metricSelectionRate").textContent =
        selectionRate;
      document.getElementById("metricHighestPackage").textContent = highestCTC;
      document.getElementById("metricDreamStatus").textContent =
        dashboardData.selected > 0 ? "Achieved" : "In Progress";

      const dreamBadge = document.getElementById("metricDreamStatus");
      if (dashboardData.selected > 0) {
        dreamBadge.className = "dream-badge";
        dreamBadge.style.background = "#dcfce7";
        dreamBadge.style.color = "#15803d";
        dreamBadge.style.borderColor = "#bbf7d0";
      } else {
        dreamBadge.className = "dream-badge";
        dreamBadge.style.background = "#f1f5f9";
        dreamBadge.style.color = "#475569";
        dreamBadge.style.borderColor = "#cbd5e1";
      }

      // Set funnel counts
      document.getElementById("funnelAppliedText").textContent =
        dashboardData.totalApplications;
      document.getElementById("funnelOaText").textContent = dashboardData.oa;
      document.getElementById("funnelInterviewText").textContent =
        dashboardData.interview;
      document.getElementById("funnelSelectedText").textContent =
        dashboardData.selected;

      // Set funnel bar widths relative to total applications
      document.getElementById("funnelAppliedBar").style.width = "100%";
      document.getElementById("funnelOaBar").style.width = `${Math.max(
        12,
        (dashboardData.oa / total) * 100,
      )}%`;
      document.getElementById("funnelInterviewBar").style.width = `${Math.max(
        12,
        (dashboardData.interview / total) * 100,
      )}%`;
      document.getElementById("funnelSelectedBar").style.width = `${Math.max(
        12,
        (dashboardData.selected / total) * 100,
      )}%`;

      // Open Modal
      modalBackdrop.classList.add("active");
    });

    closeModalBtn.addEventListener("click", () => {
      modalBackdrop.classList.remove("active");
    });

    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove("active");
      }
    });
  }

  // Logout button handler
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.removeAttribute("onclick");
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "homepage.html";
    });
  }

  // Initialize notifications dropdown
  initNotifications();
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
