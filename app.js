const STORAGE_KEY = "laopo-nurse-schedule-v1";
const ANNIVERSARY_KEY = "laopo-anniversaries-v1";

const shifts = {
  morning: {
    name: "早班",
    icon: "🌞",
    start: "08:00",
    end: "15:00",
    reminder: "今晚早点睡，明早记得吃早餐。",
    tone: "#fff4d8",
  },
  afternoon: {
    name: "下午班",
    icon: "🌤",
    start: "15:00",
    end: "22:00",
    reminder: "上午可以慢慢休息，出门前记得吃点东西。",
    tone: "#fff7df",
  },
  evening: {
    name: "晚班",
    icon: "🌆",
    start: "17:00",
    end: "00:00",
    reminder: "晚上回来注意安全，到家告诉我一声。",
    tone: "#f0e6ff",
  },
  night: {
    name: "夜班",
    icon: "🌙",
    start: "22:00",
    end: "次日08:00",
    reminder: "下午尽量补觉，夜班辛苦啦，下班回来早点睡。",
    tone: "#eaf4ff",
  },
  rest: {
    name: "休息",
    icon: "💤",
    reminder: "今天不要想工作，好好休息一下。",
    tone: "#eef8f1",
    isRest: true,
  },
};

const anniversaryFields = [
  { key: "loveDate", label: "恋爱纪念日", metric: "已经在一起" },
  { key: "weddingDate", label: "结婚纪念日", metric: "已经结婚" },
  { key: "wifeBirthday", label: "老婆生日" },
  { key: "husbandBirthday", label: "我的生日" },
];

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  todayCard: document.querySelector("#todayCard"),
  todayShiftIcon: document.querySelector("#todayShiftIcon"),
  todayShiftName: document.querySelector("#todayShiftName"),
  timeGrid: document.querySelector("#timeGrid"),
  startTime: document.querySelector("#startTime"),
  endTime: document.querySelector("#endTime"),
  countdownTitle: document.querySelector("#countdownTitle"),
  countdownText: document.querySelector("#countdownText"),
  reminderText: document.querySelector("#reminderText"),
  loveNote: document.querySelector("#loveNote"),
  weekList: document.querySelector("#weekList"),
  monthTitle: document.querySelector("#monthTitle"),
  monthGrid: document.querySelector("#monthGrid"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  form: document.querySelector("#scheduleForm"),
  date: document.querySelector("#scheduleDate"),
  shift: document.querySelector("#shiftSelect"),
  shiftButtons: [...document.querySelectorAll(".shift-choice")],
  saveToast: document.querySelector("#saveToast"),
  list: document.querySelector("#scheduleList"),
  todayButton: document.querySelector("#todayButton"),
  clearPastButton: document.querySelector("#clearPastButton"),
  template: document.querySelector("#scheduleItemTemplate"),
  anniversaryHighlight: document.querySelector("#anniversaryHighlight"),
  nextAnniversaryText: document.querySelector("#nextAnniversaryText"),
  loveDaysText: document.querySelector("#loveDaysText"),
  marriageDaysText: document.querySelector("#marriageDaysText"),
  editAnniversaryButton: document.querySelector("#editAnniversaryButton"),
  anniversaryForm: document.querySelector("#anniversaryForm"),
  loveDate: document.querySelector("#loveDate"),
  weddingDate: document.querySelector("#weddingDate"),
  wifeBirthday: document.querySelector("#wifeBirthday"),
  husbandBirthday: document.querySelector("#husbandBirthday"),
  photoStack: document.querySelector("#photoStack"),
  photoSlides: [...document.querySelectorAll(".photo-slide")],
  photoDots: [...document.querySelectorAll(".carousel-dots button")],
  exportButton: document.querySelector("#exportButton"),
  importButton: document.querySelector("#importButton"),
  importFile: document.querySelector("#importFile"),
  backupToast: document.querySelector("#backupToast"),
};

let schedules = loadJson(STORAGE_KEY, {});
let anniversaries = loadJson(ANNIVERSARY_KEY, {});
let calendarCursor = new Date(getToday().getFullYear(), getToday().getMonth(), 1);
let activeSlide = 0;
let slideTimer;
let touchStartX = 0;
let toastTimer;
let backupToastTimer;

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateLabel(dateKey) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(fromDateKey(dateKey));
}

