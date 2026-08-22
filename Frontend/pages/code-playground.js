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

  // Render Streak Topbar fire icon
  function renderStreakBadge(streakCount) {
    const badge = document.getElementById("streakBadge");
    if (badge) {
      badge.querySelector(".streak-count").textContent = streakCount || 0;
      badge.style.display = "inline-flex";
    }
  }

  // Fetch user profile to render topbar fire badge
  function fetchAndRenderStreak() {
    const cachedUser = JSON.parse(localStorage.getItem("currentUser"));
    if (cachedUser && cachedUser.streakCount !== undefined) {
      renderStreakBadge(cachedUser.streakCount);
    }

    fetch(`${CONFIG.API_BASE_URL}/api/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((user) => {
        if (user && user.streakCount !== undefined) {
          renderStreakBadge(user.streakCount);
          if (cachedUser) {
            cachedUser.streakCount = user.streakCount;
            localStorage.setItem("currentUser", JSON.stringify(cachedUser));
          }
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

  // Preset Templates Mapping
  const PRESET_TEMPLATES = {
    cpp: `// Write or paste your C++ code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // your code\n    return 0;\n}`,
    java: `// Write or paste your Java code here\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // your code\n    }\n}`,
    python: `# Write or paste your Python code here\n\ndef main():\n    # your code\n    pass\n\nif __name__ == "__main__":\n    main()`,
    javascript: `// Write or paste your JavaScript code here\nfunction main() {\n    // your code\n}\nmain();`
  };

  // Elements mapping
  const languageSelect = document.getElementById("languageSelect");
  const codeTextarea = document.getElementById("codeTextarea");
  const editorLineNumbers = document.getElementById("editorLineNumbers");
  const analyzeBtn = document.getElementById("analyzeBtn");

  const loaderCard = document.getElementById("loaderCard");
  const loaderProgressFill = document.getElementById("loaderProgressFill");
  const resultsCard = document.getElementById("resultsCard");

  const timeComplexityVal = document.getElementById("timeComplexityVal");
  const spaceComplexityVal = document.getElementById("spaceComplexityVal");
  const gradeVal = document.getElementById("gradeVal");
  const critiqueVal = document.getElementById("critiqueVal");
  const bugsBlock = document.getElementById("bugsBlock");
  const bugsList = document.getElementById("bugsList");
  const optimizedCodeVal = document.getElementById("optimizedCodeVal");
  const explanationVal = document.getElementById("explanationVal");
  const copyCodeBtn = document.getElementById("copyCodeBtn");

  let loaderInterval = null;

  // Sync Gutter Line Numbers
  function syncLineNumbers() {
    const text = codeTextarea.value;
    const lines = text.split("\n");
    const count = lines.length;
    let numberList = "";
    for (let i = 1; i <= count; i++) {
      numberList += i + "\n";
    }
    editorLineNumbers.textContent = numberList;
  }

  // Align scroll levels
  codeTextarea.addEventListener("scroll", () => {
    editorLineNumbers.scrollTop = codeTextarea.scrollTop;
  });

  // Sync lines count on user typing
  codeTextarea.addEventListener("input", syncLineNumbers);

  // Template pre-population handler
  function updateTemplate() {
    const selectedLang = languageSelect.value;
    if (selectedLang) {
      codeTextarea.value = PRESET_TEMPLATES[selectedLang];
      syncLineNumbers();
    }
  }

  languageSelect.addEventListener("change", updateTemplate);

  // Load javascript by default on init
  languageSelect.value = "javascript";
  updateTemplate();

  // Code review request trigger
  analyzeBtn.addEventListener("click", async () => {
    const code = codeTextarea.value.trim();
    const language = languageSelect.options[languageSelect.selectedIndex].text;

    if (!code) {
      showToast("Please write or paste your code first.");
      return;
    }

    // Show loader
    resultsCard.style.display = "none";
    loaderCard.style.display = "block";
    animateProgressBar(15000); // 15s simulation duration

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/code/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, language, problemDescription: "" }),
      });

      const result = await response.json();
      stopProgressBar();

      if (result.success && result.data) {
        renderReviewResults(result.data);
        loaderCard.style.display = "none";
        resultsCard.style.display = "block";
        resultsCard.scrollIntoView({ behavior: "smooth" });
      } else {
        showToast(result.message || "Failed to analyze code. Please retry.");
        loaderCard.style.display = "none";
      }
    } catch (err) {
      stopProgressBar();
      console.error(err);
      showToast("Server connection error occurred. Please try again.");
      loaderCard.style.display = "none";
    }
  });

  // Clean Code Block Helper
  function cleanCodeBlock(rawCode) {
    if (!rawCode) return "";
    let code = rawCode;
    
    // Replace double-escaped newlines and tabs
    code = code.replace(/\\n/g, "\n");
    code = code.replace(/\\t/g, "  ");
    
    // Strip markdown code fences if present
    code = code.replace(/^```[a-zA-Z]*\n?/, ""); // Remove leading fence
    code = code.replace(/\n?```$/, "");         // Remove trailing fence
    
    return code.trim();
  }

  // Render Grading Results drawer
  function renderReviewResults(data) {
    timeComplexityVal.textContent = data.timeComplexity || "N/A";
    spaceComplexityVal.textContent = data.spaceComplexity || "N/A";
    gradeVal.textContent = data.grade || "N/A";
    critiqueVal.textContent = data.critique || "No review returned.";
    
    const cleanedCode = cleanCodeBlock(data.optimizedCode);
    optimizedCodeVal.textContent = cleanedCode || "// No optimized code returned.";
    explanationVal.textContent = data.explanation || "";

    // Show warnings list if bugs are found
    if (data.bugs && Array.isArray(data.bugs) && data.bugs.length > 0) {
      bugsBlock.style.display = "block";
      bugsList.innerHTML = "";
      data.bugs.forEach((bugText) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${bugText}`;
        bugsList.appendChild(li);
      });
    } else {
      bugsBlock.style.display = "none";
    }
  }

  // Copy Code Click Handler
  copyCodeBtn.addEventListener("click", () => {
    const text = optimizedCodeVal.textContent;
    navigator.clipboard.writeText(text)
      .then(() => showToast("Optimized code copied to clipboard! 📋"))
      .catch((err) => console.error("Could not copy code: ", err));
  });

  // Dynamic Loader Progress Fill animations
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

  // Custom toast popup utility
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
