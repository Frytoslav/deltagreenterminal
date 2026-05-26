const STORAGE_KEY = "dg98-state-v1";
const SESSION_KEY = "dg98-session-v1";

const desktop = document.querySelector("#desktop");
const taskbar = document.querySelector("#taskbar");
const bootScreen = document.querySelector("#bootScreen");
const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const loginName = document.querySelector("#loginName");
const loginPassword = document.querySelector("#loginPassword");
const loginError = document.querySelector("#loginError");
const loginCancel = document.querySelector("#loginCancel");
const startButton = document.querySelector("#startButton");
const startMenu = document.querySelector("#startMenu");
const taskButtons = document.querySelector("#taskButtons");
const dialog = document.querySelector("#dialog");
const dialogMessage = document.querySelector("#dialogMessage");
const clock = document.querySelector("#clock");
const soundButton = document.querySelector("#soundButton");
const currentUserLabel = document.querySelector("#currentUserLabel");
const logoutButton = document.querySelector("#logoutButton");
const caseFileGrid = document.querySelector("#caseFileGrid");
const fileList = document.querySelector("#fileList");
const filePreview = document.querySelector("#filePreview");
const terminalBody = document.querySelector("#terminalBody");
const windows = [...document.querySelectorAll(".window")];

const userList = document.querySelector("#userList");
const userForm = document.querySelector("#userForm");
const userOriginalName = document.querySelector("#userOriginalName");
const userName = document.querySelector("#userName");
const userPassword = document.querySelector("#userPassword");
const userDisplayName = document.querySelector("#userDisplayName");
const userIsAdmin = document.querySelector("#userIsAdmin");
const newUserButton = document.querySelector("#newUserButton");
const deleteUserButton = document.querySelector("#deleteUserButton");

const adminUsers = document.querySelector("#adminUsers");
const adminFiles = document.querySelector("#adminFiles");
const adminFileList = document.querySelector("#adminFileList");
const fileForm = document.querySelector("#fileForm");
const fileId = document.querySelector("#fileId");
const fileTitle = document.querySelector("#fileTitle");
const fileOwner = document.querySelector("#fileOwner");
const fileClass = document.querySelector("#fileClass");
const fileContent = document.querySelector("#fileContent");
const newFileButton = document.querySelector("#newFileButton");
const deleteFileButton = document.querySelector("#deleteFileButton");
const resetDemoData = document.querySelector("#resetDemoData");

let topZ = 30;
let soundEnabled = true;
let audioContext;
let startupPlayed = false;
let state = loadState();
let currentUser = getSessionUser();

function defaultState() {
  return {
    users: [
      { username: "admin", password: "admin", displayName: "Administrator", isAdmin: true },
      { username: "agent", password: "agent", displayName: "Agent KITE", isAdmin: false },
    ],
    files: [
      {
        id: createId(),
        title: "BRIEFING.TXT",
        owner: "all",
        classification: "GREEN",
        content:
          "OPERATION: LAST LIGHT\nLocation: rural Pennsylvania, 1998.\nThree disappearances, one impossible phone call, and a federal evidence room logged open at 03:17.",
      },
      {
        id: createId(),
        title: "AUDIO_TAPE_041.LOG",
        owner: "admin",
        classification: "BLACK",
        content:
          "Transcript fragment:\n[00:03] Static.\n[00:08] A child says the agent's full legal name.\n[00:11] Recording ends before the tape does.",
      },
      {
        id: createId(),
        title: "MOTEL_RECEIPT.DOC",
        owner: "agent",
        classification: "AMBER",
        content:
          "Room 12 paid cash. Guest signed as R. Wake.\nClerk insists the guest left before checking in.",
      },
    ],
  };
}

