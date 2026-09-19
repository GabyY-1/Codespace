const STORAGE_KEY = "codespace_workspace";

const defaultWorkspace = {
  name: "Mon espace",
  files: {
    "index.html": "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Mon site</title>\n</head>\n<body>\n  <h1>Bonjour Codespace</h1>\n</body>\n</html>",
    "style.css": "body {\n  font-family: Arial, sans-serif;\n  padding: 40px;\n}\n",
    "script.js": "console.log('Codespace');\n"
  }
};

let workspace = loadWorkspace();
let currentFile = Object.keys(workspace.files)[0] || "index.html";

const filesEl = document.getElementById("files");
const tabsEl = document.getElementById("tabs");
const codeEditor = document.getElementById("codeEditor");
const currentFileEl = document.getElementById("currentFile");
const preview = document.getElementById("preview");
const lineNumbers = document.getElementById("lineNumbers");
const saveState = document.getElementById("saveState");
const cursorPosition = document.getElementById("cursorPosition");
const languageLabel = document.getElementById("languageLabel");
const fileCount = document.getElementById("fileCount");
const fileCountSide = document.getElementById("fileCountSide");
const projectTitle = document.getElementById("projectTitle");
const topWorkspaceName = document.getElementById("topWorkspaceName");
const fileModal = document.getElementById("fileModal");
const fileName = document.getElementById("fileName");
const folderModal = document.getElementById("folderModal");
const folderName = document.getElementById("folderName");
const renameModal = document.getElementById("renameModal");
const workspaceName = document.getElementById("workspaceName");

function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.files && typeof saved.files === "object") {
      return { name: saved.name || "Mon espace", files: saved.files };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return JSON.parse(JSON.stringify(defaultWorkspace));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  saveState.textContent = "Enregistré";
}

function markUnsaved() {
  saveState.textContent = "Modification...";
}

function fileType(name) {
  const extension = name.split(".").pop().toLowerCase();
  if (extension === "html" || extension === "htm") return "HTML";
  if (extension === "css") return "CSS";
  if (extension === "js") return "JS";
  return "FILE";
}

function pathDepth(path) {
  return path.split("/").length - 1;
}

