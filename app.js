const STORAGE_KEY = "dg98-state-v1";
const SESSION_KEY = "dg98-session-v1";

const page = {
  desktop: document.querySelector("#desktop"),
  taskbar: document.querySelector("#taskbar"),
  bootScreen: document.querySelector("#bootScreen"),
  loginScreen: document.querySelector("#loginScreen"),
  startButton: document.querySelector("#startButton"),
  startMenu: document.querySelector("#startMenu"),
  taskButtons: document.querySelector("#taskButtons"),
  dialog: document.querySelector("#dialog"),
  dialogMessage: document.querySelector("#dialogMessage"),
  clock: document.querySelector("#clock"),
  soundButton: document.querySelector("#soundButton"),
  currentUserLabel: document.querySelector("#currentUserLabel"),
  logoutButton: document.querySelector("#logoutButton"),
  caseFileGrid: document.querySelector("#caseFileGrid"),
  fileList: document.querySelector("#fileList"),
  filePreview: document.querySelector("#filePreview"),
  terminalBody: document.querySelector("#terminalBody"),
  windows: [...document.querySelectorAll(".window")],
};

const loginForm = {
  form: document.querySelector("#loginForm"),
  name: document.querySelector("#loginName"),
  password: document.querySelector("#loginPassword"),
  error: document.querySelector("#loginError"),
  cancel: document.querySelector("#loginCancel"),
};

const userForm = {
  form: document.querySelector("#userForm"),
  originalName: document.querySelector("#userOriginalName"),
  name: document.querySelector("#userName"),
  password: document.querySelector("#userPassword"),
  displayName: document.querySelector("#userDisplayName"),
  isAdmin: document.querySelector("#userIsAdmin"),
  newButton: document.querySelector("#newUserButton"),
  deleteButton: document.querySelector("#deleteUserButton"),
  list: document.querySelector("#userList"),
};

const fileForm = {
  form: document.querySelector("#fileForm"),
  id: document.querySelector("#fileId"),
  title: document.querySelector("#fileTitle"),
  owner: document.querySelector("#fileOwner"),
  classification: document.querySelector("#fileClass"),
  content: document.querySelector("#fileContent"),
  newButton: document.querySelector("#newFileButton"),
  deleteButton: document.querySelector("#deleteFileButton"),
  list: document.querySelector("#adminFileList"),
};

const adminPanel = {
  users: document.querySelector("#adminUsers"),
  files: document.querySelector("#adminFiles"),
  resetButton: document.querySelector("#resetDemoData"),
};

let appData = loadAppData();
let loggedUser = findSavedSession();
let highestWindowLayer = 30;
let soundsAreEnabled = true;
let audioContext;
let startSoundPlayed = false;

function makeDemoData() {
  return {
    users: [
      { username: "admin", password: "admin", displayName: "Administrator", isAdmin: true },
      { username: "agent", password: "agent", displayName: "Agent KITE", isAdmin: false },
    ],
    files: [
      {
        id: makeId(),
        title: "BRIEFING.TXT",
        owner: "all",
        classification: "GREEN",
        content:
          "OPERATION: LAST LIGHT\nLocation: rural Pennsylvania, 1998.\nThree disappearances, one impossible phone call, and a federal evidence room logged open at 03:17.",
      },
      {
        id: makeId(),
        title: "AUDIO_TAPE_041.LOG",
        owner: "admin",
        classification: "BLACK",
        content:
          "Transcript fragment:\n[00:03] Static.\n[00:08] A child says the agent's full legal name.\n[00:11] Recording ends before the tape does.",
      },
      {
        id: makeId(),
        title: "MOTEL_RECEIPT.DOC",
        owner: "agent",
        classification: "AMBER",
        content:
          "Room 12 paid cash. Guest signed as R. Wake.\nClerk insists the guest left before checking in.",
      },
    ],
  };
}