function createId() {
  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const seeded = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    return JSON.parse(saved);
  } catch {
    const seeded = defaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSessionUser() {
  const username = sessionStorage.getItem(SESSION_KEY);
  return state.users.find((user) => user.username === username) || null;
}

function isAdmin() {
  return Boolean(currentUser && currentUser.isAdmin);
}

function visibleFiles() {
  if (!currentUser) return [];
  if (isAdmin()) return state.files;
  return state.files.filter((file) => file.owner === "all" || file.owner === currentUser.username);
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioContext;
}

function tone(frequency, duration, type = "square", gain = 0.04, delay = 0) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  const start = ctx.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume);
  volume.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(name) {
  if (name === "open") {
    tone(660, 0.055);
    tone(880, 0.07, "square", 0.03, 0.055);
  } else if (name === "close") {
    tone(440, 0.08, "triangle", 0.035);
    tone(220, 0.1, "triangle", 0.025, 0.06);
  } else if (name === "error") {
    tone(160, 0.12, "sawtooth", 0.06);
    tone(120, 0.12, "sawtooth", 0.055, 0.13);
  } else if (name === "start") {
    tone(523, 0.09, "triangle", 0.035);
    tone(659, 0.09, "triangle", 0.035, 0.09);
    tone(784, 0.16, "triangle", 0.035, 0.18);
  } else {
    tone(720, 0.035, "square", 0.025);
  }
}

function unlockAudio() {
  if (!soundEnabled || startupPlayed) return;

  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  startupPlayed = true;
  playSound("start");
}

function activateWindow(win) {
  if (!currentUser) return;
  if (win.id === "admin" && !isAdmin()) {
    showDialog("Access denied. Administrator privileges required.");
    return;
  }

  windows.forEach((item) => item.classList.remove("active"));
  win.classList.remove("hidden");
  win.classList.add("active");
  win.style.zIndex = ++topZ;
  updateTasks();
}

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  activateWindow(win);
  startMenu.classList.add("hidden");
  startButton.classList.remove("active");
  renderAll();
  playSound("open");
}

function closeWindow(win) {
  if (!win) return;
  win.classList.add("hidden");
  win.classList.remove("active");
  playSound("close");
  updateTasks();
}

function showDialog(message) {
  dialogMessage.textContent = message;
  dialog.classList.remove("hidden");
  dialog.style.zIndex = ++topZ;
  playSound("error");
}

function updateTasks() {
  taskButtons.innerHTML = "";
  windows
    .filter((win) => !win.classList.contains("hidden"))
    .forEach((win) => {
      const button = document.createElement("button");
      button.textContent = win.dataset.title;
      button.className = win.classList.contains("active") ? "active" : "";
      button.addEventListener("click", () => {
        if (win.classList.contains("active")) {
          win.classList.add("hidden");
          win.classList.remove("active");
        } else {
          activateWindow(win);
        }
        updateTasks();
        playSound("click");
      });
      taskButtons.append(button);
    });
}

function maximizeWindow(win) {
  if (win.dataset.maximized === "true") {
    win.style.left = win.dataset.prevLeft;
    win.style.top = win.dataset.prevTop;
    win.style.width = win.dataset.prevWidth;
    win.style.height = win.dataset.prevHeight;
    win.dataset.maximized = "false";
  } else {
    win.dataset.prevLeft = win.style.left;
    win.dataset.prevTop = win.style.top;
    win.dataset.prevWidth = win.style.width;
    win.dataset.prevHeight = win.style.height;
    win.style.left = "8px";
    win.style.top = "8px";
    win.style.width = "calc(100vw - 16px)";
    win.style.height = "calc(100vh - 46px)";
    win.dataset.maximized = "true";
  }
  activateWindow(win);
  playSound("click");
}

