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

  const token = localStorage.getItem("token");
  const currentUserStr = localStorage.getItem("currentUser");

  // Redirect to login if not authenticated
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Initialize Header and Sidebar user information
  if (currentUser) {
    const avatarEl = document.querySelector(".topbar-right .avatar");
    const mobileAvatarEl = document.getElementById("mobileAvatar");
    
    const updateAvatar = (el) => {
      if (el) {
        if (currentUser.profileImage) {
          el.style.backgroundImage = `url(${currentUser.profileImage})`;
          el.style.backgroundColor = "transparent";
          el.innerHTML = "";
        } else {
          el.style.backgroundImage = "none";
          el.style.backgroundColor = "var(--primary-color)";
          el.style.color = "white";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontWeight = "bold";
          el.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U";
        }
      }
    };
    
    updateAvatar(avatarEl);
    updateAvatar(mobileAvatarEl);
  }

  fetchAndRenderStreak();

  // Handle Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "homepage.html";
    });
  }

  // Initialize Theme (Dark/Light mode)
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const savedTheme = localStorage.getItem("theme") || "light";
  
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

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

  // Mobile Navbar Handlers (uses existing mobile-nav.js triggers, linking sidebar bindings)
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebarClose = document.getElementById("sidebarClose");

  if (menuToggle && sidebar && sidebarOverlay) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
    });
  }

  if (sidebarClose && sidebar && sidebarOverlay) {
    sidebarClose.addEventListener("click", () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      if (sidebar) sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
    });
  }

  // File Upload and Textarea Setup variables
  const uploadZone = document.getElementById("uploadZone");
  const fileInput = document.getElementById("resumeFileInput");
  const fileInfoText = document.getElementById("fileInfoText");
  const jdTextArea = document.getElementById("jdTextArea");
  const analyzeBtn = document.getElementById("analyzeBtn");

  let selectedResumeBase64 = null;

  // Drag and Drop listeners
  if (uploadZone && fileInput) {
    uploadZone.addEventListener("click", () => {
      fileInput.click();
    });

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });

    uploadZone.addEventListener("dragleave", () => {
      uploadZone.classList.remove("dragover");
    });

    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  function handleFileSelection(file) {
    if (file.type !== "application/pdf") {
      showToast("Only PDF resumes are supported currently.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("File size should not exceed 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      selectedResumeBase64 = reader.result;
      fileInfoText.textContent = `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      checkFormValidity();
    };
    reader.onerror = () => {
      showToast("Failed to read the file. Please try again.");
    };
  }

  if (jdTextArea) {
    jdTextArea.addEventListener("input", checkFormValidity);
  }

  function checkFormValidity() {
    const jdVal = jdTextArea ? jdTextArea.value.trim() : "";
    if (selectedResumeBase64 && jdVal.length > 20) {
      analyzeBtn.disabled = false;
    } else {
      analyzeBtn.disabled = true;
    }
  }

  // Submit / Analysis execution
  const resultsSection = document.getElementById("resultsSection");
  const resultsLoader = document.getElementById("resultsLoader");
  const resultsContent = document.getElementById("resultsContent");
  const loaderProgressFill = document.getElementById("loaderProgressFill");

  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", () => {
      const jd = jdTextArea.value.trim();
      if (!selectedResumeBase64 || !jd) return;

      // Show loader cards
      resultsSection.style.display = "block";
      resultsLoader.style.display = "flex";
      resultsContent.style.display = "none";
      analyzeBtn.disabled = true;

      // Scroll results card into view on mobile
      resultsSection.scrollIntoView({ behavior: "smooth" });

      // Simulate loader progress
      let progress = 0;
      loaderProgressFill.style.width = "0%";
      const progressInterval = setInterval(() => {
        if (progress < 90) {
          progress += Math.floor(Math.random() * 8) + 2;
          if (progress > 90) progress = 90;
          loaderProgressFill.style.width = `${progress}%`;
        }
      }, 350);

      // Trigger HTTP request to API backend
      fetch(`${CONFIG.API_BASE_URL}/api/resume/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeBase64: selectedResumeBase64,
          jobDescription: jd
        })
      })
        .then((res) => {
          clearInterval(progressInterval);
          if (!res.ok) {
            return res.json().then((err) => {
              throw new Error(err.message || "Failed to analyze resume.");
            });
          }
          return res.json();
        })
        .then((data) => {
          loaderProgressFill.style.width = "100%";
          setTimeout(() => {
            resultsLoader.style.display = "none";
            resultsContent.style.display = "block";
            renderAnalysisReport(data.data);
            analyzeBtn.disabled = false;
          }, 300);
        })
        .catch((err) => {
          clearInterval(progressInterval);
          resultsLoader.style.display = "none";
          resultsSection.style.display = "none";
          analyzeBtn.disabled = false;
          showToast(err.message || "An error occurred. Please try again.");
        });
    });
  }

  function renderAnalysisReport(report) {
    const scoreVal = report.matchPercentage || 0;
    const status = report.status || "Needs Improvement";

    // 1. Radial match score rendering
    const scoreRing = document.getElementById("scoreRing");
    const scoreNumber = document.getElementById("scoreNumber");
    scoreNumber.textContent = `${scoreVal}%`;
    
    // SVG radial stroke offset calculation (radius is 45, circumference is 2 * PI * 45 = 283)
    const offset = 283 - (283 * scoreVal) / 100;
    scoreRing.style.strokeDashoffset = offset;

    // 2. Status badge rendering
    const statusBadge = document.getElementById("statusBadge");
    statusBadge.textContent = status;
    statusBadge.className = "status-badge"; // Reset classes
    
    const formattedStatus = status.toLowerCase().replace(" ", "-");
    statusBadge.classList.add(formattedStatus);

    const scoreExplanation = document.getElementById("scoreExplanation");
    if (scoreVal >= 85) {
      scoreExplanation.textContent = "Excellent match! Your resume contains the critical keywords and experience metrics required for this role.";
    } else if (scoreVal >= 70) {
      scoreExplanation.textContent = "Good match. Your resume aligns well, but adding a few missing technical keywords will improve search ranking.";
    } else if (scoreVal >= 50) {
      scoreExplanation.textContent = "Moderate match. Significant gaps detected. We recommend optimizing your skills and project descriptions below.";
    } else {
      scoreExplanation.textContent = "Weak match. The resume lacks core requirements. Consider major changes or tailoring sections for this job description.";
    }

    // 3. Matched vs Missing Keywords
    const matchedCount = document.getElementById("matchedCount");
    const matchedContainer = document.getElementById("matchedKeywordsContainer");
    matchedContainer.innerHTML = "";
    const matched = report.matchedKeywords || [];
    matchedCount.textContent = matched.length;
    
    if (matched.length === 0) {
      matchedContainer.innerHTML = `<span class="text-muted" style="font-size:0.85rem;">None identified.</span>`;
    } else {
      matched.forEach(kw => {
        const span = document.createElement("span");
        span.className = "keyword-tag";
        span.textContent = kw;
        matchedContainer.appendChild(span);
      });
    }

    const missingCount = document.getElementById("missingCount");
    const missingContainer = document.getElementById("missingKeywordsContainer");
    missingContainer.innerHTML = "";
    const missing = report.missingKeywords || [];
    missingCount.textContent = missing.length;
    
    if (missing.length === 0) {
      missingContainer.innerHTML = `<span class="text-muted" style="font-size:0.85rem;">No missing keywords detected! Good job.</span>`;
    } else {
      missing.forEach(kw => {
        const span = document.createElement("span");
        span.className = "keyword-tag";
        span.textContent = kw;
        missingContainer.appendChild(span);
      });
    }

    // 4. Strengths & Weaknesses
    const strengthsList = document.getElementById("strengthsList");
    strengthsList.innerHTML = "";
    const strengths = report.strengths || [];
    if (strengths.length === 0) strengths.push("Foundational skills aligned.");
    strengths.forEach(str => {
      const li = document.createElement("li");
      li.textContent = str;
      strengthsList.appendChild(li);
    });

    const weaknessesList = document.getElementById("weaknessesList");
    weaknessesList.innerHTML = "";
    const weaknesses = report.weaknesses || [];
    if (weaknesses.length === 0) weaknesses.push("No major gaps detected.");
    weaknesses.forEach(wk => {
      const li = document.createElement("li");
      li.textContent = wk;
      weaknessesList.appendChild(li);
    });

    // 5. Section suggestions
    const suggestionsContainer = document.getElementById("suggestionsContainer");
    suggestionsContainer.innerHTML = "";
    const suggestions = report.suggestions || [];
    
    if (suggestions.length === 0) {
      suggestionsContainer.innerHTML = `<p class="subtitle" style="margin: 0;">No suggestions needed. Your formatting and structure look clean!</p>`;
    } else {
      suggestions.forEach(item => {
        const sDiv = document.createElement("div");
        sDiv.className = "suggestion-item";
        sDiv.innerHTML = `
          <div class="suggestion-header">
            <span class="suggestion-section-name">${item.section || "General"}</span>
          </div>
          <div class="suggestion-finding">${item.finding}</div>
          <div class="suggestion-recommendation">${item.recommendation}</div>
        `;
        suggestionsContainer.appendChild(sDiv);
      });
    }

    // 6. Optimized Bullet Points
    const editsContainer = document.getElementById("editsContainer");
    editsContainer.innerHTML = "";
    const bulletEdits = report.bulletPointEdits || [];
    
    if (bulletEdits.length === 0) {
      editsContainer.innerHTML = `<p class="subtitle" style="margin: 0;">No specific bullet point changes required. Experience matches target keywords.</p>`;
    } else {
      bulletEdits.forEach(item => {
        const eDiv = document.createElement("div");
        eDiv.className = "edit-item";
        eDiv.innerHTML = `
          <div class="edit-label">Original version</div>
          <div class="edit-text original">${item.original}</div>
          <div class="edit-label">Suggested ATS-optimized version</div>
          <div class="edit-text optimized">${item.optimized}</div>
          <div class="edit-reason"><strong>Reason:</strong> ${item.reason}</div>
        `;
        editsContainer.appendChild(eDiv);
      });
    }
  }

  // Handle Reset button
  const reAnalyzeBtn = document.getElementById("reAnalyzeBtn");
  if (reAnalyzeBtn) {
    reAnalyzeBtn.addEventListener("click", () => {
      // Clear data
      selectedResumeBase64 = null;
      if (fileInput) fileInput.value = "";
      if (fileInfoText) fileInfoText.textContent = "";
      if (jdTextArea) jdTextArea.value = "";
      
      // Toggle views
      resultsSection.style.display = "none";
      resultsContent.style.display = "none";
      resultsLoader.style.display = "none";
      
      checkFormValidity();
      showToast("Form cleared. Ready for new analysis.");
    });
  }

  // Toast helper
  function showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