function makeId() {
  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadAppData() {
  const savedData = localStorage.getItem(STORAGE_KEY);

  if (!savedData) {
    return resetAppData();
  }

  try {
    return JSON.parse(savedData);
  } catch {
    return resetAppData();
  }
}

function resetAppData() {
  const freshData = makeDemoData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
  return freshData;
}

function saveAppData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function findSavedSession() {
  const username = sessionStorage.getItem(SESSION_KEY);
  return findUser(username);
}

function findUser(username) {
  return appData.users.find((user) => user.username === username) || null;
}

function findFile(fileId) {
  return appData.files.find((file) => file.id === fileId) || null;
}

function userIsAdmin() {
  return Boolean(loggedUser && loggedUser.isAdmin);
}

function getVisibleFiles() {
  if (!loggedUser) return [];
  if (userIsAdmin()) return appData.files;
  return appData.files.filter((file) => file.owner === "all" || file.owner === loggedUser.username);
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioContext;
}

function playTone(frequency, duration, type = "square", gain = 0.04, delay = 0) {
  if (!soundsAreEnabled) return;

  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const startTime = context.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  volume.gain.setValueAtTime(gain, startTime);
  volume.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playSound(name) {
  const sounds = {
    open: [
      [660, 0.055],
      [880, 0.07, "square", 0.03, 0.055],
    ],
    close: [
      [440, 0.08, "triangle", 0.035],
      [220, 0.1, "triangle", 0.025, 0.06],
    ],
    error: [
      [160, 0.12, "sawtooth", 0.06],
      [120, 0.12, "sawtooth", 0.055, 0.13],
    ],
    start: [
      [523, 0.09, "triangle", 0.035],
      [659, 0.09, "triangle", 0.035, 0.09],
      [784, 0.16, "triangle", 0.035, 0.18],
    ],
    click: [[720, 0.035, "square", 0.025]],
  };

  sounds[name].forEach((tone) => playTone(...tone));
}

function unlockSound() {
  if (!soundsAreEnabled || startSoundPlayed) return;

  const context = getAudioContext();
  if (context.state === "suspended") {
    context.resume();
  }

  startSoundPlayed = true;
  playSound("start");
}

function showLogin() {
  page.loginScreen.classList.remove("hidden");
  page.desktop.classList.add("locked");
  page.taskbar.classList.add("locked");
  page.currentUserLabel.textContent = "No user";
  showAdminControls(false);
}

function showDesktop() {
  page.loginScreen.classList.add("hidden");
  page.desktop.classList.remove("locked");
  page.taskbar.classList.remove("locked");
  page.currentUserLabel.textContent = loggedUser.displayName;
  showAdminControls(userIsAdmin());
}

function showAdminControls(shouldShow) {
  document.querySelectorAll(".admin-only").forEach((element) => {
    element.classList.toggle("hidden", !shouldShow);
  });
}

function refreshScreen() {
  if (loggedUser) {
    showDesktop();
  } else {
    showLogin();
  }

  renderCaseFiles();
  renderFileManager();
  renderAdminPanel();
  renderTerminal();
}

function showMessage(message) {
  page.dialogMessage.textContent = message;
  page.dialog.classList.remove("hidden");
  page.dialog.style.zIndex = ++highestWindowLayer;
  playSound("error");
}

function activateWindow(windowElement) {
  if (!loggedUser) return;

  if (windowElement.id === "admin" && !userIsAdmin()) {
    showMessage("Access denied. Administrator privileges required.");
    return;
  }

  page.windows.forEach((windowItem) => windowItem.classList.remove("active"));
  windowElement.classList.remove("hidden");
  windowElement.classList.add("active");
  windowElement.style.zIndex = ++highestWindowLayer;
  renderTaskbarButtons();
}

function openWindow(windowId) {
  const windowElement = document.getElementById(windowId);
  if (!windowElement) return;

  activateWindow(windowElement);
  closeStartMenu();
  refreshScreen();
  playSound("open");
}

function closeWindow(windowElement) {
  if (!windowElement) return;

  windowElement.classList.add("hidden");
  windowElement.classList.remove("active");
  playSound("close");
  renderTaskbarButtons();
}

function minimizeWindow(windowElement) {
  windowElement.classList.add("hidden");
  windowElement.classList.remove("active");
  playSound("click");
  renderTaskbarButtons();
}

function toggleMaximizeWindow(windowElement) {
  if (windowElement.dataset.maximized === "true") {
    restoreWindowSize(windowElement);
  } else {
    maximizeWindow(windowElement);
  }

  activateWindow(windowElement);
  playSound("click");
}

function maximizeWindow(windowElement) {
  windowElement.dataset.prevLeft = windowElement.style.left;
  windowElement.dataset.prevTop = windowElement.style.top;
  windowElement.dataset.prevWidth = windowElement.style.width;
  windowElement.dataset.prevHeight = windowElement.style.height;
  windowElement.style.left = "8px";
  windowElement.style.top = "8px";
  windowElement.style.width = "calc(100vw - 16px)";
  windowElement.style.height = "calc(100vh - 46px)";
  windowElement.dataset.maximized = "true";
}

function restoreWindowSize(windowElement) {
  windowElement.style.left = windowElement.dataset.prevLeft;
  windowElement.style.top = windowElement.dataset.prevTop;
  windowElement.style.width = windowElement.dataset.prevWidth;
  windowElement.style.height = windowElement.dataset.prevHeight;
  windowElement.dataset.maximized = "false";
}

function renderTaskbarButtons() {
  page.taskButtons.innerHTML = "";

  getOpenWindows().forEach((windowElement) => {
    const button = document.createElement("button");
    button.textContent = windowElement.dataset.title;
    button.className = windowElement.classList.contains("active") ? "active" : "";
    button.addEventListener("click", () => toggleWindowFromTaskbar(windowElement));
    page.taskButtons.append(button);
  });
}

function getOpenWindows() {
  return page.windows.filter((windowElement) => !windowElement.classList.contains("hidden"));
}

function toggleWindowFromTaskbar(windowElement) {
  if (windowElement.classList.contains("active")) {
    minimizeWindow(windowElement);
  } else {
    activateWindow(windowElement);
    playSound("click");
  }
}

function makeWindowDraggable(windowElement) {
  const titleBar = windowElement.querySelector(".title-bar");
  let mouseStartX = 0;
  let mouseStartY = 0;
  let windowStartLeft = 0;
  let windowStartTop = 0;

  titleBar.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || windowElement.dataset.maximized === "true") return;

    activateWindow(windowElement);
    mouseStartX = event.clientX;
    mouseStartY = event.clientY;
    windowStartLeft = windowElement.offsetLeft;
    windowStartTop = windowElement.offsetTop;
    titleBar.setPointerCapture(event.pointerId);
  });

  titleBar.addEventListener("pointermove", (event) => {
    if (!titleBar.hasPointerCapture(event.pointerId)) return;

    const newLeft = windowStartLeft + event.clientX - mouseStartX;
    const newTop = windowStartTop + event.clientY - mouseStartY;
    windowElement.style.left = `${keepInsideScreen(newLeft, window.innerWidth - 80)}px`;
    windowElement.style.top = `${keepInsideScreen(newTop, window.innerHeight - 58)}px`;
  });

  titleBar.addEventListener("pointerup", (event) => {
    if (titleBar.hasPointerCapture(event.pointerId)) {
      titleBar.releasePointerCapture(event.pointerId);
    }
  });
}