function renderFiles() {
  filesEl.innerHTML = "";
  tabsEl.innerHTML = "";

  const names = Object.keys(workspace.files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  names.forEach(name => {
    const button = document.createElement("button");
    button.className = "file" + (name === currentFile ? " active" : "");
    button.textContent = name;
    button.title = name;
    button.style.paddingLeft = (12 + pathDepth(name) * 16) + "px";
    button.addEventListener("click", () => selectFile(name));
    filesEl.appendChild(button);
  });

  if (currentFile && workspace.files[currentFile] !== undefined) {
    const tab = document.createElement("button");
    tab.className = "tab active";
    tab.textContent = currentFile;
    tab.title = currentFile;
    tab.addEventListener("click", () => selectFile(currentFile));
    tabsEl.appendChild(tab);
  }

  const count = names.length;
  const countText = count + (count > 1 ? " fichiers" : " fichier");
  fileCount.textContent = countText;
  fileCountSide.textContent = countText;
}

function selectFile(name) {
  if (!(name in workspace.files)) return;
  currentFile = name;
  currentFileEl.textContent = name;
  codeEditor.value = workspace.files[name];
  languageLabel.textContent = fileType(name);
  renderFiles();
  updateLineNumbers();
  updateCursorPosition();
}

function updateLineNumbers() {
  const lines = Math.max(1, codeEditor.value.split("\n").length);
  lineNumbers.textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
}

function updateCursorPosition() {
  const beforeCursor = codeEditor.value.slice(0, codeEditor.selectionStart);
  const line = beforeCursor.split("\n").length;
  const lastBreak = beforeCursor.lastIndexOf("\n");
  const column = beforeCursor.length - lastBreak;
  cursorPosition.textContent = "Ln " + line + ", Col " + column;
}

function updatePreview() {
  const htmlName = Object.keys(workspace.files).find(name => name.toLowerCase() === "index.html");
  if (!htmlName) {
    preview.srcdoc = "<p style=\"font-family:Arial;padding:30px\">Ajoute un fichier index.html pour afficher l'aperçu.</p>";
    return;
  }

  let source = workspace.files[htmlName];
  const css = Object.entries(workspace.files)
    .filter(([name]) => name.toLowerCase().endsWith(".css"))
    .map(([, content]) => "<style>" + content + "</style>")
    .join("");
  const js = Object.entries(workspace.files)
    .filter(([name]) => name.toLowerCase().endsWith(".js"))
    .map(([, content]) => "<script>" + content.replace(/<\/script>/gi, "<\\/script>") + "<\/script>")
    .join("");

  if (source.includes("</head>")) source = source.replace("</head>", css + "</head>");
  else source = css + source;

  if (source.includes("</body>")) source = source.replace("</body>", js + "</body>");
  else source += js;

  preview.srcdoc = source;
}

function validFilePath(name) {
  return name &&
    !name.startsWith("/") &&
    !name.includes("\\") &&
    !name.split("/").some(part => !part || part === "." || part === "..") &&
    /^[^:*?"<>|]+\.(html?|css|js)$/i.test(name);
}

function validFolderPath(name) {
  return name &&
    !name.startsWith("/") &&
    !name.includes("\\") &&
    !name.split("/").some(part => !part || part === "." || part === "..") &&
    /^[^:*?"<>|/]+(?:\/[^:*?"<>|/]+)*$/.test(name);
}

function openFileModal() {
  fileModal.classList.remove("hidden");
  fileName.value = "";
  fileName.focus();
}

function closeFileModal() {
  fileModal.classList.add("hidden");
}

function createFile() {
  const name = fileName.value.trim();
  if (!validFilePath(name)) {
    alert("Utilise un chemin valide en .html, .css ou .js.");
    return;
  }
  if (name in workspace.files) {
    alert("Ce fichier existe déjà.");
    return;
  }

  workspace.files[name] = "";
  currentFile = name;
  save();
  renderFiles();
  selectFile(name);
  updatePreview();
  closeFileModal();
}

function openFolderModal() {
  folderModal.classList.remove("hidden");
  folderName.value = "";
  folderName.focus();
}

function closeFolderModal() {
  folderModal.classList.add("hidden");
}

function createFolder() {
  const name = folderName.value.trim();
  if (!validFolderPath(name)) {
    alert("Utilise un chemin de dossier valide.");
    return;
  }

  const marker = name + "/.codespace";
  if (workspace.files[marker] || Object.keys(workspace.files).some(path => path === name || path.startsWith(name + "/"))) {
    alert("Ce dossier existe déjà.");
    return;
  }

  workspace.files[marker] = "";
  save();
  renderFiles();
  closeFolderModal();
}

function openRenameModal() {
  workspaceName.value = workspace.name;
  renameModal.classList.remove("hidden");
  workspaceName.focus();
}

function closeRenameModal() {
  renameModal.classList.add("hidden");
}

function renameWorkspace() {
  const name = workspaceName.value.trim();
  if (!name) return;
  workspace.name = name;
  projectTitle.textContent = name;
  topWorkspaceName.textContent = name;
  save();
  closeRenameModal();
}

async function exportProject() {
  if (typeof JSZip === "undefined") {
    alert("Le module ZIP n'est pas disponible.");
    return;
  }

  const zip = new JSZip();
  for (const [name, content] of Object.entries(workspace.files)) {
    if (name.endsWith("/.codespace")) {
      zip.folder(name.slice(0, -11));
    } else {
      zip.file(name, content);
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

    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;

      const name = entry.name.replace(/^\.\//, "").replace(/\\/g, "/");
      if (!name || name.split("/").some(part => part === "..")) continue;

      if (name.endsWith("/.codespace")) {
        imported[name] = "";
      } else {
        imported[name] = await entry.async("string");
      }
    }

    if (!Object.keys(imported).length) {
      alert("Le ZIP ne contient aucun fichier exploitable.");
      return;
    }

    workspace.files = imported;
    currentFile = Object.keys(imported).find(name => name.toLowerCase() === "index.html") || Object.keys(imported)[0];

    save();
    renderFiles();
    selectFile(currentFile);
    updatePreview();
  } catch {
    alert("Impossible de lire ce fichier ZIP.");
  }
}

document.getElementById("importProject").addEventListener("click", () => {
  document.getElementById("zipInput").click();
});

document.getElementById("zipInput").addEventListener("change", event => {
  const file = event.target.files[0];
  importProject(file);
  event.target.value = "";
});

document.getElementById("exportProject").addEventListener("click", exportProject);
document.getElementById("addFile").addEventListener("click", openFileModal);
document.getElementById("addFolder").addEventListener("click", openFolderModal);
document.getElementById("cancelFile").addEventListener("click", closeFileModal);
document.getElementById("createFile").addEventListener("click", createFile);
document.getElementById("cancelFolder").addEventListener("click", closeFolderModal);
document.getElementById("createFolder").addEventListener("click", createFolder);
document.getElementById("refreshPreview").addEventListener("click", updatePreview);

document.getElementById("deleteFile").addEventListener("click", () => {
  const names = Object.keys(workspace.files);
  if (names.length <= 1) {
    alert("Un workspace doit garder au moins un fichier.");
    return;
  }
  if (!confirm("Supprimer " + currentFile + " ?")) return;

  delete workspace.files[currentFile];
  currentFile = Object.keys(workspace.files)[0];
  save();
  renderFiles();
  selectFile(currentFile);
  updatePreview();
});

document.getElementById("renameProject").addEventListener("click", openRenameModal);
document.getElementById("cancelRename").addEventListener("click", closeRenameModal);
document.getElementById("saveRename").addEventListener("click", renameWorkspace);

document.getElementById("resetProject").addEventListener("click", () => {
  if (!confirm("Supprimer tous les fichiers du workspace ?")) return;
  workspace.files = { "index.html": "" };
  currentFile = "index.html";
  save();
  renderFiles();
  selectFile(currentFile);
  updatePreview();
});

codeEditor.addEventListener("input", () => {
  workspace.files[currentFile] = codeEditor.value;
  markUnsaved();
  updateLineNumbers();
  updateCursorPosition();
  save();
  updatePreview();
});

codeEditor.addEventListener("click", updateCursorPosition);
codeEditor.addEventListener("keyup", updateCursorPosition);

codeEditor.addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.slice(0, start) + "  " + codeEditor.value.slice(end);
    codeEditor.selectionStart = start + 2;
    codeEditor.selectionEnd = start + 2;
    codeEditor.dispatchEvent(new Event("input"));
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
    updatePreview();
  }
});

fileName.addEventListener("keydown", event => {
  if (event.key === "Enter") createFile();
  if (event.key === "Escape") closeFileModal();
});

folderName.addEventListener("keydown", event => {
  if (event.key === "Enter") createFolder();
  if (event.key === "Escape") closeFolderModal();
});

workspaceName.addEventListener("keydown", event => {
  if (event.key === "Enter") renameWorkspace();
  if (event.key === "Escape") closeRenameModal();
});

fileModal.addEventListener("click", event => {
  if (event.target === fileModal) closeFileModal();
});

folderModal.addEventListener("click", event => {
  if (event.target === folderModal) closeFolderModal();
});

renameModal.addEventListener("click", event => {
  if (event.target === renameModal) closeRenameModal();
});

projectTitle.textContent = workspace.name;
topWorkspaceName.textContent = workspace.name;
renderFiles();
selectFile(currentFile);
updatePreview();