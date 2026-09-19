const STORAGE_KEY = "codespace_workspace_v2";

const defaultWorkspace = {
  name: "Mon espace",
  files: {
    "index.html": { type: "text", data: "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Mon site</title>\n</head>\n<body>\n  <h1>Bonjour Codespace</h1>\n</body>\n</html>" },
    "style.css": { type: "text", data: "body {\n  font-family: Arial, sans-serif;\n  padding: 40px;\n}\n" },
    "script.js": { type: "text", data: "console.log('Codespace');\n" }
  }
};

let workspace = loadWorkspace();
let currentFile = "";
let openFiles = [];
const collapsedFolders = new Set();

const $ = id => document.getElementById(id);
const filesEl = $("files");
const tabsEl = $("tabs");
const editor = $("codeEditor");
const codeHighlight = $("codeHighlight");
const preview = $("preview");
const currentFileEl = $("currentFile");
const lineNumbers = $("lineNumbers");
const saveState = $("saveState");
const cursorPosition = $("cursorPosition");
const languageLabel = $("languageLabel");
const fileCount = $("fileCount");
const fileCountSide = $("fileCountSide");
const projectTitle = $("projectTitle");
const topWorkspaceName = $("topWorkspaceName");

function normalizeFile(value) {
  if (typeof value === "string") return { type: "text", data: value };
  if (value && value.type === "binary" && typeof value.data === "string") return value;
  if (value && typeof value.data === "string") return { type: "text", data: value.data };
  return { type: "text", data: "" };
}

function readSavedWorkspace(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
    return null;
  }
}

function loadWorkspace() {
  const saved = readSavedWorkspace(STORAGE_KEY);

  if (saved && saved.files && typeof saved.files === "object") {
    const files = {};

    for (const [name, value] of Object.entries(saved.files)) {
      if (typeof name !== "string" || !name) continue;
      files[name] = normalizeFile(value);
    }

    if (Object.keys(files).length) {
      return {
        name: String(saved.name || "Mon espace"),
        files
      };
    }
  }

  const old = readSavedWorkspace("codespace_workspace");

  if (old && old.files && typeof old.files === "object") {
    const files = {};

    for (const [name, value] of Object.entries(old.files)) {
      if (typeof name === "string" && name) {
        files[name] = normalizeFile(value);
      }
    }

    if (Object.keys(files).length) {
      return {
        name: String(old.name || "Mon espace"),
        files
      };
    }
  }

  return JSON.parse(JSON.stringify(defaultWorkspace));
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    saveState.textContent = "Enregistré";
  } catch {
    saveState.textContent = "Stockage plein";
  }
}

function markUnsaved() {
  saveState.textContent = "Modification...";
}

function fileNames() {
  return Object.keys(workspace.files).filter(name => !name.endsWith("/.codespace"));
}

function textOf(name) {
  const file = workspace.files[name];
  return file && file.type === "text" ? file.data : "";
}

function fileType(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "html" || ext === "htm") return "HTML";
  if (ext === "css") return "CSS";
  if (ext === "js") return "JS";
  return ext.toUpperCase() || "FILE";
}

function pathDepth(path) {
  return path.split("/").filter(Boolean).length - 1;
}

function allPaths() {
  const paths = new Set();

  for (const name of Object.keys(workspace.files)) {
    if (name.endsWith("/.codespace")) {
      const folder = name.slice(0, -11);
      if (folder) paths.add(folder + "/");
      continue;
    }

    paths.add(name);

    const parts = name.split("/");
    for (let i = 1; i < parts.length; i++) {
      paths.add(parts.slice(0, i).join("/") + "/");
    }
  }

  return [...paths];
}

function isFolderPath(path) {
  return path.endsWith("/");
}

function isHiddenByCollapsedFolder(path) {
  const clean = path.endsWith("/") ? path.slice(0, -1) : path;
  const parts = clean.split("/");

  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join("/");
    if (collapsedFolders.has(parent)) return true;
  }

  return false;
}

