/* =========================================================
   MAMA'S DAILY PLANNER
   Semua fitur interaktif ada di file ini.
   Data disimpan di browser menggunakan localStorage.
   ========================================================= */

const STORAGE_KEY = "mamaDailyPlanner_v1";
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const formatDate = (dateString, options = { day: "numeric", month: "short", year: "numeric" }) => {
  if (!dateString) return "";
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", options);
};
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const demoData = () => ({
  settings: {
    name: "Mom",
    message: "May today bring you little moments of joy. Don’t forget to save a little time for yourself. ♡"
  },
  tasks: [
    { id: makeId(), text: "Pay the electricity bill", date: todayISO(), done: false },
    { id: makeId(), text: "Do the laundry", date: todayISO(), done: false },
    { id: makeId(), text: "Tidy up the room", date: todayISO(), done: false },
    { id: makeId(), text: "Make a grocery list", date: todayISO(), done: true },
    { id: makeId(), text: "Read a book", date: todayISO(), done: false }
  ],
  events: [
    { id: makeId(), title: "Light exercise", date: todayISO(), time: "07:00", description: "Start the day with a little movement." },
    { id: makeId(), title: "Breakfast", date: todayISO(), time: "08:30", description: "Remember to eat, Mom ♡" },
    { id: makeId(), title: "Rest & me time", date: todayISO(), time: "13:00", description: "Make a little time for yourself." }
  ],
  notes: [
    { id: makeId(), title: "Soy sauce chicken recipe", body: "Ingredients: chicken, garlic, sweet soy sauce, oyster sauce, pepper...", createdAt: todayISO() },
    { id: makeId(), title: "Holiday plans", body: "Maybe we can take a trip next month? Check tickets and hotels ♡", createdAt: todayISO() }
  ],
  groceries: [
    { id: makeId(), text: "Eggs", bought: false },
    { id: makeId(), text: "Milk", bought: false },
    { id: makeId(), text: "Bread", bought: false },
    { id: makeId(), text: "Fruit", bought: false },
    { id: makeId(), text: "Vegetables", bought: false }
  ]
});

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.tasks && parsed.events && parsed.notes && parsed.groceries && parsed.settings) return parsed;
    }
  } catch (error) {
    console.warn("Data planner cannot be read:", error);
  }
  const fresh = demoData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}
let data = loadData();
let currentPage = "home";
let todoFilter = "all";
let miniMonth = new Date();
let fullMonth = new Date();
let selectedDate = todayISO();
let editingNoteId = null;
let toastTimeout;
let focusInterval = null;
let focusSeconds = 15 * 60;
let focusPaused = false;