function formatShortDate(dateKey) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(fromDateKey(dateKey));
}

function formatWeekday(dateKey) {
  return new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(fromDateKey(dateKey));
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveSchedules() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function saveAnniversaries() {
  localStorage.setItem(ANNIVERSARY_KEY, JSON.stringify(anniversaries));
}

function getToday() {
  return new Date();
}

function getShiftWindow(dateKey, shift) {
  const [startHour, startMinute] = shift.start.split(":").map(Number);
  const start = fromDateKey(dateKey);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(start);
  if (shift.end.startsWith("次日")) {
    const [endHour, endMinute] = shift.end.replace("次日", "").split(":").map(Number);
    end.setDate(end.getDate() + 1);
    end.setHours(endHour, endMinute, 0, 0);
  } else if (shift.end === "00:00") {
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
  } else {
    const [endHour, endMinute] = shift.end.split(":").map(Number);
    end.setHours(endHour, endMinute, 0, 0);
  }

  return { start, end };
}

function formatDuration(ms) {
  if (ms <= 0) return "现在";
  const minutes = Math.ceil(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [];

  if (days) parts.push(`${days}天`);
  if (hours) parts.push(`${hours}小时`);
  if (mins || parts.length === 0) parts.push(`${mins}分钟`);
  return parts.join(" ");
}

function daysBetween(startDate, endDate) {
  const start = fromDateKey(toDateKey(startDate));
  const end = fromDateKey(toDateKey(endDate));
  return Math.floor((end - start) / 86400000);
}

function getShift(dateKey) {
  return shifts[schedules[dateKey]];
}

function getLoveNote(shift) {
  if (!shift) return "老婆今天也要照顾好自己，有我在呢 ❤️";
  if (shift.isRest) return "今天就把工作放一边，好好睡一觉，我负责想你 ❤️";

  const notes = {
    morning: "早班辛苦啦，早餐别省，忙完早点回家休息 ❤️",
    afternoon: "下午班慢慢来，出门前吃点东西，我会惦记你 ❤️",
    evening: "晚班回来注意安全，到家告诉我一声，我等你 ❤️",
    night: "夜班最辛苦，能补觉就补觉，下班回来早点睡 ❤️",
  };

  return notes[schedules[toDateKey(getToday())]] || "老婆辛苦啦，今天也要照顾好自己 ❤️";
}

function renderToday() {
  const now = getToday();
  const todayKey = toDateKey(now);
  const shift = getShift(todayKey);

  els.todayLabel.textContent = `今天 ${formatDateLabel(todayKey)}`;

  if (!shift) {
    els.todayShiftIcon.textContent = "💤";
    els.todayShiftName.textContent = "未排班";
    els.timeGrid.classList.add("hidden");
    els.countdownTitle.textContent = "今日状态";
    els.countdownText.textContent = "还没有录入今天";
    els.reminderText.textContent = "如果今天休息，就给老婆记一个休息日吧。";
    els.loveNote.textContent = getLoveNote();
    els.todayCard.style.background = "rgba(255, 255, 255, 0.9)";
    return;
  }

  els.todayShiftIcon.textContent = shift.icon;
  els.todayShiftName.textContent = `${shift.name}`;
  els.reminderText.textContent = shift.isRest
    ? "今天好好休息，老公希望你睡个好觉 ❤️"
    : shift.reminder;
  els.loveNote.textContent = getLoveNote(shift);
  els.todayCard.style.background = `linear-gradient(180deg, ${shift.tone}, rgba(255, 255, 255, 0.94))`;

  if (shift.isRest) {
    els.timeGrid.classList.add("hidden");
    els.countdownTitle.textContent = "今日状态";
    els.countdownText.textContent = "今天休息";
    return;
  }

  const shiftWindow = getShiftWindow(todayKey, shift);
  els.timeGrid.classList.remove("hidden");
  els.startTime.textContent = shift.start;
  els.endTime.textContent = shift.end;

  if (now < shiftWindow.start) {
    els.countdownTitle.textContent = "距离上班";
    els.countdownText.textContent = formatDuration(shiftWindow.start - now);
  } else if (now <= shiftWindow.end) {
    els.countdownTitle.textContent = "当前状态";
    els.countdownText.textContent = "正在上班中";
  } else {
    els.countdownTitle.textContent = "今日状态";
    els.countdownText.textContent = "今天已下班";
  }
}

function renderWeek() {
  const today = getToday();
  const todayKey = toDateKey(today);
  els.weekList.innerHTML = "";

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(today, index);
    const dateKey = toDateKey(date);
    const shift = getShift(dateKey);
    const item = document.createElement("article");
    item.className = `week-item${dateKey === todayKey ? " today" : ""}`;
    item.innerHTML = `
      <div>
        <strong class="week-date">${formatShortDate(dateKey)}</strong>
        <span class="week-weekday">${formatWeekday(dateKey)}${index === 0 ? " · 今天" : ""}</span>
      </div>
      <div class="week-shift">
        <span>${shift?.icon || "♡"}</span>
        ${shift?.name || "未排班"}
      </div>
    `;
    els.weekList.appendChild(item);
  }
}

function renderMonth() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const todayKey = toDateKey(getToday());
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;

  els.monthTitle.textContent = formatMonthTitle(calendarCursor);
  els.monthGrid.innerHTML = "";

  for (let index = 0; index < mondayOffset; index += 1) {
    const blank = document.createElement("span");
    blank.className = "calendar-day blank";
    els.monthGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(new Date(year, month, day));
    const shift = getShift(dateKey);
    const button = document.createElement("button");
    button.className = [
      "calendar-day",
      dateKey === todayKey ? "today" : "",
      shift ? "has-shift" : "",
    ]
      .filter(Boolean)
      .join(" ");
    button.type = "button";
    button.innerHTML = `
      <span class="calendar-day-number">${day}</span>
      <span class="calendar-day-icon">${shift?.icon || "♡"}</span>
      <span class="calendar-day-name">${shift?.name || "未排"}</span>
    `;
    button.addEventListener("click", () => {
      els.date.value = dateKey;
      if (shift) setSelectedShift(schedules[dateKey]);
      showSaveToast(`已选中 ${formatDateLabel(dateKey)}`);
      document.querySelector("#scheduleForm").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    els.monthGrid.appendChild(button);
  }
}

function renderList() {
  const todayKey = toDateKey(getToday());
  const entries = Object.entries(schedules)
    .filter(([, shiftId]) => shifts[shiftId])
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  els.list.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "还没有排班";
    els.list.appendChild(empty);
    return;
  }

  entries.forEach(([dateKey, shiftId]) => {
    const item = els.template.content.firstElementChild.cloneNode(true);
    const shift = shifts[shiftId];
    const timeText = shift.isRest ? "好好休息" : `${shift.start}-${shift.end}`;
    item.dataset.date = dateKey;
    item.classList.toggle("today", dateKey === todayKey);
    item.querySelector(".item-date").textContent = formatDateLabel(dateKey);
    item.querySelector(".item-shift").textContent = `${shift.icon} ${shift.name} ${timeText}`;
    item.querySelector(".delete-button").addEventListener("click", () => {
      delete schedules[dateKey];
      saveSchedules();
      render();
    });
    els.list.appendChild(item);
  });
}

function nextAnnualDate(dateKey, todayKey) {
  const base = fromDateKey(dateKey);
  const today = fromDateKey(todayKey);
  let next = new Date(today.getFullYear(), base.getMonth(), base.getDate());

  if (next < today) {
    next = new Date(today.getFullYear() + 1, base.getMonth(), base.getDate());
  }

  return next;
}

function renderAnniversaries() {
  const today = getToday();
  const todayKey = toDateKey(today);
  const events = anniversaryFields
    .map((field) => {
      const value = anniversaries[field.key];
      if (!value) return null;
      const next = nextAnnualDate(value, todayKey);
      return {
        ...field,
        value,
        next,
        daysAway: daysBetween(today, next),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysAway - b.daysAway);

  const todayEvents = events.filter((event) => event.daysAway === 0);

  if (todayEvents.length) {
    els.anniversaryHighlight.textContent =
      "今天是我们的特别日子，谢谢你一直陪在我身边 ❤️";
  } else if (events.length) {
    const nearest = events[0];
    els.anniversaryHighlight.textContent = `${nearest.label}还有 ${nearest.daysAway} 天`;
  } else {
    els.anniversaryHighlight.textContent =
      "先设置纪念日，我会帮你们记着每一个特别日子。";
  }

  els.nextAnniversaryText.textContent = events.length
    ? `${events[0].label} · ${events[0].daysAway}天`
    : "未设置";

  els.loveDaysText.textContent = anniversaries.loveDate
    ? `${daysBetween(fromDateKey(anniversaries.loveDate), today) + 1}天`
    : "未设置";

  els.marriageDaysText.textContent = anniversaries.weddingDate
    ? `${daysBetween(fromDateKey(anniversaries.weddingDate), today) + 1}天`
    : "未设置";
}

function render() {
  renderToday();
  renderWeek();
  renderMonth();
  renderList();
  renderAnniversaries();
}

function showSlide(index) {
  activeSlide = (index + els.photoSlides.length) % els.photoSlides.length;

  els.photoSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === activeSlide);
  });

  els.photoDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === activeSlide);
  });
}

function startSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showSlide(activeSlide + 1), 4500);
}

function setupCarousel() {
  els.photoDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.slide));
      startSlideTimer();
    });
  });

  els.photoStack.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  });

  els.photoStack.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;

    if (Math.abs(deltaX) < 45) return;
    showSlide(activeSlide + (deltaX < 0 ? 1 : -1));
    startSlideTimer();
  });

  startSlideTimer();
}

function setSelectedShift(shiftId) {
  els.shift.value = shiftId;
  els.shiftButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.shift === shiftId);
  });
}

function showSaveToast(text) {
  clearTimeout(toastTimer);
  els.saveToast.textContent = text;
  toastTimer = setTimeout(() => {
    els.saveToast.textContent = "";
  }, 2600);
}

function showBackupToast(text) {
  clearTimeout(backupToastTimer);
  els.backupToast.textContent = text;
  backupToastTimer = setTimeout(() => {
    els.backupToast.textContent = "";
  }, 3000);
}

function setDefaultDate() {
  els.date.value = toDateKey(getToday());
}

function fillAnniversaryForm() {
  anniversaryFields.forEach((field) => {
    els[field.key].value = anniversaries[field.key] || "";
  });
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  schedules[els.date.value] = els.shift.value;
  saveSchedules();
  render();
  showSaveToast("已帮老婆记好啦 ❤️");
});