function visiblePaths() {
  const paths = allPaths();

  return paths
    .filter(path => !isHiddenByCollapsedFolder(path))
    .sort((a, b) => {
      const aParts = (a.endsWith("/") ? a.slice(0, -1) : a).split("/");
      const bParts = (b.endsWith("/") ? b.slice(0, -1) : b).split("/");

      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i].localeCompare(bParts[i], undefined, {
            numeric: true,
            sensitivity: "base"
          });
        }
      }

      if (aParts.length !== bParts.length) {
        return aParts.length - bParts.length;
      }

      return isFolderPath(a) ? -1 : 1;
    });
}

function renderExplorer() {
  filesEl.innerHTML = "";

  for (const path of visiblePaths()) {
    const isFolder = isFolderPath(path);
    const cleanPath = isFolder ? path.slice(0, -1) : path;
    const item = document.createElement("button");

    item.type = "button";
    item.className = "file" + (isFolder ? " folder" : "") + (cleanPath === currentFile ? " active" : "");
    item.dataset.path = cleanPath;
    item.dataset.type = isFolder ? "folder" : "file";
    item.style.paddingLeft = (10 + pathDepth(cleanPath) * 16) + "px";
    item.title = cleanPath;

    if (!isFolder) item.draggable = true;

    const label = cleanPath.split("/").pop();

    if (isFolder) {
      const folderLabel = document.createElement("span");
      folderLabel.textContent = (collapsedFolders.has(cleanPath) ? "▸ " : "▾ ") + label;
      folderLabel.className = "folder-label";
      item.appendChild(folderLabel);
    } else {
      item.textContent = "  " + label;
    }

    filesEl.appendChild(item);
  }
}

function renderTabs() {
  tabsEl.innerHTML = "";

  openFiles = openFiles.filter(name => name in workspace.files && !name.endsWith("/.codespace"));

  for (const name of openFiles) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab" + (name === currentFile ? " active" : "");
    tab.title = name;
    tab.textContent = name.split("/").pop();

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "×";
    close.addEventListener("click", event => {
      event.stopPropagation();
      closeTab(name);
    });

    tab.append(" ", close);
    tab.addEventListener("click", () => openFile(name));
    tabsEl.appendChild(tab);
  }
}

function render() {
  renderExplorer();
  renderTabs();
  projectTitle.textContent = workspace.name;
  topWorkspaceName.textContent = workspace.name;
}

function openFile(name) {
  if (!(name in workspace.files) || name.endsWith("/.codespace")) return;

  currentFile = name;
  if (!openFiles.includes(name)) openFiles.push(name);

  editor.value = textOf(name);
  currentFileEl.textContent = name;
  languageLabel.textContent = fileType(name);

  updateLineNumbers();
  updateCursor();
  updateHighlight();
  render();
}