function saveData(showMessage = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (showMessage) showToast("Saved on this device ♡");
  } catch (error) {
    showToast("Storage is full or unavailabe. Try exporting the data");
  }
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}
function getSettingName() { return data.settings.name?.trim() || "Mom"; }
function updateHeader() {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Good morning" : hour < 15 ? "Good afternoon" : hour < 18 ? "Good afternoon" : "Good evening";
  $("#greeting").textContent = `${greeting}, ${getSettingName()}!`;
  $("#todayLabel").textContent = formatDate(todayISO(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#scheduleDate").textContent = formatDate(todayISO(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $(".hero h1").innerHTML = `Hello, lovely soul ${escapeHTML()}! <span>☼</span>`;
  $(".hero p").textContent = data.settings.message;
}
function showPage(page) {
  currentPage = page;
  $$(".page").forEach(section => section.classList.toggle("active-page", section.id === `page-${page}`));
  $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  $("#sidebar").classList.remove("open");
  if (page === "calendar") renderFullCalendar();
  if (page === "todos") renderTodos();
  if (page === "notes") renderNotes();
  if (page === "groceries") renderGroceries();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderStats() {
  const tasks = data.tasks.filter(task => task.date === todayISO());
  $("#statTasks").textContent = `${tasks.filter(task => task.done).length} / ${tasks.length}`;
  $("#statEvents").textContent = data.events.filter(event => event.date === todayISO()).length;
  $("#statGroceries").textContent = `${data.groceries.filter(item => !item.bought).length} item`;
  $("#statNotes").textContent = data.notes.length;
}
function renderSchedule() {
  const events = data.events.filter(event => event.date === todayISO()).sort((a,b) => a.time.localeCompare(b.time));
  const container = $("#todaySchedule");
  container.innerHTML = events.length ? events.map(event => `
    <div class="schedule-item">
      <span class="schedule-dot"></span>
      <div><strong>${escapeHTML(event.title)}</strong><small>${escapeHTML(event.description || "Today’s event")}</small></div>
      <time class="schedule-time">${escapeHTML(event.time)}</time>
    </div>`).join("") : '<div class="empty-state">The day is still open. Add an event whenever you like, Mom ♡</div>';
}
function renderTaskRows(container, tasks, compact = false) {
  container.innerHTML = tasks.length ? tasks.map(task => `
    <div class="${compact ? "compact-task" : "full-task"} ${task.done ? "is-done" : ""}">
      <input type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.done ? "checked" : ""} aria-label="Mark ${escapeHTML(task.text)} as complete">
      <span class="task-text">${escapeHTML(task.text)}</span>
      ${!compact && task.date ? `<span class="task-date">${escapeHTML(formatDate(task.date, { day: "numeric", month: "short" }))}</span>` : ""}
      ${!compact ? `<button class="delete-small" data-action="delete-task" data-id="${task.id}" aria-label="Delete task">×</button>` : ""}
    </div>`).join("") : '<div class="empty-state">No tasks yet. Enjoy a peaceful moment, or add your first task ♡</div>';
}
function renderHomeTodos() {
  const tasks = data.tasks.filter(task => task.date === todayISO());
  renderTaskRows($("#homeTodoList"), tasks.slice(0, 4), true);
}
function renderHomeNotes() {
  const notes = data.notes.slice().reverse().slice(0, 3);
  $("#homeNotes").innerHTML = notes.length ? notes.map(note => `
    <article class="note-preview"><strong>${escapeHTML(note.title)}</strong><p>${escapeHTML(note.body || "Your personal note.")}</p><small>${escapeHTML(formatDate(note.createdAt))}</small></article>`).join("") : '<div class="empty-state">Your new notes will appear here ♡</div>';
}
function renderHomeGroceries() {
  const items = data.groceries.filter(item => !item.bought).slice(0, 4);
  $("#homeGroceries").innerHTML = items.length ? items.map(item => `
    <div class="grocery-row"><input type="checkbox" data-action="toggle-grocery" data-id="${item.id}" aria-label="Mark ${escapeHTML(item.text)} as bought"><span class="task-text">${escapeHTML(item.text)}</span></div>`).join("") : '<div class="empty-state">Everything on the list is checked off ♡</div>';
}
function renderMiniCalendar() {
  const year = miniMonth.getFullYear(), month = miniMonth.getMonth();
  $("#miniMonthLabel").textContent = `${monthNames[month]} ${year}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const eventDates = new Set(data.events.map(event => event.date));
  let html = dayNames.map(day => `<span class="calendar-day-name">${day}</span>`).join("");
  for (let i = 0; i < 42; i++) {
    let day, date, outside = false;
    if (i < firstDay) { day = prevDays - firstDay + i + 1; date = new Date(year, month - 1, day); outside = true; }
    else if (i >= firstDay + daysInMonth) { day = i - firstDay - daysInMonth + 1; date = new Date(year, month + 1, day); outside = true; }
    else { day = i - firstDay + 1; date = new Date(year, month, day); }
    const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    html += `<button class="calendar-day ${outside ? "outside" : ""} ${iso === todayISO() ? "today" : ""} ${iso === selectedDate ? "selected" : ""} ${eventDates.has(iso) ? "has-event" : ""}" data-date="${iso}" aria-label="${formatDate(iso)}">${day}</button>`;
  }
  $("#miniCalendar").innerHTML = html;
}
function renderDashboard() {
  updateHeader();
  renderStats();
  renderSchedule();
  renderHomeTodos();
  renderHomeNotes();
  renderHomeGroceries();
  renderMiniCalendar();
}
function renderTodos() {
  const tasks = data.tasks.filter(task => todoFilter === "all" || (todoFilter === "active" ? !task.done : task.done))
    .sort((a,b) => (a.date || "").localeCompare(b.date || ""));
  renderTaskRows($("#todoList"), tasks, false);
  $$("#todoFilters .filter-chip").forEach(button => button.classList.toggle("selected", button.dataset.filter === todoFilter));
  $("#todoDate").value = $("#todoDate").value || todayISO();
}
function renderNotes() {
  const notes = data.notes.slice().reverse();
  $("#notesBoard").innerHTML = notes.length ? notes.map(note => `
    <article class="note-card">
      <div class="note-actions"><button class="icon-button" data-action="edit-note" data-id="${note.id}" aria-label="Edit note">✎</button><button class="icon-button" data-action="delete-note" data-id="${note.id}" aria-label="Delete note">×</button></div>
      <h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.body || "Your personal note.")}</p><small>${escapeHTML(formatDate(note.createdAt))}</small>
    </article>`).join("") : '<div class="empty-state">No notes yet. Write down your first thought ♡</div>';
}
function renderGroceries() {
  const items = data.groceries;
  $("#groceryList").innerHTML = items.length ? items.map(item => `
    <div class="grocery-row ${item.bought ? "is-done" : ""}">
      <input type="checkbox" data-action="toggle-grocery" data-id="${item.id}" ${item.bought ? "checked" : ""} aria-label="Mark ${escapeHTML(item.text)} as bought">
      <span class="task-text">${escapeHTML(item.text)}</span><button class="delete-small" data-action="delete-grocery" data-id="${item.id}" aria-label="Delete item">×</button>
    </div>`).join("") : '<div class="empty-state">Your list is empty. Add something you need ♡</div>';
  const bought = items.filter(item => item.bought).length;
  const percent = items.length ? Math.round(bought / items.length * 100) : 0;
  $("#groceryProgressText").textContent = `${bought} of ${items.length} items completed`;
  $("#groceryProgressPercent").textContent = `${percent}%`;
  $("#groceryProgressBar").style.width = `${percent}%`;
  $("#groceryRemaining").textContent = `${items.length - bought} items left to buy`;
}
function renderFullCalendar() {
  const year = fullMonth.getFullYear(), month = fullMonth.getMonth();
  $("#fullMonthLabel").textContent = `${monthNames[month]} ${year}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const eventsByDate = {};
  data.events.forEach(event => (eventsByDate[event.date] ||= []).push(event));
  Object.values(eventsByDate).forEach(events => events.sort((a,b) => a.time.localeCompare(b.time)));
  let html = dayNames.map(day => `<div class="full-day-name">${day}</div>`).join("");
  for (let i = 0; i < 42; i++) {
    let day, date, outside = false;
    if (i < firstDay) { day = prevDays - firstDay + i + 1; date = new Date(year, month - 1, day); outside = true; }
    else if (i >= firstDay + daysInMonth) { day = i - firstDay - daysInMonth + 1; date = new Date(year, month + 1, day); outside = true; }
    else { day = i - firstDay + 1; date = new Date(year, month, day); }
    const iso = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    const chips = (eventsByDate[iso] || []).slice(0, 2).map(event => `<span class="event-chip">${escapeHTML(event.time)} ${escapeHTML(event.title)}</span>`).join("");
    const extra = (eventsByDate[iso] || []).length > 2 ? `<span class="event-chip">+${eventsByDate[iso].length - 2} lagi</span>` : "";
    html += `<button class="full-day ${outside ? "outside" : ""} ${iso === todayISO() ? "today" : ""} ${iso === selectedDate ? "selected" : ""}" data-date="${iso}" aria-label="${formatDate(iso)}"><span class="day-number">${day}</span>${chips}${extra}</button>`;
  }
  $("#fullCalendar").innerHTML = html;
  renderSelectedEvents();
}
function renderSelectedEvents() {
  $("#selectedDateTitle").textContent = formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const events = data.events.filter(event => event.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));
  $("#selectedEvents").innerHTML = events.length ? events.map(event => `
    <div class="event-line"><time>${escapeHTML(event.time)}</time><div><strong>${escapeHTML(event.title)}</strong><p>${escapeHTML(event.description || "Tidak ada catatan tambahan.")}</p></div><div class="event-actions"><button class="icon-button" data-action="edit-event" data-id="${event.id}" aria-label="Edit event">✎</button><button class="icon-button" data-action="delete-event" data-id="${event.id}" aria-label="Delete event">×</button></div></div>`).join("") : '<div class="empty-state">No events on this date. Leave a little room for good things ♡</div>';
}
function refreshAll() {
  renderDashboard();
  if (currentPage === "calendar") renderFullCalendar();
  if (currentPage === "todos") renderTodos();
  if (currentPage === "notes") renderNotes();
  if (currentPage === "groceries") renderGroceries();
}
function openEventDialog(event = null, date = selectedDate) {
  $("#eventForm").reset();
  $("#eventId").value = event?.id || "";
  $("#eventTitle").value = event?.title || "";
  $("#eventDate").value = event?.date || date || todayISO();
  $("#eventTime").value = event?.time || "08:00";
  $("#eventDescription").value = event?.description || "";
  $("#eventDialogTitle").textContent = event ? "Edit kegiatan" : "Tambah kegiatan";
  $("#deleteEvent").hidden = !event;
  $("#eventDialog").showModal();
}
function addTask(text, date = todayISO()) {
  const clean = text.trim();
  if (!clean) return;
  data.tasks.push({ id: makeId(), text: clean, date, done: false });
  saveData(); refreshAll(); showToast("Task added ♡");
}
function addGrocery(text) {
  const clean = text.trim();
  if (!clean) return;
  data.groceries.push({ id: makeId(), text: clean, bought: false });
  saveData(); refreshAll(); showToast("Item added to your grocery list ♡");
}
function clearNoteForm() {
  editingNoteId = null;
  $("#noteForm").reset();
  $("#noteFormTitle").textContent = "Write a new note";
  $("#saveNote").textContent = "Save note ♡";
}
function editNote(id) {
  const note = data.notes.find(item => item.id === id);
  if (!note) return;
  editingNoteId = id;
  $("#noteTitle").value = note.title;
  $("#noteBody").value = note.body;
  $("#noteFormTitle").textContent = "Edit note";
  $("#saveNote").textContent = "Save changes ♡";
  $("#noteTitle").focus();
}
function runSearch(query) {
  const q = query.trim().toLocaleLowerCase("en-US");
  if (!q) { showToast("Type a keyword to search."); return; }
  const matches = [
    ...data.tasks.filter(item => item.text.toLocaleLowerCase("en-US").includes(q)).map(item => `Task: ${item.text}`),
    ...data.events.filter(item => `${item.title} ${item.description}`.toLocaleLowerCase("en-US").includes(q)).map(item => `Event: ${item.title} (${formatDate(item.date)})`),
    ...data.notes.filter(item => `${item.title} ${item.body}`.toLocaleLowerCase("en-US").includes(q)).map(item => `Note: ${item.title}`),
    ...data.groceries.filter(item => item.text.toLocaleLowerCase("en-US").includes(q)).map(item => `Grocery: ${item.text}`)
  ];
  if (!matches.length) { showToast(`No results for “${query.trim()}”.`); return; }
  const message = matches.slice(0, 5).join(" • ");
  showToast(`${matches.length} hasil: ${message}${matches.length > 5 ? " • ..." : ""}`);
}
function startFocus() {
  clearInterval(focusInterval);
  focusSeconds = 15 * 60;
  focusPaused = false;
  $("#focusPause").textContent = "Jeda";
  $("#focusTimer").textContent = "15:00";
  $("#focusMessage").textContent = "Breathe slowly. You have already done so much today. ♡";
  $("#focusDialog").showModal();
  focusInterval = setInterval(() => {
    if (focusPaused) return;
    focusSeconds--;
    const min = String(Math.floor(focusSeconds / 60)).padStart(2, "0");
    const sec = String(focusSeconds % 60).padStart(2, "0");
    $("#focusTimer").textContent = `${min}:${sec}`;
    if (focusSeconds <= 0) {
      clearInterval(focusInterval);
      $("#focusMessage").textContent = "All done, Mom. I hope your heart feels a little lighter. ♡";
      showToast("Your focus time is complete. Thank you for taking a moment for yourself.");
    }
  }, 1000);
}

