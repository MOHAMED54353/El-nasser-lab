// ================== إعدادات (غيّر من هنا) ==================

// رقم واتساب المعمل بالصيغة الدولية (من غير + ومن غير صفر في الأول)
const WHATSAPP_NUMBER = "201044321689";

const DAYS_TO_SHOW = 5; // عدد الأيام اللي تظهر في القايمة
const OFF_DAY = 5; // يوم الإجازة (0 = الأحد ... 5 = الجمعة)
const FIRST_HOUR = 11; // أول ساعة (11 صباحًا)
const LAST_HOUR = 20; // آخر ساعة حجز (8 مساءً)

// ================== العناصر ==================

const form = document.getElementById("booking-form");
const addressField = document.getElementById("address-field");
const addressInput = document.getElementById("address");
const dateSelect = document.getElementById("date");
const timeSelect = document.getElementById("time");
const statusBox = document.getElementById("form-status");

const testsList = document.getElementById("tests-list");
const testsSearch = document.getElementById("tests-search");
const testsSelected = document.getElementById("tests-selected");
const testsChips = document.getElementById("tests-chips");
const testsCount = document.getElementById("tests-count");

// ================== أدوات صغيرة ==================

function toISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// تبسيط النص العربي عشان البحث يلاقي (أ/ا، ة/ه، ى/ي، التشكيل)
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function showError(name, message) {
  const el = form.querySelector(`[data-error-for="${name}"]`);
  if (el) el.textContent = message;

  const input = form.elements[name];
  if (input && input.setAttribute) {
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }
}

// ================== التحاليل ==================

function renderTests() {
  const groups = [...new Set(TESTS.map((t) => t.group))];

  testsList.innerHTML =
    groups
      .map((g) => {
        const items = TESTS.filter((t) => t.group === g)
          .map(
            (t) => `
          <label class="check" data-search="${normalize(`${t.name} ${t.en || ""}`)}">
            <input type="checkbox" name="tests" value="${t.id}" />
            <span>${t.name}${t.en ? ` <small>${t.en}</small>` : ""}</span>
          </label>`,
          )
          .join("");

        return `
        <div class="test-group">
          <h4 class="test-group__title">${g}</h4>
          <div class="checks">${items}</div>
        </div>`;
      })
      .join("") +
    `<p class="tests-empty" hidden>مفيش تحليل بالاسم ده — اكتبه في الخانة اللي تحت.</p>`;
}

function filterTests() {
  const q = normalize(testsSearch.value);
  let visible = 0;

  testsList.querySelectorAll(".test-group").forEach((group) => {
    let groupVisible = 0;
    group.querySelectorAll(".check").forEach((item) => {
      const show = !q || item.dataset.search.includes(q);
      item.hidden = !show;
      if (show) groupVisible++;
    });
    group.hidden = groupVisible === 0;
    visible += groupVisible;
  });

  testsList.querySelector(".tests-empty").hidden = visible !== 0;
}

function getSelectedTests() {
  const ids = [...testsList.querySelectorAll("input:checked")].map(
    (i) => i.value,
  );
  return TESTS.filter((t) => ids.includes(t.id));
}

function updateSelected() {
  const selected = getSelectedTests();

  testsSelected.hidden = selected.length === 0;
  testsCount.textContent =
    selected.length === 1 ? "تحليل واحد" : `${selected.length} تحاليل`;

  testsChips.innerHTML = selected
    .map(
      (t) => `
      <button type="button" class="chip" data-id="${t.id}" aria-label="شيل ${t.name}">
        ${t.name}
        <span class="chip__x" aria-hidden="true">×</span>
      </button>`,
    )
    .join("");
}

renderTests();

testsSearch.addEventListener("input", filterTests);

testsList.addEventListener("change", () => {
  updateSelected();
  showError("tests", "");
});

testsChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const box = testsList.querySelector(`input[value="${chip.dataset.id}"]`);
  if (box) box.checked = false;
  updateSelected();
});

// اختيار تحليل جاهز من الرابط: booking.html?test=cbc
const preselected = new URLSearchParams(location.search).get("test");
if (preselected) {
  const box = testsList.querySelector(`input[value="${preselected}"]`);
  if (box) box.checked = true;
  updateSelected();
}

// ================== نوع الخدمة / العنوان ==================

function getService() {
  return form.querySelector('input[name="service"]:checked').value;
}

function toggleAddress() {
  const isHome = getService() === "home";
  addressField.hidden = !isHome;
  addressInput.required = isHome;
  if (!isHome) showError("address", "");
}

form
  .querySelectorAll('input[name="service"]')
  .forEach((r) => r.addEventListener("change", toggleAddress));

// booking.html?service=home بيختار السحب من البيت تلقائي
if (new URLSearchParams(location.search).get("service") === "home") {
  form.querySelector('input[name="service"][value="home"]').checked = true;
}
toggleAddress();

// ================== الأيام والساعات ==================

const dayFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function buildDays() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // لو اليوم خلص (بعد آخر ساعة) نبدأ من بكرة
  if (now.getHours() >= LAST_HOUR) d.setDate(d.getDate() + 1);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = [];

  while (days.length < DAYS_TO_SHOW) {
    if (d.getDay() !== OFF_DAY) {
      const diff = Math.round((d - today) / 86400000);
      const prefix = diff === 0 ? "النهاردة — " : diff === 1 ? "بكرة — " : "";
      days.push({ value: toISO(d), label: prefix + dayFormatter.format(d) });
    }
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function hourLabel(h) {
  const h12 = h > 12 ? h - 12 : h;
  return `${h12}:00 ${h < 12 ? "ص" : "م"}`;
}

function buildTimes() {
  const previous = timeSelect.value;
  const now = new Date();
  const isToday = dateSelect.value === toISO(now);

  timeSelect.innerHTML = '<option value="">اختار الساعة</option>';

  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    const opt = new Option(hourLabel(h), hourLabel(h));
    // لو النهاردة: الساعات اللي عدّت متتاحش
    if (isToday && h <= now.getHours()) opt.disabled = true;
    timeSelect.add(opt);
  }

  const stillValid = [...timeSelect.options].some(
    (o) => o.value === previous && !o.disabled,
  );
  if (previous && stillValid) timeSelect.value = previous;
}

buildDays().forEach((d) => dateSelect.add(new Option(d.label, d.value)));
buildTimes();
dateSelect.addEventListener("change", buildTimes);

// ================== التحقق ==================

function validate() {
  let firstInvalid = null;
  const fail = (name, message, focusEl) => {
    showError(name, message);
    if (!firstInvalid) firstInvalid = focusEl || form.elements[name];
  };

  ["name", "phone", "tests", "address", "date", "time"].forEach((n) =>
    showError(n, ""),
  );

  if (form.elements.name.value.trim().length < 3) {
    fail("name", "اكتب اسمك بالكامل");
  }

  // أرقام مصرية: 010 / 011 / 012 / 015 + 8 أرقام
  if (!/^01[0125]\d{8}$/.test(form.elements.phone.value.trim())) {
    fail("phone", "اكتب رقم موبايل مصري صحيح (11 رقم)");
  }

  const hasOther = form.elements["other-tests"].value.trim() !== "";
  if (getSelectedTests().length === 0 && !hasOther) {
    fail(
      "tests",
      "اختار تحليل واحد على الأقل أو اكتبه في الخانة اللي تحت",
      testsSearch,
    );
  }

  if (getService() === "home" && addressInput.value.trim().length < 8) {
    fail("address", "اكتب العنوان بالتفصيل عشان المندوب يوصلك");
  }

  if (!dateSelect.value) fail("date", "اختار اليوم");
  if (!timeSelect.value) fail("time", "اختار الساعة");

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

// ================== رسالة الواتساب ==================

function buildMessage() {
  const tests = getSelectedTests().map(
    (t) => `• ${t.name}${t.en ? ` (${t.en})` : ""}`,
  );

  const other = form.elements["other-tests"].value.trim();
  if (other) tests.push(`• ${other}`);

  const isHome = getService() === "home";
  const notes = form.elements.notes.value.trim();
  const dayLabel = dateSelect.options[dateSelect.selectedIndex].text;

  const lines = [
    "*طلب حجز جديد — النصر للتحاليل الطبية*",
    "",
    `*الاسم:* ${form.elements.name.value.trim()}`,
    `*الموبايل:* ${form.elements.phone.value.trim()}`,
    "",
    "*التحاليل المطلوبة:*",
    ...tests,
    "",
    `*الخدمة:* ${isHome ? "سحب عينة من المنزل" : "زيارة الفرع"}`,
  ];

  if (isHome) lines.push(`*العنوان:* ${addressInput.value.trim()}`);

  lines.push(`*الموعد:* ${dayLabel} — الساعة ${timeSelect.value}`);

  if (notes) lines.push("", `*ملاحظات:* ${notes}`);

  return lines.join("\n");
}

// ================== الإرسال ==================

form.addEventListener("submit", (e) => {
  e.preventDefault();
  statusBox.hidden = true;

  if (!validate()) return;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;

  // لو المتصفح منع النافذة الجديدة نفتح في نفس التبويب
  const win = window.open(url, "_blank", "noopener");
  if (!win) window.location.href = url;

  statusBox.innerHTML =
    `اتفتح الواتساب برسالة جاهزة، دوس <strong>إرسال</strong> هناك عشان الطلب يوصل للمعمل.<br />` +
    `لو ماتفتحش، <a href="${url}" target="_blank" rel="noopener">دوس هنا</a>.`;
  statusBox.hidden = false;
  statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// شيل رسالة الخطأ أول ما العميل يبدأ يصلّح
form.addEventListener("input", (e) => {
  const n = e.target.name;
  if (n === "other-tests") showError("tests", "");
  else if (n && n !== "tests") showError(n, "");
});