function closeTab(name) {
  openFiles = openFiles.filter(file => file !== name);

  if (name === currentFile) {
    const next = openFiles[openFiles.length - 1] || fileNames()[0];
    if (next) openFile(next);
  } else {
    renderTabs();
  }
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function highlightCode(source, name) {
  const type = fileType(name);
  const tokens = [];
  const store = value => {
    const id = tokens.length;
    tokens.push(value);
    return "___CODESPACE_TOKEN_" + id + "___";
  };

  let value = escapeHtml(source);

  if (type === "HTML") {
    value = value.replace(/(&lt;!--[\\s\\S]*?--&gt;)/g, match => store('<span class="token-comment">' + match + "</span>"));
    value = value.replace(/(&lt;\\/?)([a-zA-Z][\\w-]*)([^&]*?)(\\/?&gt;)/g, (match, open, tag, attrs, close) => {
      const highlightedAttrs = attrs.replace(/([a-zA-Z-:]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="token-attr">$1</span>$2<span class="token-string">$3</span>');
      return open + '<span class="token-tag">' + tag + "</span>" + highlightedAttrs + close;
    });
  }

  if (type === "CSS") {
    value = value.replace(/(\\/\\*[\\s\\S]*?\\*\\/)/g, match => store('<span class="token-comment">' + match + "</span>"));
    value = value.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, match => store('<span class="token-string">' + match + "</span>"));
    value = value.replace(/([.#]?[a-zA-Z_-][\\w-]*)(?=\\s*\\{)/g, '<span class="token-selector">$1</span>');
    value = value.replace(/(--?[a-zA-Z-]+)(?=\\s*:)/g, '<span class="token-property">$1</span>');
  }

  if (type === "JS") {
    value = value.replace(/(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)/g, match => store('<span class="token-comment">' + match + "</span>"));
    value = value.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|\\`.*?\\`)/g, match => store('<span class="token-string">' + match + "</span>"));
    value = value.replace(/\\b(const|let|var|function|return|if|else|for|while|new|class|extends|import|from|export|async|await|true|false|null|undefined)\\b/g, '<span class="token-keyword">$1</span>');
    value = value.replace(/\\b(\\d+(?:\\.\\d+)?)\\b/g, '<span class="token-number">$1</span>');
  }

  return value.replace(/___CODESPACE_TOKEN_(\\d+)___/g, (_, id) => tokens[Number(id)]);
}
function updateHighlight() {
  if (!codeHighlight || !currentFile) return;
  codeHighlight.innerHTML = highlightCode(editor.value, currentFile) + "\\n";
  codeHighlight.scrollTop = editor.scrollTop;
  codeHighlight.scrollLeft = editor.scrollLeft;
}

function updateLineNumbers() {
  const lines = Math.max(1, editor.value.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, index) =>
    '<span class="line-number">' + (index + 1) + "</span>"
  ).join("");
  lineNumbers.scrollTop = editor.scrollTop;
  updateHighlight();
}

function updateCursor() {
  const before = editor.value.slice(0, editor.selectionStart);
  const line = before.split("\n").length;
  const lastBreak = before.lastIndexOf("\n");
  cursorPosition.textContent = "Ln " + line + ", Col " + (before.length - lastBreak);
}

function validFilePath(name) {
  return !!name &&
    !name.startsWith("/") &&
    !name.includes("\\") &&
    !name.split("/").some(part => !part || part === "." || part === "..") &&
    !name.endsWith("/.codespace") &&
    /^[^:*?"<>|]+\.(html?|css|js|json|txt|md|svg)$/i.test(name);
}

function validFolderPath(name) {
  return !!name &&
    !name.startsWith("/") &&
    !name.includes("\\") &&
    !name.split("/").some(part => !part || part === "." || part === "..") &&
    /^[^:*?"<>|/]+(?:\/[^:*?"<>|/]+)*$/.test(name);
}

function openModal(id, inputId) {
  $(id).classList.remove("hidden");
  $(inputId).value = "";
  $(inputId).focus();
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function createFile() {
  const name = $("fileName").value.trim();

  if (!validFilePath(name)) {
    alert("Utilise un chemin valide avec une extension prise en charge.");
    return;
  }

  if (name in workspace.files) {
    alert("Ce fichier existe déjà.");
    return;
  }

  workspace.files[name] = { type: "text", data: "" };
  save();
  closeModal("fileModal");
  openFile(name);
  updatePreview();
}

function createFolder() {
  const name = $("folderName").value.trim();

  if (!validFolderPath(name)) {
    alert("Utilise un chemin de dossier valide.");
    return;
  }

  const exists = Object.keys(workspace.files).some(path =>
    path === name + "/.codespace" ||
    path === name
  );

  if (exists) {
    alert("Ce dossier existe déjà.");
    return;
  }

  workspace.files[name + "/.codespace"] = { type: "text", data: "" };
  save();
  closeModal("folderModal");
  render();
}

function renameFolder(folderPath) {
  const nextName = prompt("Nouveau nom du dossier :", folderPath);

  if (nextName === null) return;

  const cleanName = nextName.trim();

  if (!validFolderPath(cleanName)) {
    alert("Nom de dossier invalide.");
    return;
  }

  if (cleanName === folderPath) return;

  const sourcePrefix = folderPath + "/";
  const targetPrefix = cleanName + "/";

  const conflict = Object.keys(workspace.files).some(name =>
    name === cleanName + "/.codespace" ||
    name.startsWith(targetPrefix)
  );

  if (conflict) {
    alert("Un dossier avec ce nom existe déjà.");
    return;
  }

  const entries = Object.keys(workspace.files).filter(name =>
    name === folderPath + "/.codespace" || name.startsWith(sourcePrefix)
  );

  if (!entries.length) return;

  const renamed = {};

  for (const name of entries) {
    const nextPath = name === folderPath + "/.codespace"
      ? cleanName + "/.codespace"
      : targetPrefix + name.slice(sourcePrefix.length);

    renamed[nextPath] = workspace.files[name];
    delete workspace.files[name];
  }

  Object.assign(workspace.files, renamed);

  openFiles = openFiles.map(name =>
    name === folderPath || name.startsWith(sourcePrefix)
      ? targetPrefix + name.slice(sourcePrefix.length)
      : name
  );

  if (currentFile === folderPath || currentFile.startsWith(sourcePrefix)) {
    currentFile = targetPrefix + currentFile.slice(sourcePrefix.length);
  }

  if (collapsedFolders.has(folderPath)) {
    collapsedFolders.delete(folderPath);
    collapsedFolders.add(cleanName);
  }

  save();
  render();
  updatePreview();
}

function renameFile(filePath) {
  const nextName = prompt("Nouveau nom du fichier :", filePath);

  if (nextName === null) return;

  const cleanName = nextName.trim();

  if (!validFilePath(cleanName)) {
    alert("Nom de fichier invalide.");
    return;
  }

  if (cleanName === filePath) return;

  if (workspace.files[cleanName]) {
    alert("Un fichier avec ce nom existe déjà.");
    return;
  }

  workspace.files[cleanName] = workspace.files[filePath];
  delete workspace.files[filePath];

  openFiles = openFiles.map(name => name === filePath ? cleanName : name);

  if (currentFile === filePath) currentFile = cleanName;

  save();
  render();
  if (currentFile) openFile(currentFile);
  updatePreview();
}

function moveFile(filePath, targetFolder) {
  if (!(filePath in workspace.files) || filePath.endsWith("/.codespace")) return;

  const fileName = filePath.split("/").pop();
  const targetPath = targetFolder ? targetFolder + "/" + fileName : fileName;

  if (targetPath === filePath) return;

  if (workspace.files[targetPath]) {
    alert("Un fichier avec ce nom existe déjà à cet emplacement.");
    return;
  }

  workspace.files[targetPath] = workspace.files[filePath];
  delete workspace.files[filePath];

  openFiles = openFiles.map(name => name === filePath ? targetPath : name);

  if (currentFile === filePath) currentFile = targetPath;

  save();
  render();
  updatePreview();
}

function showFileMenu(filePath, x, y) {
  const oldMenu = document.querySelector(".context-menu");
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - 190)) + "px";
  menu.style.top = Math.max(8, Math.min(y, window.innerHeight - 170)) + "px";

  const options = [
    ["Ouvrir", () => openFile(filePath)],
    ["Renommer", () => renameFile(filePath)],
    ["Supprimer", () => deleteFileFromMenu(filePath)]
  ];

  for (const [label, action] of options) {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = label;
    option.className = label === "Supprimer" ? "context-danger" : "";
    option.addEventListener("click", event => {
      event.stopPropagation();
      menu.remove();
      action();
    });
    menu.appendChild(option);
  }

  document.body.appendChild(menu);

  const close = event => {
    if (!menu.contains(event.target)) {
      menu.remove();
      document.removeEventListener("mousedown", close);
    }
  };

  setTimeout(() => document.addEventListener("mousedown", close), 0);
}

function deleteFileFromMenu(filePath) {
  const names = fileNames();

  if (names.length <= 1) {
    alert("Un workspace doit garder au moins un fichier.");
    return;
  }

  if (!confirm("Supprimer " + filePath + " ?")) return;

  delete workspace.files[filePath];
  openFiles = openFiles.filter(name => name !== filePath);

  if (currentFile === filePath) {
    currentFile = "";
    const next = openFiles[openFiles.length - 1] || fileNames()[0];
    save();

    if (next) {
      openFile(next);
    }
  } else {
    save();
    render();
  }

  updatePreview();
}

function showFolderMenu(folderPath, x, y) {
  const oldMenu = document.querySelector(".context-menu");
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - 190)) + "px";
  menu.style.top = Math.max(8, Math.min(y, window.innerHeight - 170)) + "px";

  const options = [
    ["Ouvrir", () => {
      collapsedFolders.delete(folderPath);
      renderExplorer();
    }],
    ["Replier", () => {
      collapsedFolders.add(folderPath);
      renderExplorer();
    }],
    ["Renommer", () => renameFolder(folderPath)],
    ["Supprimer", () => deleteFolder(folderPath)]
  ];

  for (const [label, action] of options) {
    const option = document.createElement("button");
    option.type = "button";
    option.textContent = label;
    option.className = label === "Supprimer" ? "context-danger" : "";
    option.addEventListener("click", event => {
      event.stopPropagation();
      menu.remove();
      action();
    });
    menu.appendChild(option);
  }

  document.body.appendChild(menu);

  const close = event => {
    if (!menu.contains(event.target)) {
      menu.remove();
      document.removeEventListener("mousedown", close);
    }
  };

  setTimeout(() => document.addEventListener("mousedown", close), 0);
}

