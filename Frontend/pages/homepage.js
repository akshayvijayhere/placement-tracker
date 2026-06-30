document.addEventListener("DOMContentLoaded", () => {
  // Smooth scroll to anchor sections
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((link) => {
    const targetId = link.getAttribute("href");
    if (targetId && targetId.startsWith("#") && targetId !== "#") {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  });

  // Handle contact form submission
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("contact-name").value;
      const email = document.getElementById("contact-email").value;
      const message = document.getElementById("contact-message").value;

      // Visual feedback: disable submit button
      const submitBtn = contactForm.querySelector(".submit-btn");
      const originalText = submitBtn.innerText;
      submitBtn.disabled = true;
      submitBtn.innerText = "Sending...";

      // Send via Formsubmit API to user's personal email
      fetch("https://formsubmit.co/ajax/akshayvijayvargiya26@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          submitBtn.disabled = false;
          submitBtn.innerText = originalText;
          if (data.success === "true" || data.success === true) {
            alert(
              `Thank you, ${name}! Your message has been sent successfully.`,
            );
            contactForm.reset();
          } else {
            alert(
              "Oops! There was a problem sending your message. Please try again.",
            );
          }
        })
        .catch((error) => {
          console.error("Error submitting contact form:", error);
          submitBtn.disabled = false;
          submitBtn.innerText = originalText;
          alert(
            "Oops! There was a problem sending your message. Please try again.",
          );
        });
    });
  }
});