function makeDraggable(win) {
  const titleBar = win.querySelector(".title-bar");
  let startX = 0;
  let startY = 0;
  let baseLeft = 0;
  let baseTop = 0;

  titleBar.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || win.dataset.maximized === "true") return;

    activateWindow(win);
    startX = event.clientX;
    startY = event.clientY;
    baseLeft = win.offsetLeft;
    baseTop = win.offsetTop;
    titleBar.setPointerCapture(event.pointerId);
  });

  titleBar.addEventListener("pointermove", (event) => {
    if (!titleBar.hasPointerCapture(event.pointerId)) return;

    const nextLeft = Math.max(0, Math.min(window.innerWidth - 80, baseLeft + event.clientX - startX));
    const nextTop = Math.max(0, Math.min(window.innerHeight - 58, baseTop + event.clientY - startY));
    win.style.left = `${nextLeft}px`;
    win.style.top = `${nextTop}px`;
  });

  titleBar.addEventListener("pointerup", (event) => {
    if (titleBar.hasPointerCapture(event.pointerId)) {
      titleBar.releasePointerCapture(event.pointerId);
    }
  });
}

function renderAll() {
  renderSession();
  renderCaseFiles();
  renderFileManager();
  renderAdmin();
  renderTerminal();
}

function renderSession() {
  const loggedIn = Boolean(currentUser);
  loginScreen.classList.toggle("hidden", loggedIn);
  desktop.classList.toggle("locked", !loggedIn);
  taskbar.classList.toggle("locked", !loggedIn);
  currentUserLabel.textContent = currentUser ? currentUser.displayName : "No user";
  document.querySelectorAll(".admin-only").forEach((item) => {
    item.classList.toggle("hidden", !isAdmin());
  });
}

function renderTerminal() {
  if (!currentUser) return;
  terminalBody.innerHTML = `
    <p>DELTA GREEN NETWORK NODE 7.13</p>
    <p>C:\\DGNET&gt; whoami</p>
    <p>${escapeHtml(currentUser.username)} (${isAdmin() ? "administrator" : "field user"})</p>
    <p>C:\\DGNET&gt; status</p>
    <p>Files visible: ${visibleFiles().length} | Users: ${isAdmin() ? state.users.length : "restricted"} | Threat index: amber</p>
    <p>C:\\DGNET&gt; <span class="cursor">_</span></p>
  `;
}

function renderCaseFiles() {
  caseFileGrid.innerHTML = "";
  visibleFiles().forEach((file) => {
    const button = document.createElement("button");
    button.className = "file-card";
    button.innerHTML = `
      <span class="icon-doc small"></span>
      <strong>${escapeHtml(file.title)}</strong>
      <small>${escapeHtml(file.classification)} | ${file.owner === "all" ? "All users" : escapeHtml(file.owner)}</small>
    `;
    button.addEventListener("click", () => openFile(file.id));
    caseFileGrid.append(button);
  });
}

function renderFileManager() {
  fileList.innerHTML = "";
  const files = visibleFiles();
  if (!files.length) {
    fileList.innerHTML = '<p class="empty-state">No files available.</p>';
    filePreview.value = "";
    return;
  }

  files.forEach((file) => {
    const button = document.createElement("button");
    button.className = "file-row";
    button.innerHTML = `<strong>${escapeHtml(file.title)}</strong><span>${escapeHtml(file.classification)}</span>`;
    button.addEventListener("click", () => {
      filePreview.value = file.content;
      document.querySelectorAll(".file-row").forEach((row) => row.classList.remove("selected"));
      button.classList.add("selected");
    });
    fileList.append(button);
  });
  filePreview.value = files[0].content;
  fileList.querySelector(".file-row").classList.add("selected");
}

function renderAdmin() {
  if (!isAdmin()) return;
  renderUserList();
  renderAdminFileList();
  renderOwnerOptions();
}

function renderUserList() {
  userList.innerHTML = "";
  state.users.forEach((user) => {
    const button = document.createElement("button");
    button.className = "admin-row";
    button.innerHTML = `<strong>${escapeHtml(user.username)}</strong><span>${user.isAdmin ? "Admin" : "User"}</span>`;
    button.addEventListener("click", () => selectUser(user.username));
    userList.append(button);
  });
}

