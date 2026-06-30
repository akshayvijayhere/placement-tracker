document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebar = document.querySelector(".sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.add("active");
      if (sidebarOverlay) sidebarOverlay.classList.add("active");
    });
  }

  const closeMenu = () => {
    if (sidebar) sidebar.classList.remove("active");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");
  };

  if (sidebarClose) {
    sidebarClose.addEventListener("click", closeMenu);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeMenu);
  }

  // Update mobile topbar avatar from localStorage if available
  const mobileAvatar = document.getElementById("mobileAvatar");
  if (mobileAvatar) {
    const userJson = localStorage.getItem("currentUser");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user && user.profileImage) {
          mobileAvatar.innerHTML = `<img src="${user.profileImage}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
        }
      } catch (e) {
        console.error(e);
      }
    }

    mobileAvatar.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }
});
