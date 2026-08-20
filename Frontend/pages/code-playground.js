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

  // Preset Problems Mapping
  const PRESET_PROBLEMS = {
    custom: {
      description: "",
      templates: {
        cpp: "// Write your custom C++ solution here...\n",
        java: "// Write your custom Java solution here...\n",
        python: "# Write your custom Python solution here...\n",
        javascript: "// Write your custom JavaScript solution here...\n"
      }
    },
    twoSum: {
      description: "Given an array of integers 'nums' and an integer 'target', return indices of the two numbers such that they add up to 'target'.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
      templates: {
        cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        \n    }\n};`,
        java: `import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[0];\n    }\n}`,
        python: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your code here\n        pass`,
        javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your code here\n    \n}`
      }
    },
    validParens: {
      description: "Given a string 's' containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.",
      templates: {
        cpp: `#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Write your code here\n        \n    }\n};`,
        java: `import java.util.*;\n\nclass Solution {\n    public boolean isValid(String s) {\n        // Write your code here\n        return false;\n    }\n}`,
        python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Write your code here\n        pass`,
        javascript: `/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isValid(s) {\n    // Write your code here\n    \n}`
      }
    },
    reverseList: {
      description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
      templates: {
        cpp: `/**\n * Definition for singly-linked list.\n * struct ListNode {\n *     int val;\n *     ListNode *next;\n *     ListNode() : val(0), next(nullptr) {}\n *     ListNode(int x) : val(x), next(nullptr) {}\n *     ListNode(int x, ListNode *next) : val(x), next(next) {}\n * };\n */\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your code here\n        \n    }\n};`,
        java: `/**\n * Definition for singly-linked list.\n * public class ListNode {\n *     int val;\n *     ListNode next;\n *     ListNode() {}\n *     ListNode(int val) { this.val = val; }\n *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n * }\n */\nclass Solution {\n    public ListNode reverseList(ListNode head) {\n        // Write your code here\n        return null;\n    }\n}`,
        python: `# Definition for singly-linked list.\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\nclass Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        # Write your code here\n        pass`,
        javascript: `/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *     this.val = (val===undefined ? 0 : val)\n *     this.next = (next===undefined ? null : next)\n * }\n */\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nfunction reverseList(head) {\n    // Write your code here\n    \n}`
      }
    },
    maxSubarray: {
      description: "Given an integer array 'nums', find the subarray with the largest sum, and return its sum.",
      templates: {
        cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your code here\n        \n    }\n};`,
        java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your code here\n        return 0;\n    }\n}`,
        python: `class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        # Write your code here\n        pass`,
        javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction maxSubArray(nums) {\n    // Write your code here\n    \n}`
      }
    }
  };

  // Elements mapping
  const problemPreset = document.getElementById("problemPreset");
  const languageSelect = document.getElementById("languageSelect");
  const problemDescription = document.getElementById("problemDescription");
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
    const selectedProblem = problemPreset.value;
    const selectedLang = languageSelect.value;
    
    if (selectedProblem && selectedLang) {
      const data = PRESET_PROBLEMS[selectedProblem];
      if (selectedProblem !== "custom") {
        problemDescription.value = data.description;
      }
      codeTextarea.value = data.templates[selectedLang];
      syncLineNumbers();
    }
  }

  problemPreset.addEventListener("change", updateTemplate);
  languageSelect.addEventListener("change", updateTemplate);

  // Load Two Sum by default on init
  problemPreset.value = "twoSum";
  languageSelect.value = "javascript";
  updateTemplate();

  // Code review request trigger
  analyzeBtn.addEventListener("click", async () => {
    const code = codeTextarea.value.trim();
    const language = languageSelect.options[languageSelect.selectedIndex].text;
    const desc = problemDescription.value.trim();

    if (!code) {
      showToast("Please write or paste your code first.");
      return;
    }
    if (!desc) {
      showToast("Please enter the problem description.");
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
        body: JSON.stringify({ code, language, problemDescription: desc }),
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

  // Render Grading Results drawer
  function renderReviewResults(data) {
    timeComplexityVal.textContent = data.timeComplexity || "N/A";
    spaceComplexityVal.textContent = data.spaceComplexity || "N/A";
    gradeVal.textContent = data.grade || "N/A";
    critiqueVal.textContent = data.critique || "No review returned.";
    optimizedCodeVal.textContent = data.optimizedCode || "// No optimized code returned.";
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
