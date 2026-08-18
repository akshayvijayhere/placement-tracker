document.addEventListener("DOMContentLoaded", () => {
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

  fetchAndRenderStreak();

  // Handle Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.location.href = "login.html";
    });
  }

  // Global Theme Toggle
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
      showToast(isDark ? "Dark Mode Enabled 🌙" : "Light Mode Enabled ☀️");
    });
  }

  // Elements mapping
  const setupCard = document.getElementById("setupCard");
  const loaderCard = document.getElementById("loaderCard");
  const wizardCard = document.getElementById("wizardCard");
  const resultsCard = document.getElementById("resultsCard");

  const startBtn = document.getElementById("startBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const resetBtn = document.getElementById("resetBtn");

  const roleInput = document.getElementById("roleInput");
  const companyInput = document.getElementById("companyInput");
  const experienceInput = document.getElementById("experienceInput");

  const loaderText = document.getElementById("loaderText");
  const loaderProgressFill = document.getElementById("loaderProgressFill");

  const currentStepText = document.getElementById("currentStepText");
  const wizardProgressFill = document.getElementById("wizardProgressFill");
  const questionTypeBadge = document.getElementById("questionTypeBadge");
  const questionTitle = document.getElementById("questionTitle");
  const answerInput = document.getElementById("answerInput");

  const scoreNumber = document.getElementById("scoreNumber");
  const scoreRing = document.getElementById("scoreRing");
  const statusBadge = document.getElementById("statusBadge");
  const evaluationsContainer = document.getElementById("evaluationsContainer");

  // Local State
  let questions = [];
  let answers = [];
  let currentStep = 0;
  let loaderInterval = null;

  // Start generation handler
  startBtn.addEventListener("click", async () => {
    const role = roleInput.value;
    const company = companyInput.value.trim();
    const exp = experienceInput.value;

    if (!company) {
      showToast("Please enter a target company.");
      return;
    }

    // Switch view to loader
    setupCard.style.display = "none";
    loaderCard.style.display = "block";
    loaderText.textContent = "Generating custom questions...";
    animateProgressBar(15000); // Expect questions within 15 seconds

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/interview/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, company, experienceLevel: exp }),
      });

      const result = await response.json();
      stopProgressBar();

      if (result.success && result.data && result.data.questions) {
        questions = result.data.questions;
        answers = questions.map(q => ({
          questionId: q.id,
          question: q.question,
          userAnswer: ""
        }));
        
        currentStep = 0;
        loadStep(0);

        loaderCard.style.display = "none";
        wizardCard.style.display = "block";
      } else {
        showToast(result.message || "Failed to generate questions. Please try again.");
        loaderCard.style.display = "none";
        setupCard.style.display = "block";
      }
    } catch (err) {
      stopProgressBar();
      console.error(err);
      showToast("A connection error occurred. Please try again.");
      loaderCard.style.display = "none";
      setupCard.style.display = "block";
    }
  });

  // Step Loading
  function loadStep(index) {
    if (index < 0 || index >= questions.length) return;
    
    // Save current text if index changes
    if (questions[currentStep]) {
      answers[currentStep].userAnswer = answerInput.value;
    }

    currentStep = index;

    const q = questions[index];
    currentStepText.textContent = index + 1;
    questionTypeBadge.textContent = q.type || "Technical";
    questionTitle.textContent = q.question;
    answerInput.value = answers[index].userAnswer || "";

    // Calculate progress line width
    const progressPct = ((index + 1) / questions.length) * 100;
    wizardProgressFill.style.width = `${progressPct}%`;

    // Manage buttons
    prevBtn.disabled = index === 0;
    if (index === questions.length - 1) {
      nextBtn.innerHTML = `Submit Interview <i class="fa-solid fa-paper-plane"></i>`;
      nextBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
    } else {
      nextBtn.innerHTML = `Next <i class="fa-solid fa-arrow-right"></i>`;
      nextBtn.style.background = ""; // Reset to default CSS values
    }
  }

  // Previous Button
  prevBtn.addEventListener("click", () => {
    loadStep(currentStep - 1);
  });

  // Next/Submit Button
  nextBtn.addEventListener("click", async () => {
    // Validate current input answer
    const currentVal = answerInput.value.trim();
    if (!currentVal) {
      showToast("Please write down an answer before proceeding.");
      return;
    }

    // Save answer
    answers[currentStep].userAnswer = currentVal;

    if (currentStep < questions.length - 1) {
      loadStep(currentStep + 1);
    } else {
      // Final submit
      wizardCard.style.display = "none";
      loaderCard.style.display = "block";
      loaderText.textContent = "AI grading of your answers in progress...";
      animateProgressBar(20000); // Grading takes up to 20 seconds

      try {
        const role = roleInput.value;
        const company = companyInput.value.trim();
        const exp = experienceInput.value;

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/interview/evaluate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role, company, experienceLevel: exp, answers }),
        });

        const result = await response.json();
        stopProgressBar();

        if (result.success && result.data) {
          renderEvaluationResults(result.data);
          loaderCard.style.display = "none";
          resultsCard.style.display = "block";
        } else {
          showToast(result.message || "Failed to analyze responses. Please retry.");
          loaderCard.style.display = "none";
          wizardCard.style.display = "block";
        }
      } catch (err) {
        stopProgressBar();
        console.error(err);
        showToast("A server connection timeout occurred. Please retry.");
        loaderCard.style.display = "none";
        wizardCard.style.display = "block";
      }
    }
  });

  // Reset Mock
  resetBtn.addEventListener("click", () => {
    resultsCard.style.display = "none";
    setupCard.style.display = "block";
    
    // Clear state
    questions = [];
    answers = [];
    currentStep = 0;
    companyInput.value = "";
    answerInput.value = "";
  });

  // Render Evaluation Card data
  function renderEvaluationResults(data) {
    const score = data.overallScore || 0;
    scoreNumber.textContent = `${score}%`;

    // Map circular progress dash offset
    // Radius of ring is 45, circumference is 2 * PI * r = 282.74
    const circumference = 282.74;
    const offset = circumference - (score / 100) * circumference;
    scoreRing.style.strokeDashoffset = offset;

    // Render pass status
    statusBadge.textContent = data.status || "Passed";
    if (score < 50) {
      statusBadge.className = "status-badge needs-improvement";
    } else {
      statusBadge.className = "status-badge";
    }

    // Build lists
    evaluationsContainer.innerHTML = "";
    data.evaluations.forEach((evalObj, idx) => {
      const origItem = answers.find(a => a.questionId === evalObj.id) || questions[idx];
      const qText = origItem ? (origItem.question || origItem.questionText) : `Question ${idx + 1}`;
      const ansText = origItem ? origItem.userAnswer : "";

      const itemCard = document.createElement("div");
      itemCard.className = "eval-item";
      itemCard.innerHTML = `
        <div class="eval-header">
          <span class="eval-id">Question ${idx + 1}</span>
          <span class="eval-score">${evalObj.score || 0}/10</span>
        </div>
        <div class="eval-question">${qText}</div>
        <div class="eval-answer"><strong>Your answer:</strong> ${ansText}</div>
        <div class="eval-critique">${evalObj.critique}</div>
        <div class="model-answer-box">
          <div class="model-answer-header" style="cursor:pointer;" onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')">
            <i class="fa-solid fa-chevron-down"></i> Model Answer (Click to view)
          </div>
          <div class="model-answer-content" style="display:none;">${evalObj.modelAnswer}</div>
        </div>
      `;
      evaluationsContainer.appendChild(itemCard);
    });
  }

  // Loader Progress Animations
  function animateProgressBar(durationMs) {
    loaderProgressFill.style.width = "0%";
    const stepInterval = 100;
    const stepCount = durationMs / stepInterval;
    let currentStepCount = 0;

    loaderInterval = setInterval(() => {
      currentStepCount++;
      const currentProgress = (currentStepCount / stepCount) * 100;
      loaderProgressFill.style.width = `${Math.min(currentProgress, 99)}%`;

      if (currentStepCount >= stepCount) {
        clearInterval(loaderInterval);
      }
    }, stepInterval);
  }

  function stopProgressBar() {
    if (loaderInterval) {
      clearInterval(loaderInterval);
    }
    loaderProgressFill.style.width = "100%";
  }

  // Custom Toast Notifier
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
    
    toast.offsetHeight; // Reflow
    
    setTimeout(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    }, 10);
    
    if (toast.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    
    toast.timeoutId = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
    }, 3000);
  }
});
