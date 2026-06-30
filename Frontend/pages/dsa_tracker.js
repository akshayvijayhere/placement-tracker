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

  // Fetch user profile to render topbar fire badge
  function fetchAndRenderStreak() {
    fetch(`${CONFIG.API_BASE_URL}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((user) => {
        if (user && user.streakCount !== undefined) {
          renderStreakBadge(user.streakCount);
        }
      })
      .catch((err) => console.error("Error fetching streak:", err));
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

  let dsaTopics = [];
  let currentPage = 1;
  const pageSize = 8;

  // Select DOM Elements
  const searchInput = document.querySelector(".search-box input");
  const topicCountEl = document.querySelector(".topic-count");
  const tableBody = document.querySelector("table tbody");

  // Stats Elements
  const overallProgressH2 = document.querySelector(
    ".stat-card:nth-child(1) h2",
  );
  const overallProgressFill = document.querySelector(
    ".stat-card:nth-child(1) .progress-fill",
  );
  const overallProgressFooter = document.querySelector(
    ".stat-card:nth-child(1) .card-footer",
  );

  const topicsCoveredH2 = document.querySelector(".stat-card:nth-child(2) h2");
  const solvedH2 = document.querySelector(".stat-card:nth-child(3) h2");
  const remainingH2 = document.querySelector(".stat-card:nth-child(4) h2");

  // Form Elements
  // Form Elements
  const formCard = document.querySelector(".add-topic-card");
  const formTitle = formCard.querySelector("h3");
  const nameInput = document.getElementById("topicNameInput");
  const easySolvedInput = document.getElementById("easySolvedInput");
  const easyTotalInput = document.getElementById("easyTotalInput");
  const mediumSolvedInput = document.getElementById("mediumSolvedInput");
  const mediumTotalInput = document.getElementById("mediumTotalInput");
  const hardSolvedInput = document.getElementById("hardSolvedInput");
  const hardTotalInput = document.getElementById("hardTotalInput");
  const submitBtn = formCard.querySelector(".add-topic-btn");

  let editMode = false;
  let editIndex = null;

  // Instantly load cached DSA topics if available
  const cachedDsa = localStorage.getItem("cachedDsaTopics");
  if (cachedDsa) {
    try {
      dsaTopics = JSON.parse(cachedDsa);
      renderTable();
      updateStats();
    } catch (e) {
      console.error("Error parsing cached DSA topics:", e);
    }
  }

  // Fetch DSA topics from backend
  function fetchDsaTopics() {
    fetch(`${CONFIG.API_BASE_URL}/api/dsa`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch DSA topics");
        }
        return response.json();
      })
      .then((data) => {
        dsaTopics = data;
        localStorage.setItem("cachedDsaTopics", JSON.stringify(data));
        renderTable();
        updateStats();
      })
      .catch((err) => {
        console.error("Fetch error:", err);
      });
  }

  // Update Top Stats cards and Donut Overview Card
  function updateStats() {
    const totalQuestions = dsaTopics.reduce(
      (sum, t) => sum + (t.total || 0),
      0,
    );
    const solvedQuestions = dsaTopics.reduce(
      (sum, t) => sum + (t.solved || 0),
      0,
    );
    const remainingQuestions = Math.max(0, totalQuestions - solvedQuestions);
    const percentage =
      totalQuestions > 0
        ? Math.round((solvedQuestions / totalQuestions) * 100)
        : 0;
    const coveredTopics = dsaTopics.filter((t) => (t.solved || 0) > 0).length;

    // Update Top Cards
    if (overallProgressH2) overallProgressH2.textContent = percentage + "%";
    if (overallProgressFill) overallProgressFill.style.width = percentage + "%";
    if (overallProgressFooter)
      overallProgressFooter.textContent = `${solvedQuestions} / ${totalQuestions} Questions Solved`;

    if (topicsCoveredH2) topicsCoveredH2.textContent = coveredTopics;
    if (solvedH2) solvedH2.textContent = solvedQuestions;
    if (remainingH2) remainingH2.textContent = remainingQuestions;

    // Update Donut Chart in Overview Card
    const donutCenterH2 = document.querySelector(".chart-center h2");
    if (donutCenterH2) donutCenterH2.textContent = percentage + "%";

    const donutChart = document.querySelector(".donut-chart");
    if (donutChart) {
      const easySolved = dsaTopics.reduce(
        (sum, t) => sum + (t.easySolved || 0),
        0,
      );
      const mediumSolved = dsaTopics.reduce(
        (sum, t) => sum + (t.mediumSolved || 0),
        0,
      );
      const hardSolved = dsaTopics.reduce(
        (sum, t) => sum + (t.hardSolved || 0),
        0,
      );

      const totalSolved = easySolved + mediumSolved + hardSolved || 1;
      const pEasy = (easySolved / totalSolved) * 100;
      const pMedium = (mediumSolved / totalSolved) * 100;
      const pHard = (hardSolved / totalSolved) * 100;

      // Update conic-gradient for Donut Chart
      // Green (#10b981) for Easy, Yellow (#facc15) for Medium, Red (#ef4444) for Hard
      donutChart.style.background = `conic-gradient(
        #10b981 0% ${pEasy}%,
        #facc15 ${pEasy}% ${pEasy + pMedium}%,
        #ef4444 ${pEasy + pMedium}% 100%
      )`;

      // Update Legend Counts and Difficulty Names
      const legendItems = document.querySelectorAll(
        ".overview-card .legend-item",
      );
      legendItems.forEach((item, index) => {
        const spanText = item.querySelector("span");
        const strongVal = item.querySelector("strong");
        const indicator = item.querySelector(".dot");

        if (index === 0) {
          spanText.textContent = "Hard";
          strongVal.textContent = hardSolved;
          indicator.style.background = "#ef4444";
          item.style.display = "flex";
        } else if (index === 1) {
          spanText.textContent = "Medium";
          strongVal.textContent = mediumSolved;
          indicator.style.background = "#facc15";
          item.style.display = "flex";
        } else if (index === 2) {
          spanText.textContent = "Easy";
          strongVal.textContent = easySolved;
          indicator.style.background = "#10b981";
          item.style.display = "flex";
        } else {
          item.style.display = "none";
        }
      });
    }
  }

  // Render Table rows
  function renderTable() {
    tableBody.innerHTML = "";

    let filtered = [...dsaTopics];

    const searchVal = searchInput.value.toLowerCase().trim();
    if (searchVal) {
      filtered = filtered.filter((t) =>
        t.name.toLowerCase().includes(searchVal),
      );
    }

    if (topicCountEl) topicCountEl.textContent = filtered.length;

    // Pagination calculations
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    const startIdx = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(startIdx, startIdx + pageSize);

    paginated.forEach((topic) => {
      const tr = document.createElement("tr");

      const p =
        topic.total > 0 ? Math.round((topic.solved / topic.total) * 100) : 0;

      tr.innerHTML = `
        <td><strong>${topic.name}</strong></td>
        <td style="text-align: center;">
          <span style="color: #10b981; font-weight: 600;">${topic.easySolved || 0}</span> / <span style="color: #6b7280;">${topic.easyTotal || 0}</span>
        </td>
        <td style="text-align: center;">
          <span style="color: #f59e0b; font-weight: 600;">${topic.mediumSolved || 0}</span> / <span style="color: #6b7280;">${topic.mediumTotal || 0}</span>
        </td>
        <td style="text-align: center;">
          <span style="color: #ef4444; font-weight: 600;">${topic.hardSolved || 0}</span> / <span style="color: #6b7280;">${topic.hardTotal || 0}</span>
        </td>
        <td>
          <div class="table-progress">
            <div class="table-fill" style="width: ${p}%"></div>
          </div>
          <span style="font-size: 11px; margin-top: 4px; display: inline-block; color: #4b5563;">
            <strong>${topic.solved || 0}/${topic.total || 0}</strong> solved (${p}%)
          </span>
        </td>
        <td style="text-align: right; padding-right: 24px; white-space: nowrap;">
          <button class="edit-btn" data-id="${topic._id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="delete-btn" data-id="${topic._id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Render Pagination Controls
    renderPagination(filtered.length);

    // Attach Event Listeners
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleEdit(btn.dataset.id));
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDelete(btn.dataset.id));
    });
  }

  // Handle Edit click
  function handleEdit(id) {
    const topic = dsaTopics.find((t) => t._id === id);
    if (!topic) return;

    editMode = true;
    editIndex = id;

    nameInput.value = topic.name;
    easySolvedInput.value = topic.easySolved || 0;
    easyTotalInput.value = topic.easyTotal || 0;
    mediumSolvedInput.value = topic.mediumSolved || 0;
    mediumTotalInput.value = topic.mediumTotal || 0;
    hardSolvedInput.value = topic.hardSolved || 0;
    hardTotalInput.value = topic.hardTotal || 0;

    formTitle.textContent = "Edit Topic Progress";
    submitBtn.textContent = "Save Changes";
    submitBtn.style.background = "#10b981";

    formCard.scrollIntoView({ behavior: "smooth" });
  }

  // Handle Delete Click
  function handleDelete(id) {
    const topic = dsaTopics.find((t) => t._id === id);
    if (!topic) return;

    if (confirm(`Are you sure you want to delete the topic "${topic.name}"?`)) {
      fetch(`${CONFIG.API_BASE_URL}/api/dsa/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete topic");
          }
          localStorage.removeItem("cachedDashboardData");
          alert("Topic deleted successfully!");
          fetchDsaTopics();
          resetForm();
        })
        .catch((err) => {
          alert(err.message);
        });
    }
  }

  // Reset form
  function resetForm() {
    editMode = false;
    editIndex = null;

    nameInput.value = "";
    easySolvedInput.value = 0;
    easyTotalInput.value = 0;
    mediumSolvedInput.value = 0;
    mediumTotalInput.value = 0;
    hardSolvedInput.value = 0;
    hardTotalInput.value = 0;

    formTitle.textContent = "Add New Topic";
    submitBtn.textContent = "Add Topic";
    submitBtn.style.background = "#5b5cff";
  }

  // Add / Edit submission
  submitBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const easySolved = parseInt(easySolvedInput.value) || 0;
    const easyTotal = parseInt(easyTotalInput.value) || 0;
    const mediumSolved = parseInt(mediumSolvedInput.value) || 0;
    const mediumTotal = parseInt(mediumTotalInput.value) || 0;
    const hardSolved = parseInt(hardSolvedInput.value) || 0;
    const hardTotal = parseInt(hardTotalInput.value) || 0;

    if (!name) {
      alert("Please enter a valid topic name.");
      return;
    }

    if (easySolved < 0 || easySolved > easyTotal) {
      alert("Easy solved questions count must be between 0 and Easy total.");
      return;
    }
    if (mediumSolved < 0 || mediumSolved > mediumTotal) {
      alert(
        "Medium solved questions count must be between 0 and Medium total.",
      );
      return;
    }
    if (hardSolved < 0 || hardSolved > hardTotal) {
      alert("Hard solved questions count must be between 0 and Hard total.");
      return;
    }

    const totalQuestions = easyTotal + mediumTotal + hardTotal;
    if (totalQuestions <= 0) {
      alert("Total questions across all difficulties must be greater than 0.");
      return;
    }

    const payload = {
      name,
      easySolved,
      easyTotal,
      mediumSolved,
      mediumTotal,
      hardSolved,
      hardTotal,
    };

    if (editMode) {
      fetch(`${CONFIG.API_BASE_URL}/api/dsa/${editIndex}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to update topic");
          }
          localStorage.removeItem("cachedDashboardData");
          alert("Topic updated successfully!");
          fetchDsaTopics();
          resetForm();
        })
        .catch((err) => {
          alert(err.message);
        });
    } else {
      fetch(`${CONFIG.API_BASE_URL}/api/dsa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.message || "Failed to add topic");
            });
          }
          localStorage.removeItem("cachedDashboardData");
          alert("Topic added successfully!");
          fetchDsaTopics();
          resetForm();
        })
        .catch((err) => {
          alert(err.message);
        });
    }
  });

  // Reset Form Button handler
  const smallAddBtn = formCard.querySelector(".small-add-btn");
  if (smallAddBtn) {
    smallAddBtn.addEventListener("click", () => {
      resetForm();
    });
  }

  // Search input listener
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
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

  // Initial render & fetch
  fetchDsaTopics();
  fetchAndRenderStreak();

  // Initialize notifications dropdown
  initNotifications();

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

  // Render dynamic pagination buttons
  function renderPagination(totalItems) {
    const pagContainer = document.getElementById("dsaPagination");
    if (!pagContainer) return;
    pagContainer.innerHTML = "";

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "&larr;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
    pagContainer.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.textContent = i;
      if (i === currentPage) {
        pageBtn.className = "active-page";
      }
      pageBtn.addEventListener("click", () => {
        currentPage = i;
        renderTable();
      });
      pagContainer.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "&rarr;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });
    pagContainer.appendChild(nextBtn);
  }
});