function deleteFolder(folderPath) {
  const prefix = folderPath + "/";
  const entries = Object.keys(workspace.files).filter(name =>
    name === folderPath + "/.codespace" || name.startsWith(prefix)
  );

  if (!entries.length) return;

  const count = entries.filter(name => !name.endsWith("/.codespace")).length;
  const message = count
    ? "Supprimer le dossier \"" + folderPath + "\" et ses " + count + " fichier(s) ?"
    : "Supprimer le dossier \"" + folderPath + "\" ?";

  if (!confirm(message)) return;

  for (const name of entries) {
    delete workspace.files[name];
  }

  openFiles = openFiles.filter(name => !entries.includes(name));
  collapsedFolders.delete(folderPath);

  if (currentFile && entries.includes(currentFile)) {
    currentFile = "";
    const next = openFiles[openFiles.length - 1] || fileNames()[0];

    if (next) {
      save();
      openFile(next);
    } else {
      workspace.files["index.html"] = { type: "text", data: "" };
      save();
      openFile("index.html");
    }
  } else {
    save();
    render();
    updatePreview();
  }
}

function renameWorkspace() {
  const name = $("workspaceName").value.trim();
  if (!name) return;

  workspace.name = name;
  save();
  closeModal("renameModal");
  render();
}

function mime(name) {
  const ext = name.split(".").pop().toLowerCase();
  return {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    svg: "image/svg+xml",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf"
  }[ext] || "application/octet-stream";
}