// Navigasi halaman
$$(".nav-link").forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
$$("[data-open]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.open)));
$("#menuToggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

// Tambah tugas cepat dan dari halaman tugas
$("#quickTodoForm").addEventListener("submit", event => {
  event.preventDefault();
  addTask($("#quickTodoInput").value);
  $("#quickTodoForm").reset();
});
$("#todoForm").addEventListener("submit", event => {
  event.preventDefault();
  addTask($("#todoInput").value, $("#todoDate").value || todayISO());
  $("#todoForm").reset();
  $("#todoDate").value = todayISO();
});
$("#todoFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  todoFilter = button.dataset.filter;
  renderTodos();
});

// Tambah barang belanja
$("#quickGroceryForm").addEventListener("submit", event => {
  event.preventDefault(); addGrocery($("#quickGroceryInput").value); $("#quickGroceryForm").reset();
});
$("#groceryForm").addEventListener("submit", event => {
  event.preventDefault(); addGrocery($("#groceryInput").value); $("#groceryForm").reset();
});

// Form catatan
$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#noteTitle").value.trim();
  const body = $("#noteBody").value.trim();
  if (!title) return;
  if (editingNoteId) {
    const note = data.notes.find(item => item.id === editingNoteId);
    if (note) { note.title = title; note.body = body; }
    showToast("Note updated ♡");
  } else {
    data.notes.push({ id: makeId(), title, body, createdAt: todayISO() });
    showToast("Note saved ♡");
  }
  saveData(); clearNoteForm(); refreshAll();
});
$("#clearNote").addEventListener("click", clearNoteForm);