function renderAdminFileList() {
  adminFileList.innerHTML = "";
  state.files.forEach((file) => {
    const button = document.createElement("button");
    button.className = "admin-row";
    button.innerHTML = `<strong>${escapeHtml(file.title)}</strong><span>${escapeHtml(file.owner)} / ${escapeHtml(file.classification)}</span>`;
    button.addEventListener("click", () => selectFile(file.id));
    adminFileList.append(button);
  });
}

function renderOwnerOptions() {
  fileOwner.innerHTML = '<option value="all">All users</option>';
  state.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = user.displayName;
    fileOwner.append(option);
  });
}

function openFile(id) {
  const file = visibleFiles().find((item) => item.id === id);
  if (!file) {
    showDialog("File not found or access denied.");
    return;
  }

  openWindow("files");
  filePreview.value = file.content;
}

function selectUser(username) {
  const user = state.users.find((item) => item.username === username);
  if (!user) return;
  userOriginalName.value = user.username;
  userName.value = user.username;
  userPassword.value = user.password;
  userDisplayName.value = user.displayName;
  userIsAdmin.checked = user.isAdmin;
}

function clearUserForm() {
  userOriginalName.value = "";
  userName.value = "";
  userPassword.value = "";
  userDisplayName.value = "";
  userIsAdmin.checked = false;
  userName.focus();
}

function selectFile(id) {
  const file = state.files.find((item) => item.id === id);
  if (!file) return;
  fileId.value = file.id;
  fileTitle.value = file.title;
  fileOwner.value = file.owner;
  fileClass.value = file.classification;
  fileContent.value = file.content;
}

function clearFileForm() {
  fileId.value = "";
  fileTitle.value = "";
  fileOwner.value = "all";
  fileClass.value = "GREEN";
  fileContent.value = "";
  fileTitle.focus();
}

function switchAdminTab(tab) {
  adminUsers.classList.toggle("hidden", tab !== "users");
  adminFiles.classList.toggle("hidden", tab !== "files");
}

function login(username, password) {
  const user = state.users.find((item) => item.username === username && item.password === password);
  if (!user) {
    loginError.textContent = "Invalid user name or password.";
    playSound("error");
    return;
  }

  currentUser = user;
  sessionStorage.setItem(SESSION_KEY, user.username);
  loginError.textContent = "";
  loginPassword.value = "";
  renderAll();
  openWindow("casefiles");
  playSound("open");
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
  windows.forEach((win) => {
    win.classList.add("hidden");
    win.classList.remove("active");
  });
  startMenu.classList.add("hidden");
  startButton.classList.remove("active");
  updateTasks();
  renderAll();
  loginName.value = "admin";
  loginPassword.value = "";
  loginName.focus();
  playSound("close");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("click", (event) => {
  unlockAudio();

  const openTarget = event.target.closest("[data-open]");
  const alertTarget = event.target.closest("[data-alert]");
  const actionTarget = event.target.closest("[data-action]");
  const adminTabTarget = event.target.closest("[data-admin-tab]");
  const adminOpenTabTarget = event.target.closest("[data-admin-open-tab]");

  if (openTarget) {
    openWindow(openTarget.dataset.open);
    return;
  }

  if (alertTarget) {
    showDialog(alertTarget.dataset.alert);
    return;
  }

  if (adminTabTarget) {
    switchAdminTab(adminTabTarget.dataset.adminTab);
    playSound("click");
    return;
  }

  if (adminOpenTabTarget) {
    openWindow("admin");
    switchAdminTab(adminOpenTabTarget.dataset.adminOpenTab);
    return;
  }

  if (actionTarget) {
    const win = actionTarget.closest(".window");
    const action = actionTarget.dataset.action;

    if (action === "close") closeWindow(win);
    if (action === "minimize") {
      win.classList.add("hidden");
      win.classList.remove("active");
      playSound("click");
      updateTasks();
    }
    if (action === "maximize") maximizeWindow(win);
  }
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockAudio();
  login(loginName.value.trim(), loginPassword.value);
});

loginCancel.addEventListener("click", () => {
  loginName.value = "";
  loginPassword.value = "";
  loginError.textContent = "";
  playSound("click");
});

logoutButton.addEventListener("click", logout);

userForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const original = userOriginalName.value;
  const nextUser = {
    username: userName.value.trim(),
    password: userPassword.value,
    displayName: userDisplayName.value.trim(),
    isAdmin: userIsAdmin.checked,
  };

  if (!nextUser.username || !nextUser.password || !nextUser.displayName) {
    showDialog("User name, password and display name are required.");
    return;
  }

  const duplicate = state.users.some((user) => user.username === nextUser.username && user.username !== original);
  if (duplicate) {
    showDialog("This user name already exists.");
    return;
  }

  if (original) {
    const index = state.users.findIndex((user) => user.username === original);
    state.users[index] = nextUser;
    state.files.forEach((file) => {
      if (file.owner === original) file.owner = nextUser.username;
    });
    if (currentUser.username === original) currentUser = nextUser;
    sessionStorage.setItem(SESSION_KEY, currentUser.username);
  } else {
    state.users.push(nextUser);
  }

  saveState();
  renderAll();
  selectUser(nextUser.username);
  playSound("open");
});

