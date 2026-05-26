import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

const STORAGE_KEY = "dg98-state-v1";
const SESSION_KEY = "dg98-session-v1";

const defaultWindows = {
  casefiles: { title: "Case Files", left: 210, top: 70, width: 520, visible: false },
  files: { title: "My Files", left: 250, top: 105, width: 560, visible: false },
  admin: { title: "Admin Tools", left: 170, top: 80, width: 680, visible: false },
  mail: { title: "E-Mail", left: 280, top: 115, width: 500, visible: false },
  terminal: { title: "DG Console", left: 150, top: 150, width: 560, visible: false },
  briefing: { title: "Briefing.txt", left: 340, top: 80, width: 460, visible: false },
  evidence: { title: "Evidence (A:)", left: 430, top: 165, width: 390, visible: false },
  trash: { title: "Recycle Bin", left: 500, top: 90, width: 330, visible: false },
};

function makeId() {
  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) return makeDemoData();

  try {
    return JSON.parse(savedData);
  } catch {
    return makeDemoData();
  }
}

function useSound() {
  const [enabled, setEnabled] = useState(true);
  const contextRef = useRef(null);
  const startPlayedRef = useRef(false);

  function getContext() {
    if (!contextRef.current) {
      contextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return contextRef.current;
  }

  function tone(frequency, duration, type = "square", gain = 0.04, delay = 0) {
    if (!enabled) return;

    const context = getContext();
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const start = context.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    volume.gain.setValueAtTime(gain, start);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function play(name) {
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

    sounds[name].forEach((sound) => tone(...sound));
  }

  function unlock() {
    if (!enabled || startPlayedRef.current) return;

    const context = getContext();
    if (context.state === "suspended") context.resume();
    startPlayedRef.current = true;
    play("start");
  }

  function toggle() {
    setEnabled((current) => !current);
  }

  return { enabled, play, toggle, unlock };
}

function App() {
  const [bootVisible, setBootVisible] = useState(true);
  const [data, setData] = useState(loadData);
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem(SESSION_KEY);
    return loadData().users.find((account) => account.username === savedUser) || null;
  });
  const [login, setLogin] = useState({ username: "admin", password: "admin", error: "" });
  const [windows, setWindows] = useState(defaultWindows);
  const [activeWindow, setActiveWindow] = useState(null);
  const [startOpen, setStartOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [clock, setClock] = useState("");
  const [adminTab, setAdminTab] = useState("users");
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [userDraft, setUserDraft] = useState(emptyUserDraft());
  const [fileDraft, setFileDraft] = useState(emptyFileDraft());
  const sound = useSound();

  const isAdmin = Boolean(user?.isAdmin);
  const visibleFiles = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return data.files;
    return data.files.filter((file) => file.owner === "all" || file.owner === user.username);
  }, [data.files, isAdmin, user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);

    setClock(new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }));
    setTimeout(() => setBootVisible(false), 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) openWindow("casefiles");
  }, []);

  useEffect(() => {
    if (!selectedFileId && visibleFiles.length) setSelectedFileId(visibleFiles[0].id);
  }, [selectedFileId, visibleFiles]);

  function openWindow(id) {
    if (id === "admin" && !isAdmin) {
      showDialog("Access denied. Administrator privileges required.");
      return;
    }

    setWindows((current) => ({
      ...current,
      [id]: { ...current[id], visible: true },
    }));
    setActiveWindow(id);
    setStartOpen(false);
    sound.play("open");
  }

  function closeWindow(id) {
    setWindows((current) => ({
      ...current,
      [id]: { ...current[id], visible: false },
    }));
    if (activeWindow === id) setActiveWindow(null);
    sound.play("close");
  }

  function minimizeWindow(id) {
    setWindows((current) => ({
      ...current,
      [id]: { ...current[id], visible: false },
    }));
    if (activeWindow === id) setActiveWindow(null);
    sound.play("click");
  }

  function maximizeWindow(id) {
    setWindows((current) => {
      const item = current[id];
      if (item.maximized) {
        return { ...current, [id]: { ...item.previous, visible: true, title: item.title } };
      }

      return {
        ...current,
        [id]: {
          ...item,
          previous: item,
          left: 8,
          top: 8,
          width: "calc(100vw - 16px)",
          height: "calc(100vh - 46px)",
          maximized: true,
        },
      };
    });
    setActiveWindow(id);
    sound.play("click");
  }

  function moveWindow(id, left, top) {
    setWindows((current) => ({
      ...current,
      [id]: { ...current[id], left, top },
    }));
  }

  function logIn(event) {
    event.preventDefault();
    sound.unlock();

    const account = data.users.find(
      (item) => item.username === login.username.trim() && item.password === login.password,
    );

    if (!account) {
      setLogin((current) => ({ ...current, error: "Invalid user name or password." }));
      sound.play("error");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, account.username);
    setUser(account);
    setLogin({ username: account.username, password: "", error: "" });
    openWindow("casefiles");
  }

  function logOut() {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setWindows(defaultWindows);
    setActiveWindow(null);
    setStartOpen(false);
    setLogin({ username: "admin", password: "", error: "" });
    sound.play("close");
  }

  function showDialog(message) {
    setDialog(message);
    sound.play("error");
  }

  function resetData() {
    const freshData = makeDemoData();
    const admin = freshData.users[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
    sessionStorage.setItem(SESSION_KEY, admin.username);
    setData(freshData);
    setUser(admin);
    setUserDraft(emptyUserDraft());
    setFileDraft(emptyFileDraft());
    sound.play("error");
  }

  function saveUser(event) {
    event.preventDefault();

    if (!userDraft.username || !userDraft.password || !userDraft.displayName) {
      showDialog("User name, password and display name are required.");
      return;
    }

    const duplicate = data.users.some(
      (account) => account.username === userDraft.username && account.username !== userDraft.originalName,
    );

    if (duplicate) {
      showDialog("This user name already exists.");
      return;
    }

    setData((current) => {
      const updatedUser = {
        username: userDraft.username,
        password: userDraft.password,
        displayName: userDraft.displayName,
        isAdmin: userDraft.isAdmin,
      };

      const users = userDraft.originalName
        ? current.users.map((account) => (account.username === userDraft.originalName ? updatedUser : account))
        : [...current.users, updatedUser];

      const files = current.files.map((file) =>
        file.owner === userDraft.originalName ? { ...file, owner: updatedUser.username } : file,
      );

      if (user?.username === userDraft.originalName) {
        setUser(updatedUser);
        sessionStorage.setItem(SESSION_KEY, updatedUser.username);
      }

      return { users, files };
    });

    sound.play("open");
  }

  function deleteUser() {
    if (!userDraft.originalName) return;

    if (userDraft.originalName === user.username) {
      showDialog("You cannot delete the logged-in user.");
      return;
    }

    if (data.users.length <= 1) {
      showDialog("At least one user must remain.");
      return;
    }

    setData((current) => ({
      users: current.users.filter((account) => account.username !== userDraft.originalName),
      files: current.files.map((file) => (file.owner === userDraft.originalName ? { ...file, owner: "all" } : file)),
    }));
    setUserDraft(emptyUserDraft());
    sound.play("close");
  }

  function saveFile(event) {
    event.preventDefault();

    if (!fileDraft.title || !fileDraft.content) {
      showDialog("Title and content are required.");
      return;
    }

    const file = { ...fileDraft, id: fileDraft.id || makeId() };
    setData((current) => {
      const exists = current.files.some((item) => item.id === file.id);
      const files = exists
        ? current.files.map((item) => (item.id === file.id ? file : item))
        : [...current.files, file];

      return { ...current, files };
    });
    setFileDraft(file);
    setSelectedFileId(file.id);
    sound.play("open");
  }

  function deleteFile() {
    if (!fileDraft.id) return;

    setData((current) => ({
      ...current,
      files: current.files.filter((file) => file.id !== fileDraft.id),
    }));
    setFileDraft(emptyFileDraft());
    setSelectedFileId(null);
    sound.play("close");
  }

  const selectedFile = visibleFiles.find((file) => file.id === selectedFileId) || visibleFiles[0] || null;
  const openWindows = Object.entries(windows).filter(([, item]) => item.visible);

  return (
    <>
      {bootVisible && <BootScreen />}
      {!user && (
        <LoginScreen
          login={login}
          onChange={setLogin}
          onSubmit={logIn}
          onCancel={() => setLogin({ username: "", password: "", error: "" })}
        />
      )}
      <main className={`desktop ${user ? "" : "locked"}`} id="desktop" aria-label="Pulpit Delta Green 98">
        <div className="wallpaper-logo" aria-hidden="true">
          <span></span>
        </div>
        <DesktopIcons isAdmin={isAdmin} openWindow={openWindow} />
        <AppWindow id="casefiles" title="CASEFILES - CLASSIFIED" state={windows.casefiles} active={activeWindow === "casefiles"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <div className="menu-bar"><span>File</span><span>Edit</span><span>View</span><span>Tools</span><span>Help</span></div>
          <CaseFiles files={visibleFiles} openFile={(id) => { setSelectedFileId(id); openWindow("files"); }} />
        </AppWindow>
        <AppWindow id="files" title="My Files" state={windows.files} active={activeWindow === "files"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <div className="menu-bar">
            {isAdmin && <button className="menu-command" onClick={() => { openWindow("admin"); setAdminTab("files"); }}>New File</button>}
            <span>View</span><span>Tools</span><span>Help</span>
          </div>
          <FileManager files={visibleFiles} selectedFile={selectedFile} onSelect={setSelectedFileId} />
        </AppWindow>
        <AppWindow id="admin" title="User Manager - DGNET" state={windows.admin} active={activeWindow === "admin"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <AdminTools
            data={data}
            activeTab={adminTab}
            setActiveTab={setAdminTab}
            userDraft={userDraft}
            setUserDraft={setUserDraft}
            fileDraft={fileDraft}
            setFileDraft={setFileDraft}
            saveUser={saveUser}
            deleteUser={deleteUser}
            saveFile={saveFile}
            deleteFile={deleteFile}
            resetData={resetData}
          />
        </AppWindow>
        <AppWindow id="mail" title="Outlook Express - delta.green.gov" state={windows.mail} active={activeWindow === "mail"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <MailWindow />
        </AppWindow>
        <AppWindow id="terminal" title="MS-DOS Prompt - DGNET" state={windows.terminal} active={activeWindow === "terminal"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <Terminal user={user} isAdmin={isAdmin} filesCount={visibleFiles.length} usersCount={data.users.length} />
        </AppWindow>
        <AppWindow id="briefing" title="Notepad - Briefing.txt" state={windows.briefing} active={activeWindow === "briefing"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <Briefing />
        </AppWindow>
        <AppWindow id="evidence" title="Evidence (A:)" state={windows.evidence} active={activeWindow === "evidence"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <div className="window-body evidence-body">
            <div className="disk-warning">Drive A: not ready</div>
            <button onClick={() => showDialog("You hear a short mechanical grind. The diskette returns to the slot.")}>Retry</button>
            <button onClick={() => closeWindow("evidence")}>Cancel</button>
          </div>
        </AppWindow>
        <AppWindow id="trash" title="Recycle Bin" state={windows.trash} active={activeWindow === "trash"} onActivate={setActiveWindow} onMove={moveWindow} onMinimize={minimizeWindow} onMaximize={maximizeWindow} onClose={closeWindow}>
          <div className="window-body trash-body">
            <p>This folder is empty.</p>
            <p className="faint">A torn evidence tag appears when nobody is looking.</p>
          </div>
        </AppWindow>
      </main>
      <StartMenu visible={startOpen} isAdmin={isAdmin} openWindow={openWindow} showDialog={showDialog} logOut={logOut} />
      {dialog && <Dialog message={dialog} close={() => setDialog(null)} />}
      <Taskbar
        locked={!user}
        startOpen={startOpen}
        setStartOpen={setStartOpen}
        openWindows={openWindows}
        activeWindow={activeWindow}
        setActiveWindow={setActiveWindow}
        minimizeWindow={minimizeWindow}
        currentUser={user}
        clock={clock}
        soundEnabled={sound.enabled}
        toggleSound={sound.toggle}
      />
    </>
  );
}

function emptyUserDraft() {
  return { originalName: "", username: "", password: "", displayName: "", isAdmin: false };
}

function emptyFileDraft() {
  return { id: "", title: "", owner: "all", classification: "GREEN", content: "" };
}

function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-box">
        <div className="boot-logo">Delta Green 98</div>
        <div className="boot-copy">Restricted case workstation</div>
        <div className="boot-progress"><span></span></div>
      </div>
    </div>
  );
}

function LoginScreen({ login, onChange, onSubmit, onCancel }) {
  return (
    <section className="login-screen" aria-label="Logowanie">
      <form className="login-window" onSubmit={onSubmit}>
        <div className="title-bar"><span>Log On to Delta Green Network</span></div>
        <div className="login-body">
          <div className="login-mark" aria-label="Delta Green logo"><span></span></div>
          <div className="login-fields">
            <label>User name<input autoComplete="username" value={login.username} onChange={(event) => onChange({ ...login, username: event.target.value })} /></label>
            <label>Password<input type="password" autoComplete="current-password" value={login.password} onChange={(event) => onChange({ ...login, password: event.target.value })} /></label>
            <p className="login-hint">Default: admin / admin</p>
            <p className="login-error">{login.error}</p>
          </div>
        </div>
        <div className="login-actions">
          <button type="submit">OK</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function DesktopIcons({ isAdmin, openWindow }) {
  const icons = [
    ["casefiles", "icon-folder", "Case Files"],
    ["mail", "icon-mail", "E-Mail"],
    ["files", "icon-folder", "My Files"],
    ["terminal", "icon-terminal", "DG Console"],
    ["briefing", "icon-doc", "Briefing.txt"],
    ["evidence", "icon-drive", "Evidence (A:)"],
    ["trash", "icon-trash", "Recycle Bin"],
  ];

  return (
    <section className="desktop-icons" aria-label="Ikony pulpitu">
      {icons.map(([id, icon, label]) => (
        <button className="desktop-icon" key={id} onClick={() => openWindow(id)}>
          <span className={icon}></span><span>{label}</span>
        </button>
      ))}
      {isAdmin && (
        <button className="desktop-icon" onClick={() => openWindow("admin")}>
          <span className="icon-admin"></span><span>Admin Tools</span>
        </button>
      )}
    </section>
  );
}

function AppWindow({ id, title, state, active, onActivate, onMove, onMinimize, onMaximize, onClose, children }) {
  const dragStart = useRef(null);

  if (!state.visible) return null;

  function startDrag(event) {
    if (event.target.closest("button") || state.maximized) return;
    onActivate(id);
    dragStart.current = { mouseX: event.clientX, mouseY: event.clientY, left: state.left, top: state.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event) {
    if (!dragStart.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const left = Math.max(0, Math.min(window.innerWidth - 80, dragStart.current.left + event.clientX - dragStart.current.mouseX));
    const top = Math.max(0, Math.min(window.innerHeight - 58, dragStart.current.top + event.clientY - dragStart.current.mouseY));
    onMove(id, left, top);
  }

  function endDrag(event) {
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <article
      className={`window ${active ? "active" : ""}`}
      style={{ left: state.left, top: state.top, width: state.width, height: state.height, zIndex: active ? 40 : 5 }}
      onPointerDown={() => onActivate(id)}
    >
      <header className="title-bar" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag}>
        <span>{title}</span>
        <div className="window-buttons">
          <button onClick={() => onMinimize(id)} aria-label="Minimalizuj">_</button>
          <button onClick={() => onMaximize(id)} aria-label="Maksymalizuj">□</button>
          <button onClick={() => onClose(id)} aria-label="Zamknij">x</button>
        </div>
      </header>
      {children}
    </article>
  );
}

function CaseFiles({ files, openFile }) {
  return (
    <div className="window-body file-grid">
      {files.map((file) => (
        <button className="file-card" key={file.id} onClick={() => openFile(file.id)}>
          <span className="icon-doc small"></span>
          <strong>{file.title}</strong>
          <small>{file.classification} | {file.owner === "all" ? "All users" : file.owner}</small>
        </button>
      ))}
    </div>
  );
}

function FileManager({ files, selectedFile, onSelect }) {
  return (
    <div className="window-body file-manager">
      <div className="file-list">
        {files.length ? files.map((file) => (
          <button className={`file-row ${selectedFile?.id === file.id ? "selected" : ""}`} key={file.id} onClick={() => onSelect(file.id)}>
            <strong>{file.title}</strong><span>{file.classification}</span>
          </button>
        )) : <p className="empty-state">No files available.</p>}
      </div>
      <textarea readOnly value={selectedFile?.content || ""}></textarea>
    </div>
  );
}

function AdminTools(props) {
  return (
    <>
      <div className="menu-bar">
        <button className="menu-command" onClick={() => props.setActiveTab("users")}>Users</button>
        <button className="menu-command" onClick={() => props.setActiveTab("files")}>Files</button>
        <button className="menu-command" onClick={props.resetData}>Reset Data</button>
      </div>
      <div className="window-body admin-body">
        {props.activeTab === "users" ? <UserEditor {...props} /> : <FileEditor {...props} />}
      </div>
    </>
  );
}

function UserEditor({ data, userDraft, setUserDraft, saveUser, deleteUser }) {
  return (
    <section className="admin-panel">
      <div className="admin-list">
        {data.users.map((user) => (
          <button className="admin-row" key={user.username} onClick={() => setUserDraft({ originalName: user.username, ...user })}>
            <strong>{user.username}</strong><span>{user.isAdmin ? "Admin" : "User"}</span>
          </button>
        ))}
      </div>
      <form className="admin-form" onSubmit={saveUser}>
        <h3>User record</h3>
        <label>User name <input required value={userDraft.username} onChange={(event) => setUserDraft({ ...userDraft, username: event.target.value })} /></label>
        <label>Password <input required value={userDraft.password} onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })} /></label>
        <label>Display name <input required value={userDraft.displayName} onChange={(event) => setUserDraft({ ...userDraft, displayName: event.target.value })} /></label>
        <label className="check-row"><input type="checkbox" checked={userDraft.isAdmin} onChange={(event) => setUserDraft({ ...userDraft, isAdmin: event.target.checked })} /> Administrator</label>
        <div className="form-actions">
          <button type="submit">Save</button>
          <button type="button" onClick={() => setUserDraft(emptyUserDraft())}>New</button>
          <button type="button" onClick={deleteUser}>Delete</button>
        </div>
      </form>
    </section>
  );
}

function FileEditor({ data, fileDraft, setFileDraft, saveFile, deleteFile }) {
  return (
    <section className="admin-panel">
      <div className="admin-list">
        {data.files.map((file) => (
          <button className="admin-row" key={file.id} onClick={() => setFileDraft(file)}>
            <strong>{file.title}</strong><span>{file.owner} / {file.classification}</span>
          </button>
        ))}
      </div>
      <form className="admin-form" onSubmit={saveFile}>
        <h3>File record</h3>
        <label>Title <input required value={fileDraft.title} onChange={(event) => setFileDraft({ ...fileDraft, title: event.target.value })} /></label>
        <label>Owner
          <select value={fileDraft.owner} onChange={(event) => setFileDraft({ ...fileDraft, owner: event.target.value })}>
            <option value="all">All users</option>
            {data.users.map((user) => <option key={user.username} value={user.username}>{user.displayName}</option>)}
          </select>
        </label>
        <label>Classification
          <select value={fileDraft.classification} onChange={(event) => setFileDraft({ ...fileDraft, classification: event.target.value })}>
            <option>GREEN</option><option>AMBER</option><option>BLACK</option>
          </select>
        </label>
        <label>Content <textarea required value={fileDraft.content} onChange={(event) => setFileDraft({ ...fileDraft, content: event.target.value })}></textarea></label>
        <div className="form-actions">
          <button type="submit">Save</button>
          <button type="button" onClick={() => setFileDraft(emptyFileDraft())}>New</button>
          <button type="button" onClick={deleteFile}>Delete</button>
        </div>
      </form>
    </section>
  );
}

function MailWindow() {
  return (
    <>
      <div className="menu-bar"><span>File</span><span>Edit</span><span>Send/Recv</span><span>Address</span></div>
      <div className="window-body mail-layout">
        <aside><button>Inbox (3)</button><button>Sent Items</button><button>Drafts</button><button>Deleted Items</button></aside>
        <section>
          <button className="mail-row selected">From: A-Cell | Subject: keep this offline</button>
          <button className="mail-row">From: S. Kline | Subject: autopsy discrepancy</button>
          <button className="mail-row">From: Unknown | Subject: you opened the door</button>
          <div className="mail-preview"><strong>Agents,</strong><p>Use this terminal only for in-session material. Anything marked BLACK goes to the handler first.</p></div>
        </section>
      </div>
    </>
  );
}

function Terminal({ user, isAdmin, filesCount, usersCount }) {
  return (
    <div className="window-body terminal-body">
      <p>DELTA GREEN NETWORK NODE 7.13</p>
      <p>C:\DGNET&gt; whoami</p>
      <p>{user?.username} ({isAdmin ? "administrator" : "field user"})</p>
      <p>C:\DGNET&gt; status</p>
      <p>Files visible: {filesCount} | Users: {isAdmin ? usersCount : "restricted"} | Threat index: amber</p>
      <p>C:\DGNET&gt; <span className="cursor">_</span></p>
    </div>
  );
}

function Briefing() {
  return (
    <>
      <div className="menu-bar"><span>File</span><span>Edit</span><span>Search</span><span>Help</span></div>
      <div className="window-body notepad">
        <p>OPERATION: LAST LIGHT</p>
        <p>Location: rural Pennsylvania, 1998.</p>
        <p>Brief: Three disappearances, one impossible phone call, and a federal evidence room that logged itself open at 03:17.</p>
        <p>Keep civilians calm. Keep the Program out of the report.</p>
      </div>
    </>
  );
}

function StartMenu({ visible, isAdmin, openWindow, showDialog, logOut }) {
  if (!visible) return null;

  return (
    <div className="start-menu" aria-label="Menu Start">
      <div className="start-brand">Delta Green 98</div>
      <div className="start-items">
        <button onClick={() => openWindow("casefiles")}><span className="icon-folder tiny"></span> Programs</button>
        <button onClick={() => openWindow("files")}><span className="icon-folder tiny"></span> My Files</button>
        {isAdmin && <button onClick={() => openWindow("admin")}><span className="icon-admin tiny"></span> Admin Tools</button>}
        <button onClick={() => openWindow("terminal")}><span className="icon-terminal tiny"></span> MS-DOS Prompt</button>
        <button onClick={() => showDialog("Connection refused by remote host.")}><span className="icon-drive tiny"></span> Network</button>
        <hr />
        <button onClick={logOut}><span className="icon-shutdown tiny"></span> Log Off...</button>
        <button onClick={() => showDialog("It is not currently safe to shut down.")}><span className="icon-shutdown tiny"></span> Shut Down...</button>
      </div>
    </div>
  );
}

function Dialog({ message, close }) {
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
      <div className="title-bar"><span id="dialogTitle">Delta Green</span><div className="window-buttons"><button onClick={close} aria-label="Zamknij">x</button></div></div>
      <div className="dialog-body"><div className="dialog-icon">!</div><p>{message}</p></div>
      <div className="dialog-actions"><button onClick={close}>OK</button></div>
    </div>
  );
}

function Taskbar({ locked, startOpen, setStartOpen, openWindows, activeWindow, setActiveWindow, minimizeWindow, currentUser, clock, soundEnabled, toggleSound }) {
  return (
    <footer className={`taskbar ${locked ? "locked" : ""}`}>
      <button className={`start-button ${startOpen ? "active" : ""}`} onClick={() => setStartOpen(!startOpen)}><span className="windows-mark"></span> Start</button>
      <div className="task-buttons">
        {openWindows.map(([id, item]) => (
          <button key={id} className={activeWindow === id ? "active" : ""} onClick={() => activeWindow === id ? minimizeWindow(id) : setActiveWindow(id)}>
            {item.title}
          </button>
        ))}
      </div>
      <div className="tray">
        <button className="tray-button" onClick={toggleSound} aria-label="Przelacz dzwiek">{soundEnabled ? "♪" : "x"}</button>
        <span id="currentUserLabel">{currentUser ? currentUser.displayName : "No user"}</span>
        <span>{clock}</span>
      </div>
    </footer>
  );
}

createRoot(document.querySelector("#root")).render(<App />);