function keepInsideScreen(value, maxValue) {
  return Math.max(0, Math.min(maxValue, value));
}

function renderCaseFiles() {
  page.caseFileGrid.innerHTML = "";

  getVisibleFiles().forEach((file) => {
    const fileButton = document.createElement("button");
    fileButton.className = "file-card";
    fileButton.innerHTML = `
      <span class="icon-doc small"></span>
      <strong>${safeText(file.title)}</strong>
      <small>${safeText(file.classification)} | ${file.owner === "all" ? "All users" : safeText(file.owner)}</small>
    `;
    fileButton.addEventListener("click", () => openFile(file.id));
    page.caseFileGrid.append(fileButton);
  });
}

function renderFileManager() {
  const files = getVisibleFiles();
  page.fileList.innerHTML = "";
  page.filePreview.value = "";

  if (!files.length) {
    page.fileList.innerHTML = '<p class="empty-state">No files available.</p>';
    return;
  }

  files.forEach((file, index) => {
    const button = makeFileListButton(file);
    page.fileList.append(button);

    if (index === 0) {
      selectFileInManager(file, button);
    }
  });
}

function makeFileListButton(file) {
  const button = document.createElement("button");
  button.className = "file-row";
  button.innerHTML = `<strong>${safeText(file.title)}</strong><span>${safeText(file.classification)}</span>`;
  button.addEventListener("click", () => selectFileInManager(file, button));
  return button;
}