deleteUserButton.addEventListener("click", () => {
  const username = userOriginalName.value;
  if (!username) return;
  if (username === currentUser.username) {
    showDialog("You cannot delete the logged-in user.");
    return;
  }
  if (state.users.length <= 1) {
    showDialog("At least one user must remain.");
    return;
  }

  state.users = state.users.filter((user) => user.username !== username);
  state.files.forEach((file) => {
    if (file.owner === username) file.owner = "all";
  });
  saveState();
  clearUserForm();
  renderAll();
  playSound("close");
});

newUserButton.addEventListener("click", clearUserForm);

fileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const record = {
    id: fileId.value || createId(),
    title: fileTitle.value.trim(),
    owner: fileOwner.value,
    classification: fileClass.value,
    content: fileContent.value,
  };

  if (!record.title || !record.content) {
    showDialog("Title and content are required.");
    return;
  }

  const index = state.files.findIndex((file) => file.id === record.id);
  if (index >= 0) {
    state.files[index] = record;
  } else {
    state.files.push(record);
  }

  saveState();
  renderAll();
  selectFile(record.id);
  playSound("open");
});

deleteFileButton.addEventListener("click", () => {
  if (!fileId.value) return;
  state.files = state.files.filter((file) => file.id !== fileId.value);
  saveState();
  clearFileForm();
  renderAll();
  playSound("close");
});

newFileButton.addEventListener("click", clearFileForm);

resetDemoData.addEventListener("click", () => {
  state = defaultState();
  saveState();
  currentUser = state.users.find((user) => user.username === "admin");
  sessionStorage.setItem(SESSION_KEY, currentUser.username);
  clearUserForm();
  clearFileForm();
  renderAll();
  playSound("error");
});

startButton.addEventListener("click", () => {
  if (!currentUser) return;
  startMenu.classList.toggle("hidden");
  startButton.classList.toggle("active");
  playSound("click");
});

desktop.addEventListener("pointerdown", () => {
  startMenu.classList.add("hidden");
  startButton.classList.remove("active");
});

windows.forEach((win) => {
  win.addEventListener("pointerdown", () => activateWindow(win));
  makeDraggable(win);
});

document.querySelectorAll("[data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => {
    dialog.classList.add("hidden");
    playSound("click");
  });
});

soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "♪" : "x";
  if (soundEnabled) playSound("click");
});

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

window.addEventListener("load", () => {
  updateClock();
  setInterval(updateClock, 1000);
  renderAll();
  if (currentUser) {
    openWindow("casefiles");
  }
  setTimeout(() => {
    bootScreen.classList.add("hidden");
    if (!currentUser) loginName.focus();
  }, 1800);
});