function replaceAssets(source, assets) {
  for (const [path, url] of Object.entries(assets)) {
    source = source.split('"' + path + '"').join('"' + url + '"');
    source = source.split("'" + path + "'").join("'" + url + "'");
    source = source.split('"./' + path + '"').join('"' + url + '"');
    source = source.split("'./" + path + "'").join("'" + url + "'");
  }

  return source;
}

function updatePreview() {
  const htmlName = fileNames().find(name => name.toLowerCase() === "index.html");

  if (!htmlName) {
    preview.srcdoc = "<p style='font-family:Arial;padding:30px'>Ajoute un fichier index.html pour afficher l'aperçu.</p>";
    return;
  }

  let source = textOf(htmlName);

  const css = fileNames()
    .filter(name => /\.css$/i.test(name))
    .map(name => "<style>" + textOf(name) + "</style>")
    .join("");

  const js = fileNames()
    .filter(name => /\.js$/i.test(name))
    .map(name => "<script>" + textOf(name).replace(/<\/script>/gi, "<\\/script>") + "</script>")
    .join("");

  const assets = {};

  for (const name of fileNames()) {
    const file = workspace.files[name];
    if (file.type === "binary") {
      assets[name] = "data:" + mime(name) + ";base64," + file.data;
    }
  }

  source = replaceAssets(source, assets);

  if (/<\/head>/i.test(source)) source = source.replace(/<\/head>/i, css + "</head>");
  else source = css + source;

  if (/<\/body>/i.test(source)) source = source.replace(/<\/body>/i, js + "</body>");
  else source += js;

  preview.srcdoc = source;
}