function selectFileInManager(file, button) {
  page.filePreview.value = file.content;
  document.querySelectorAll(".file-row").forEach((row) => row.classList.remove("selected"));
  button.classList.add("selected");
}

function renderAdminPanel() {
  if (!userIsAdmin()) return;

  renderUserList();
  renderAdminFileList();
  renderFileOwnerOptions();
}

function renderUserList() {
  userForm.list.innerHTML = "";

  appData.users.forEach((user) => {
    const button = document.createElement("button");
    button.className = "admin-row";
    button.innerHTML = `<strong>${safeText(user.username)}</strong><span>${user.isAdmin ? "Admin" : "User"}</span>`;
    button.addEventListener("click", () => fillUserForm(user.username));
    userForm.list.append(button);
  });
}

function renderAdminFileList() {
  fileForm.list.innerHTML = "";

  appData.files.forEach((file) => {
    const button = document.createElement("button");
    button.className = "admin-row";
    button.innerHTML = `<strong>${safeText(file.title)}</strong><span>${safeText(file.owner)} / ${safeText(file.classification)}</span>`;
    button.addEventListener("click", () => fillFileForm(file.id));
    fileForm.list.append(button);
  });
}

function renderFileOwnerOptions() {
  fileForm.owner.innerHTML = '<option value="all">All users</option>';

  appData.users.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.username;
    option.textContent = user.displayName;
    fileForm.owner.append(option);
  });
}

function renderTerminal() {
  if (!loggedUser) return;

  page.terminalBody.innerHTML = `
    <p>DELTA GREEN NETWORK NODE 7.13</p>
    <p>C:\\DGNET&gt; whoami</p>
    <p>${safeText(loggedUser.username)} (${userIsAdmin() ? "administrator" : "field user"})</p>
    <p>C:\\DGNET&gt; status</p>
    <p>Files visible: ${getVisibleFiles().length} | Users: ${userIsAdmin() ? appData.users.length : "restricted"} | Threat index: amber</p>
    <p>C:\\DGNET&gt; <span class="cursor">_</span></p>
  `;
}

function openFile(fileId) {
  const file = getVisibleFiles().find((item) => item.id === fileId);

  if (!file) {
    showMessage("File not found or access denied.");
    return;
  }

  openWindow("files");
  page.filePreview.value = file.content;
}

function fillUserForm(username) {
  const user = findUser(username);
  if (!user) return;

  userForm.originalName.value = user.username;
  userForm.name.value = user.username;
  userForm.password.value = user.password;
  userForm.displayName.value = user.displayName;
  userForm.isAdmin.checked = user.isAdmin;
}

function clearUserForm() {
  userForm.originalName.value = "";
  userForm.name.value = "";
  userForm.password.value = "";
  userForm.displayName.value = "";
  userForm.isAdmin.checked = false;
  userForm.name.focus();
}

function saveUser(event) {
  event.preventDefault();

  const oldUsername = userForm.originalName.value;
  const user = readUserForm();

  if (!user.username || !user.password || !user.displayName) {
    showMessage("User name, password and display name are required.");
    return;
  }

  if (usernameAlreadyExists(user.username, oldUsername)) {
    showMessage("This user name already exists.");
    return;
  }

  if (oldUsername) {
    updateUser(oldUsername, user);
  } else {
    appData.users.push(user);
  }

  saveAppData();
  refreshScreen();
  fillUserForm(user.username);
  playSound("open");
}