els.shiftButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedShift(button.dataset.shift));
});

els.todayButton.addEventListener("click", setDefaultDate);

els.prevMonthButton.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderMonth();
});

els.nextMonthButton.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderMonth();
});

els.clearPastButton.addEventListener("click", () => {
  const todayKey = toDateKey(getToday());
  schedules = Object.fromEntries(
    Object.entries(schedules).filter(([dateKey]) => dateKey >= todayKey)
  );
  saveSchedules();
  render();
});

els.editAnniversaryButton.addEventListener("click", () => {
  fillAnniversaryForm();
  els.anniversaryForm.classList.toggle("hidden");
});

els.anniversaryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  anniversaryFields.forEach((field) => {
    const value = els[field.key].value;
    if (value) {
      anniversaries[field.key] = value;
    } else {
      delete anniversaries[field.key];
    }
  });
  saveAnniversaries();
  els.anniversaryForm.classList.add("hidden");
  renderAnniversaries();
});

els.exportButton.addEventListener("click", () => {
  const payload = {
    app: "老婆护士排班助手",
    version: 1,
    exportedAt: new Date().toISOString(),
    schedules,
    anniversaries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `老婆护士排班备份-${toDateKey(getToday())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showBackupToast("备份文件已生成 ❤️");
});

els.importButton.addEventListener("click", () => {
  els.importFile.click();
});

els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files[0];
  if (!file) return;

  try {
    const content = await file.text();
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object") throw new Error("Invalid backup");
    if (!parsed.schedules || typeof parsed.schedules !== "object") {
      throw new Error("Missing schedules");
    }

    schedules = parsed.schedules;
    anniversaries =
      parsed.anniversaries && typeof parsed.anniversaries === "object"
        ? parsed.anniversaries
        : {};
    saveSchedules();
    saveAnniversaries();
    fillAnniversaryForm();
    render();
    showBackupToast("已恢复数据啦 ❤️");
  } catch {
    showBackupToast("这个备份文件好像不对");
  } finally {
    els.importFile.value = "";
  }
});

setDefaultDate();
setSelectedShift("morning");
fillAnniversaryForm();
setupCarousel();
render();
setInterval(renderToday, 30000);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