// Kalender dan modal kegiatan
$("#addEventHome").addEventListener("click", () => openEventDialog(null, todayISO()));
$("#addEventButton").addEventListener("click", () => openEventDialog(null, selectedDate));
$("#cancelEvent").addEventListener("click", () => $("#eventDialog").close());
$("#eventForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#eventId").value;
  const entry = {
    id: id || makeId(),
    title: $("#eventTitle").value.trim(),
    date: $("#eventDate").value,
    time: $("#eventTime").value,
    description: $("#eventDescription").value.trim()
  };
  if (!entry.title || !entry.date || !entry.time) return;
  if (id) {
    const index = data.events.findIndex(item => item.id === id);
    if (index >= 0) data.events[index] = entry;
  } else data.events.push(entry);
  selectedDate = entry.date;
  fullMonth = new Date(`${entry.date}T12:00:00`);
  miniMonth = new Date(`${entry.date}T12:00:00`);
  saveData(); $("#eventDialog").close(); refreshAll(); showToast(id ? "Kegiatan diperbarui ♡" : "Kegiatan ditambahkan ♡");
});
$("#deleteEvent").addEventListener("click", () => {
  const id = $("#eventId").value;
  data.events = data.events.filter(item => item.id !== id);
  saveData(); $("#eventDialog").close(); refreshAll(); showToast("Event deleted.");
});
$("#miniPrev").addEventListener("click", () => { miniMonth.setMonth(miniMonth.getMonth() - 1); renderMiniCalendar(); });
$("#miniNext").addEventListener("click", () => { miniMonth.setMonth(miniMonth.getMonth() + 1); renderMiniCalendar(); });
$("#calendarPrev").addEventListener("click", () => { fullMonth.setMonth(fullMonth.getMonth() - 1); renderFullCalendar(); });
$("#calendarNext").addEventListener("click", () => { fullMonth.setMonth(fullMonth.getMonth() + 1); renderFullCalendar(); });
$("#calendarToday").addEventListener("click", () => { selectedDate = todayISO(); fullMonth = new Date(); renderFullCalendar(); });