async function exportProject() {
  if (typeof JSZip === "undefined") {
    alert("Le module ZIP n'est pas disponible.");
    return;
  }

  const zip = new JSZip();

  for (const [name, file] of Object.entries(workspace.files)) {
    if (name.endsWith("/.codespace")) {
      zip.folder(name.slice(0, -11));
    } else if (file.type === "binary") {
      zip.file(name, file.data, { base64: true });
    } else {
      zip.file(name, file.data);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = (workspace.name || "codespace").replace(/[^a-z0-9_-]+/gi, "-") + ".zip";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importProject(file) {
  if (!file || typeof JSZip === "undefined") return;

  try {
    const zip = await JSZip.loadAsync(file);
    const imported = {};

    for (const entry of Object.values(zip.files)) {
      const name = entry.name.replace(/^\.\//, "").replace(/\\/g, "/");

      if (!name || name.split("/").some(part => part === "..")) continue;

      if (entry.dir) {
        imported[name.replace(/\/$/, "") + "/.codespace"] = { type: "text", data: "" };
        continue;
      }

      if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i.test(name)) {
        imported[name] = { type: "binary", data: await entry.async("base64") };
      } else {
        imported[name] = { type: "text", data: await entry.async("string") };
      }
    }

    const usable = Object.keys(imported).filter(name => !name.endsWith("/.codespace"));

    if (!usable.length) {
      alert("Le ZIP ne contient aucun fichier exploitable.");
      return;
    }

    workspace.files = imported;
    openFiles = [];

    const first = usable.find(name => name.toLowerCase() === "index.html") || usable[0];
    save();
    openFile(first);
    updatePreview();
  } catch (error) {
    console.error(error);
    alert("Impossible de lire ce fichier ZIP.");
  }
}

filesEl.addEventListener("dragstart", event => {
  const item = event.target.closest(".file");
  if (!item || !filesEl.contains(item) || item.dataset.type !== "file") return;

  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/codespace-file", item.dataset.path);
});

filesEl.addEventListener("dragover", event => {
  const item = event.target.closest(".file.folder");

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";

  for (const folder of filesEl.querySelectorAll(".file.folder")) {
    folder.classList.remove("drop-target");
  }

  if (item) item.classList.add("drop-target");
});

filesEl.addEventListener("dragleave", event => {
  if (!filesEl.contains(event.relatedTarget)) {
    for (const folder of filesEl.querySelectorAll(".file.folder")) {
      folder.classList.remove("drop-target");
    }
  }
});

filesEl.addEventListener("drop", event => {
  event.preventDefault();

  const filePath = event.dataTransfer.getData("text/codespace-file");
  if (!filePath) return;

  const item = event.target.closest(".file.folder");
  const targetFolder = item && filesEl.contains(item) ? item.dataset.path : "";

  for (const folder of filesEl.querySelectorAll(".file.folder")) {
    folder.classList.remove("drop-target");
  }

  moveFile(filePath, targetFolder);
});

filesEl.addEventListener("click", event => {
  const item = event.target.closest(".file");
  if (!item || !filesEl.contains(item)) return;

  const path = item.dataset.path;
  if (!path) return;

  if (item.dataset.type === "folder") {
    if (collapsedFolders.has(path)) collapsedFolders.delete(path);
    else collapsedFolders.add(path);
    renderExplorer();
    return;
  }

  openFile(path);
});

filesEl.addEventListener("contextmenu", event => {
  const item = event.target.closest(".file");
  if (!item || !filesEl.contains(item)) return;

  event.preventDefault();
  event.stopPropagation();

  const path = item.dataset.path;
  if (!path) return;

  if (item.dataset.type === "folder") {
    showFolderMenu(path, event.clientX, event.clientY);
    return;
  }

  showFileMenu(path, event.clientX, event.clientY);
});

$("importProject").addEventListener("click", () => $("zipInput").click());

$("zipInput").addEventListener("change", event => {
  importProject(event.target.files[0]);
  event.target.value = "";
});

$("exportProject").addEventListener("click", exportProject);
$("addFile").addEventListener("click", () => openModal("fileModal", "fileName"));
$("addFolder").addEventListener("click", () => openModal("folderModal", "folderName"));
$("cancelFile").addEventListener("click", () => closeModal("fileModal"));
$("cancelFolder").addEventListener("click", () => closeModal("folderModal"));
$("createFile").addEventListener("click", createFile);
$("createFolder").addEventListener("click", createFolder);
$("refreshPreview").addEventListener("click", updatePreview);

$("renameProject").addEventListener("click", () => {
  $("workspaceName").value = workspace.name;
  $("renameModal").classList.remove("hidden");
  $("workspaceName").focus();
});

$("cancelRename").addEventListener("click", () => closeModal("renameModal"));
$("saveRename").addEventListener("click", renameWorkspace);

$("resetProject").addEventListener("click", () => {
  if (!confirm("Supprimer tous les fichiers du workspace ?")) return;

  workspace.files = {
    "index.html": { type: "text", data: "" }
  };

  openFiles = [];
  currentFile = "";
  save();
  openFile("index.html");
  updatePreview();
});

$("deleteFile").addEventListener("click", () => {
  const names = fileNames();

  if (names.length <= 1) {
    alert("Un workspace doit garder au moins un fichier.");
    return;
  }

  if (!confirm("Supprimer " + currentFile + " ?")) return;

  delete workspace.files[currentFile];
  openFiles = openFiles.filter(name => name !== currentFile);
  currentFile = "";

  save();
  openFile(openFiles[openFiles.length - 1] || fileNames()[0]);
  updatePreview();
});

for (const id of ["fileModal", "folderModal", "renameModal"]) {
  $(id).addEventListener("click", event => {
    if (event.target === $(id)) closeModal(id);
  });
}

$("fileName").addEventListener("keydown", event => {
  if (event.key === "Enter") createFile();
  if (event.key === "Escape") closeModal("fileModal");
});

$("folderName").addEventListener("keydown", event => {
  if (event.key === "Enter") createFolder();
  if (event.key === "Escape") closeModal("folderModal");
});

$("workspaceName").addEventListener("keydown", event => {
  if (event.key === "Enter") renameWorkspace();
  if (event.key === "Escape") closeModal("renameModal");
});

editor.addEventListener("input", () => {
  if (!currentFile || !workspace.files[currentFile]) return;

  workspace.files[currentFile] = {
    type: "text",
    data: editor.value
  };

  markUnsaved();
  updateLineNumbers();
  updateCursor();
  save();
  updatePreview();
});

editor.addEventListener("click", updateCursor);
editor.addEventListener("keyup", updateCursor);
editor.addEventListener("scroll", () => {
  lineNumbers.scrollTop = editor.scrollTop;
  updateHighlight();
});

editor.addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();

    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    editor.value = editor.value.slice(0, start) + "  " + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    editor.dispatchEvent(new Event("input"));
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
    updatePreview();
  }
});

projectTitle.textContent = workspace.name;
topWorkspaceName.textContent = workspace.name;

const firstFile =
  fileNames().find(name => name.toLowerCase() === "index.html") ||
  fileNames()[0];

if (firstFile) {
  openFile(firstFile);
} else {
  workspace.files["index.html"] = { type: "text", data: "" };
  openFile("index.html");
}

updatePreview();