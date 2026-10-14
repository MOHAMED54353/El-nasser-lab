const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("main-nav");
const navLinks = document.querySelectorAll(".nav__link");

// فتح / قفل القايمة في الموبايل
function setMenu(open) {
  nav.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
}

menuToggle.addEventListener("click", () => {
  setMenu(!nav.classList.contains("is-open"));
});

// قفل القايمة بزرار Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

// قفل القايمة لما تدوس على أي رابط
navLinks.forEach((link) =>
  link.addEventListener("click", () => setMenu(false)),
);

// تمييز الصفحة الحالية في الناف بار
const currentPage = location.pathname.split("/").pop() || "index.html";
navLinks.forEach((link) => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
});