// Klik tombol aksi pada daftar
document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const { action, id } = actionButton.dataset;
    if (action === "delete-task") {
      data.tasks = data.tasks.filter(task => task.id !== id); saveData(); refreshAll(); showToast("Task deleted.");
    } else if (action === "delete-grocery") {
      data.groceries = data.groceries.filter(item => item.id !== id); saveData(); refreshAll(); showToast("Item deleted.");
    } else if (action === "edit-note") editNote(id);
    else if (action === "delete-note") {
      data.notes = data.notes.filter(note => note.id !== id);
      if (editingNoteId === id) clearNoteForm();
      saveData(); refreshAll(); showToast("Note deleted.");
    } else if (action === "edit-event") {
      const eventItem = data.events.find(item => item.id === id);
      if (eventItem) openEventDialog(eventItem);
    } else if (action === "delete-event") {
      data.events = data.events.filter(item => item.id !== id); saveData(); refreshAll(); showToast("Event deleted.");
    }
    return;
  }
  const dateButton = event.target.closest("[data-date]");
  if (dateButton) {
    selectedDate = dateButton.dataset.date;
    miniMonth = new Date(`${selectedDate}T12:00:00`);
    fullMonth = new Date(`${selectedDate}T12:00:00`);
    if (currentPage === "calendar") renderFullCalendar();
    else { renderMiniCalendar(); showPage("calendar"); }
  }
});
document.addEventListener("change", event => {
  const input = event.target.closest("[data-action]");
  if (!input) return;
  const { action, id } = input.dataset;
  if (action === "toggle-task") {
    const task = data.tasks.find(item => item.id === id);
    if (task) task.done = input.checked;
  } else if (action === "toggle-grocery") {
    const item = data.groceries.find(item => item.id === id);
    if (item) item.bought = input.checked;
  } else return;
  saveData(); refreshAll();
});