function readUserForm() {
  return {
    username: userForm.name.value.trim(),
    password: userForm.password.value,
    displayName: userForm.displayName.value.trim(),
    isAdmin: userForm.isAdmin.checked,
  };
}

function usernameAlreadyExists(username, oldUsername) {
  return appData.users.some((user) => user.username === username && user.username !== oldUsername);
}

function updateUser(oldUsername, newUser) {
  const index = appData.users.findIndex((user) => user.username === oldUsername);
  appData.users[index] = newUser;

  appData.files.forEach((file) => {
    if (file.owner === oldUsername) {
      file.owner = newUser.username;
    }
  });

  if (loggedUser.username === oldUsername) {
    loggedUser = newUser;
    sessionStorage.setItem(SESSION_KEY, newUser.username);
  }
}

function deleteSelectedUser() {
  const username = userForm.originalName.value;
  if (!username) return;

  if (username === loggedUser.username) {
    showMessage("You cannot delete the logged-in user.");
    return;
  }

  if (appData.users.length <= 1) {
    showMessage("At least one user must remain.");
    return;
  }

  appData.users = appData.users.filter((user) => user.username !== username);
  appData.files.forEach((file) => {
    if (file.owner === username) {
      file.owner = "all";
    }
  });

  saveAppData();
  clearUserForm();
  refreshScreen();
  playSound("close");
}

function fillFileForm(fileId) {
  const file = findFile(fileId);
  if (!file) return;

  fileForm.id.value = file.id;
  fileForm.title.value = file.title;
  fileForm.owner.value = file.owner;
  fileForm.classification.value = file.classification;
  fileForm.content.value = file.content;
}

function clearFileForm() {
  fileForm.id.value = "";
  fileForm.title.value = "";
  fileForm.owner.value = "all";
  fileForm.classification.value = "GREEN";
  fileForm.content.value = "";
  fileForm.title.focus();
}

function saveFile(event) {
  event.preventDefault();

  const file = readFileForm();

  if (!file.title || !file.content) {
    showMessage("Title and content are required.");
    return;
  }

  const index = appData.files.findIndex((savedFile) => savedFile.id === file.id);
  if (index >= 0) {
    appData.files[index] = file;
  } else {
    appData.files.push(file);
  }

  saveAppData();
  refreshScreen();
  fillFileForm(file.id);
  playSound("open");
}

function readFileForm() {
  return {
    id: fileForm.id.value || makeId(),
    title: fileForm.title.value.trim(),
    owner: fileForm.owner.value,
    classification: fileForm.classification.value,
    content: fileForm.content.value,
  };
}

function deleteSelectedFile() {
  if (!fileForm.id.value) return;

  appData.files = appData.files.filter((file) => file.id !== fileForm.id.value);
  saveAppData();
  clearFileForm();
  refreshScreen();
  playSound("close");
}

function switchAdminTab(tabName) {
  adminPanel.users.classList.toggle("hidden", tabName !== "users");
  adminPanel.files.classList.toggle("hidden", tabName !== "files");
}

function logIn(username, password) {
  const user = appData.users.find((savedUser) => savedUser.username === username && savedUser.password === password);

  if (!user) {
    loginForm.error.textContent = "Invalid user name or password.";
    playSound("error");
    return;
  }

  loggedUser = user;
  sessionStorage.setItem(SESSION_KEY, user.username);
  loginForm.error.textContent = "";
  loginForm.password.value = "";
  refreshScreen();
  openWindow("casefiles");
  playSound("open");
}

function logOut() {
  sessionStorage.removeItem(SESSION_KEY);
  loggedUser = null;
  closeAllWindows();
  closeStartMenu();
  renderTaskbarButtons();
  refreshScreen();
  loginForm.name.value = "admin";
  loginForm.password.value = "";
  loginForm.name.focus();
  playSound("close");
}

