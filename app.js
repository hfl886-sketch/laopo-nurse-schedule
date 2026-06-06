const STORAGE_KEY = "laopo-nurse-schedule-v1";

const shifts = {
  morning: {
    name: "早班",
    start: "08:00",
    end: "15:00",
    reminder: "记得早点睡，明早吃点热乎早餐再出门。",
    tone: "#fff0f4",
  },
  afternoon: {
    name: "下午班",
    start: "15:00",
    end: "22:00",
    reminder: "午餐安排好一点，下午上班才有力气。",
    tone: "#fff7df",
  },
  evening: {
    name: "晚班",
    start: "17:00",
    end: "00:00",
    reminder: "晚上下班注意安全，到家记得报个平安。",
    tone: "#f0e6ff",
  },
  night: {
    name: "夜班",
    start: "22:00",
    end: "次日08:00",
    reminder: "下午补补觉，夜班辛苦了，下班早点睡。",
    tone: "#eaf4ff",
  },
};

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  todayCard: document.querySelector("#todayCard"),
  todayShiftName: document.querySelector("#todayShiftName"),
  startTime: document.querySelector("#startTime"),
  endTime: document.querySelector("#endTime"),
  countdownTitle: document.querySelector("#countdownTitle"),
  countdownText: document.querySelector("#countdownText"),
  reminderText: document.querySelector("#reminderText"),
  form: document.querySelector("#scheduleForm"),
  date: document.querySelector("#scheduleDate"),
  shift: document.querySelector("#shiftSelect"),
  list: document.querySelector("#scheduleList"),
  todayButton: document.querySelector("#todayButton"),
  clearPastButton: document.querySelector("#clearPastButton"),
  template: document.querySelector("#scheduleItemTemplate"),
};

let schedules = loadSchedules();

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function loadSchedules() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSchedules() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

function getToday() {
  return new Date();
}

function getShiftWindow(dateKey, shift) {
  const [startHour, startMinute] = shift.start.split(":").map(Number);
  const start = new Date(`${dateKey}T00:00:00`);
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

function renderToday() {
  const now = getToday();
  const todayKey = toDateKey(now);
  const shiftId = schedules[todayKey];
  const shift = shifts[shiftId];

  els.todayLabel.textContent = `今天 ${formatDateLabel(todayKey)}`;

  if (!shift) {
    els.todayShiftName.textContent = "未排班";
    els.startTime.textContent = "--:--";
    els.endTime.textContent = "--:--";
    els.countdownTitle.textContent = "今日状态";
    els.countdownText.textContent = "今天没有排班";
    els.reminderText.textContent = "没有排班也要好好吃饭，好好休息。";
    els.todayCard.style.background = "rgba(255, 255, 255, 0.86)";
    return;
  }

  const window = getShiftWindow(todayKey, shift);
  els.todayShiftName.textContent = shift.name;
  els.startTime.textContent = shift.start;
  els.endTime.textContent = shift.end;
  els.reminderText.textContent = shift.reminder;
  els.todayCard.style.background = `linear-gradient(180deg, ${shift.tone}, rgba(255, 255, 255, 0.92))`;

  if (now < window.start) {
    els.countdownTitle.textContent = "距离上班";
    els.countdownText.textContent = formatDuration(window.start - now);
  } else if (now <= window.end) {
    els.countdownTitle.textContent = "当前状态";
    els.countdownText.textContent = "正在上班中";
  } else {
    els.countdownTitle.textContent = "今日状态";
    els.countdownText.textContent = "今天已下班";
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
    item.dataset.date = dateKey;
    item.classList.toggle("today", dateKey === todayKey);
    item.querySelector(".item-date").textContent = formatDateLabel(dateKey);
    item.querySelector(".item-shift").textContent = `${shift.name} ${shift.start}-${shift.end}`;
    item.querySelector(".delete-button").addEventListener("click", () => {
      delete schedules[dateKey];
      saveSchedules();
      render();
    });
    els.list.appendChild(item);
  });
}

function render() {
  renderToday();
  renderList();
}

function setDefaultDate() {
  els.date.value = toDateKey(getToday());
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  schedules[els.date.value] = els.shift.value;
  saveSchedules();
  render();
});

els.todayButton.addEventListener("click", setDefaultDate);

els.clearPastButton.addEventListener("click", () => {
  const todayKey = toDateKey(getToday());
  schedules = Object.fromEntries(
    Object.entries(schedules).filter(([dateKey]) => dateKey >= todayKey)
  );
  saveSchedules();
  render();
});

setDefaultDate();
render();
setInterval(renderToday, 30000);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