// Pencarian, mode fokus, pengaturan
$("#searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") runSearch(event.target.value);
});
$("#focusStart").addEventListener("click", startFocus);
$("#focusPause").addEventListener("click", () => {
  focusPaused = !focusPaused;
  $("#focusPause").textContent = focusPaused ? "Lanjutkan" : "Jeda";
  $("#focusMessage").textContent = focusPaused ? "It’s okay to pause. Continue when you feel ready." : "Breathe slowly. You have already done so much today. ♡";
});
$("#focusFinish").addEventListener("click", () => {
  clearInterval(focusInterval); focusInterval = null; $("#focusDialog").close(); showToast("Thank you for taking a moment for yourself ♡");
});
$("#focusDialog").addEventListener("close", () => { clearInterval(focusInterval); focusInterval = null; });
$("#nameSetting").value = data.settings.name || "Mom";
$("#messageSetting").value = data.settings.message || "";
$("#nameSetting").addEventListener("change", event => {
  data.settings.name = event.target.value.trim() || "Mom"; saveData(); refreshAll(); showToast("Display name updated ♡");
});
$("#messageSetting").addEventListener("change", event => {
  data.settings.message = event.target.value.trim() || "May today bring you little moments of joy ♡"; saveData(); refreshAll(); showToast("Encouraging message updated ♡");
});
$("#clearBought").addEventListener("click", () => {
  const before = data.groceries.length;
  data.groceries = data.groceries.filter(item => !item.bought);
  saveData(); refreshAll(); showToast(`${before - data.groceries.length} barang yang sudah dibeli dihapus.`);
});
$("#exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `mama-planner-${todayISO()}.json`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  showToast("Planner data backup downloaded ♡");
});
$("#resetDemo").addEventListener("click", () => {
  const confirmed = window.confirm("Restore the planner to its sample data? Your current planner data will be replaced.");
  if (!confirmed) return;
  data = demoData(); saveData(); clearNoteForm();
  $("#nameSetting").value = data.settings.name;
  $("#messageSetting").value = data.settings.message;
  refreshAll(); showToast("Sample data restored ♡");
});

// Inisialisasi
$("#todoDate").value = todayISO();
renderDashboard();
renderFullCalendar();
