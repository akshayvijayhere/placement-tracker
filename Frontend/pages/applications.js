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
    fetch("http://localhost:5001/api/profile", {
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

  let applications = [];
  let currentPage = 1;
  const pageSize = 11;

  const searchInput = document.querySelector(".search-box input");
  const filterSelects = document.querySelectorAll(".filters select");
  const statusFilter = filterSelects[0];
  const sortFilter = filterSelects[1];

  const appCountEl = document.querySelector(".app-count");
  const tableBody = document.querySelector(".applications-table tbody");

  // Form Fields
  const formCard = document.querySelector(".add-application-card");
  const formTitle = document.getElementById("formTitleHeader");
  const companyInput = document.getElementById("companyNameInput");
  const roleInput = document.getElementById("roleInput");
  const pkgInput = document.getElementById("pkgInput");
  const dateInput = document.getElementById("dateInput");
  const statusSelect = document.getElementById("statusSelect");
  const submitBtn = formCard.querySelector(".submit-btn");

  let editMode = false;
  let editId = null;

  // Instantly load cached applications if available
  const cachedApps = localStorage.getItem("cachedApplications");
  if (cachedApps) {
    try {
      applications = JSON.parse(cachedApps);
      renderTable();
    } catch (e) {
      console.error("Error parsing cached applications:", e);
    }
  }

  // Fetch applications from backend
  function fetchApplications() {
    fetch("http://localhost:5001/api/applications", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }
        return response.json();
      })
      .then((data) => {
        applications = data;
        localStorage.setItem("cachedApplications", JSON.stringify(data));
        renderTable();
      })
      .catch((err) => {
        console.error(err);
      });
  }

  // Render Table rows
  function renderTable() {
    tableBody.innerHTML = "";

    let filtered = [...applications];

    // Apply Search
    const searchVal = searchInput.value.toLowerCase().trim();
    if (searchVal) {
      filtered = filtered.filter(
        (app) =>
          app.company.toLowerCase().includes(searchVal) ||
          app.role.toLowerCase().includes(searchVal),
      );
    }

    // Apply Status Filter
    const statusVal = statusFilter.value;
    if (statusVal && statusVal !== "All Status") {
      filtered = filtered.filter((app) => app.status === statusVal);
    }

    // Apply Sort Filter
    const sortVal = sortFilter.value;
    if (sortVal === "Latest First") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortVal === "Oldest First") {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Update Overall Counts
    if (appCountEl) appCountEl.textContent = filtered.length;

    // Pagination calculation
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    // Render Rows
    pageItems.forEach((app) => {
      const tr = document.createElement("tr");

      let statusClass = "applied";
      if (app.status.toLowerCase() === "interview") statusClass = "interview";
      if (app.status.toLowerCase() === "rejected") statusClass = "rejected";
      if (app.status.toLowerCase() === "selected") statusClass = "selected";
      if (app.status.toLowerCase() === "oa") statusClass = "applied";

      tr.innerHTML = `
        <td><strong>${app.company}</strong></td>
        <td>${app.role}</td>
        <td>${app.pkg || "N/A"}</td>
        <td><span class="status ${statusClass}">${app.status}</span></td>
        <td>${app.date}</td>
        <td>
          <button class="edit-btn" data-id="${app._id}" title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="delete-btn" data-id="${app._id}" title="Delete"><i class="fa-regular fa-trash-can"></i></button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach Event Listeners to Edit and Delete Buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleEdit(btn.dataset.id));
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleDelete(btn.dataset.id));
    });

    updateSummary();
    renderPagination(totalPages);
  }

  // Render Pagination Buttons
  function renderPagination(totalPages) {
    const paginationContainer = document.querySelector(".pagination");
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "&larr;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      currentPage--;
      renderTable();
    });
    paginationContainer.appendChild(prevBtn);

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
      paginationContainer.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "&rarr;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      currentPage++;
      renderTable();
    });
    paginationContainer.appendChild(nextBtn);
  }

  // Update Application Summary Sidebar Card
  function updateSummary() {
    const counts = {
      Applied: 0,
      OA: 0,
      Interview: 0,
      Rejected: 0,
      Selected: 0,
    };
    applications.forEach((app) => {
      if (counts[app.status] !== undefined) {
        counts[app.status]++;
      }
    });

    const summaryItems = document.querySelectorAll(".summary-item");
    summaryItems.forEach((item) => {
      const label = item.querySelector(".left").textContent.trim();
      const countEl = item.querySelector("strong");
      if (label.includes("Applied")) countEl.textContent = counts.Applied;
      if (label.includes("OA")) countEl.textContent = counts.OA;
      if (label.includes("Interview")) countEl.textContent = counts.Interview;
      if (label.includes("Rejected")) countEl.textContent = counts.Rejected;
      if (label.includes("Selected")) countEl.textContent = counts.Selected;
    });
  }

  // Handle Edit Action
  function handleEdit(id) {
    const app = applications.find((a) => a._id === id);
    if (!app) return;

    editMode = true;
    editId = id;

    // Fill Form Fields
    companyInput.value = app.company;
    roleInput.value = app.role;
    pkgInput.value = app.pkg || "";
    statusSelect.value = app.status;

    // Parse date correctly
    let formattedDate = "";
    if (app.date) {
      const dateObj = new Date(app.date);
      if (!isNaN(dateObj)) {
        formattedDate = dateObj.toISOString().substring(0, 10);
      }
    }
    dateInput.value = formattedDate;

    // Update Form Styling
    formTitle.innerHTML = `<i class="fa-regular fa-pen-to-square"></i> Edit Application`;
    submitBtn.textContent = "Save Changes";
    submitBtn.style.background = "#10b981";

    formCard.scrollIntoView({ behavior: "smooth" });
  }

  // Handle Delete Action
  function handleDelete(id) {
    if (confirm("Are you sure you want to delete this application?")) {
      fetch(`http://localhost:5001/api/applications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to delete application");
          }
          localStorage.removeItem("cachedDashboardData");
          alert("Application deleted successfully!");
          fetchApplications();
          resetForm();
        })
        .catch((err) => {
          alert(err.message);
        });
    }
  }

  // Reset Form back to Add mode
  function resetForm() {
    editMode = false;
    editId = null;

    companyInput.value = "";
    roleInput.value = "";
    pkgInput.value = "";
    statusSelect.value = "Select Status";
    dateInput.value = "";

    formTitle.innerHTML = `<i class="fa-regular fa-file-lines"></i> Add New Application`;
    submitBtn.textContent = "Add Application";
    submitBtn.style.background = "#5b5cff";
  }

  // Reset Form Button handler
  const smallAddBtn = formCard.querySelector(".small-add-btn");
  if (smallAddBtn) {
    smallAddBtn.addEventListener("click", () => {
      resetForm();
    });
  }

  // Add / Save Form Submission
  submitBtn.addEventListener("click", () => {
    const company = companyInput.value.trim();
    const role = roleInput.value.trim();
    const pkg = pkgInput.value.trim();
    const status = statusSelect.value;
    let dateVal = dateInput.value;

    if (!company || !role || status === "Select Status" || !dateVal) {
      alert("Please fill in all fields (Company, Role, Status, Date).");
      return;
    }

    const dateObj = new Date(dateVal);
    const options = { day: "2-digit", month: "short", year: "numeric" };
    const formattedDate = dateObj.toLocaleDateString("en-GB", options);

    const bodyData = { company, role, pkg, status, date: formattedDate };

    if (editMode) {
      fetch(`http://localhost:5001/api/applications/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to update application");
          }
          localStorage.removeItem("cachedDashboardData");
          alert("Application updated successfully!");
          fetchApplications();
          resetForm();
        })
        .catch((err) => {
          alert(err.message);
        });
    } else {
      fetch("http://localhost:5001/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to create application");
          }
          localStorage.removeItem("cachedDashboardData");
          alert("Application added successfully!");
          fetchApplications();
          resetForm();
        })
        .catch((err) => {
          alert(err.message);
        });
    }
  });

  // Filter Listeners
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });
  statusFilter.addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });
  sortFilter.addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("action") === "add") {
    formCard.scrollIntoView({ behavior: "smooth" });
    companyInput.focus();
  }

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

  // Initial Fetch & Render
  fetchApplications();
  fetchAndRenderStreak();

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