function closeAllWindows() {
  page.windows.forEach((windowElement) => {
    windowElement.classList.add("hidden");
    windowElement.classList.remove("active");
  });
}

function closeStartMenu() {
  page.startMenu.classList.add("hidden");
  page.startButton.classList.remove("active");
}

function clearLoginForm() {
  loginForm.name.value = "";
  loginForm.password.value = "";
  loginForm.error.textContent = "";
  playSound("click");
}

function resetDemoState() {
  appData = resetAppData();
  loggedUser = findUser("admin");
  sessionStorage.setItem(SESSION_KEY, loggedUser.username);
  clearUserForm();
  clearFileForm();
  refreshScreen();
  playSound("error");
}

function safeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function handlePageClick(event) {
  unlockSound();

  const openTarget = event.target.closest("[data-open]");
  const alertTarget = event.target.closest("[data-alert]");
  const windowActionTarget = event.target.closest("[data-action]");
  const adminTabTarget = event.target.closest("[data-admin-tab]");
  const adminOpenTabTarget = event.target.closest("[data-admin-open-tab]");

  if (openTarget) {
    openWindow(openTarget.dataset.open);
    return;
  }

  if (alertTarget) {
    showMessage(alertTarget.dataset.alert);
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

  if (windowActionTarget) {
    runWindowAction(windowActionTarget);
  }
}

function runWindowAction(actionButton) {
  const windowElement = actionButton.closest(".window");
  const actionName = actionButton.dataset.action;

  if (actionName === "close") closeWindow(windowElement);
  if (actionName === "minimize") minimizeWindow(windowElement);
  if (actionName === "maximize") toggleMaximizeWindow(windowElement);
}

function handleLoginSubmit(event) {
  event.preventDefault();
  unlockSound();
  logIn(loginForm.name.value.trim(), loginForm.password.value);
}

function toggleStartMenu() {
  if (!loggedUser) return;

  page.startMenu.classList.toggle("hidden");
  page.startButton.classList.toggle("active");
  playSound("click");
}

function toggleSound() {
  soundsAreEnabled = !soundsAreEnabled;
  page.soundButton.textContent = soundsAreEnabled ? "♪" : "x";
  if (soundsAreEnabled) playSound("click");
}

function updateClock() {
  const now = new Date();
  page.clock.textContent = now.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startApp() {
  updateClock();
  setInterval(updateClock, 1000);
  refreshScreen();

  if (loggedUser) {
    openWindow("casefiles");
  }

  setTimeout(() => {
    page.bootScreen.classList.add("hidden");
    if (!loggedUser) loginForm.name.focus();
  }, 1800);
}

document.addEventListener("click", handlePageClick);
loginForm.form.addEventListener("submit", handleLoginSubmit);
loginForm.cancel.addEventListener("click", clearLoginForm);
page.logoutButton.addEventListener("click", logOut);
userForm.form.addEventListener("submit", saveUser);
userForm.deleteButton.addEventListener("click", deleteSelectedUser);
userForm.newButton.addEventListener("click", clearUserForm);
fileForm.form.addEventListener("submit", saveFile);
fileForm.deleteButton.addEventListener("click", deleteSelectedFile);
fileForm.newButton.addEventListener("click", clearFileForm);
adminPanel.resetButton.addEventListener("click", resetDemoState);
page.startButton.addEventListener("click", toggleStartMenu);
page.desktop.addEventListener("pointerdown", closeStartMenu);
page.soundButton.addEventListener("click", toggleSound);
window.addEventListener("load", startApp);

page.windows.forEach((windowElement) => {
  windowElement.addEventListener("pointerdown", () => activateWindow(windowElement));
  makeWindowDraggable(windowElement);
});

document.querySelectorAll("[data-dialog-close]").forEach((button) => {
  button.addEventListener("click", () => {
    page.dialog.classList.add("hidden");
    playSound("click");
  });
});
