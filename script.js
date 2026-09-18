const STORAGE_KEY = "codespace_workspace";

const defaultWorkspace = {
  name: "Mon espace",
  files: {
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Mon site</title>\n</head>\n<body>\n  <h1>Bonjour Codespace</h1>\n</body>\n</html>",
    "style.css": "body {\n  font-family: Arial, sans-serif;\n  padding: 40px;\n}\n",
    "script.js": "console.log('Codespace');\n"
  }
};

let workspace = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || defaultWorkspace;
let currentFile = Object.keys(workspace.files)[0];

const filesEl = document.getElementById("files");
const codeEditor = document.getElementById("codeEditor");
const currentFileEl = document.getElementById("currentFile");
const preview = document.getElementById("preview");
const fileModal = document.getElementById("fileModal");
const fileName = document.getElementById("fileName");
const renameModal = document.getElementById("renameModal");
const workspaceName = document.getElementById("workspaceName");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

function renderFiles() {
  filesEl.innerHTML = "";

  Object.keys(workspace.files).forEach(name => {
    const button = document.createElement("button");
    button.className = "file" + (name === currentFile ? " active" : "");
    button.textContent = name;
    button.addEventListener("click", () => selectFile(name));
    filesEl.appendChild(button);
  });
}

function selectFile(name) {
  if (!workspace.files[name]) return;
  currentFile = name;
  currentFileEl.textContent = name;
  codeEditor.value = workspace.files[name];
  renderFiles();
}

function updatePreview() {
  const htmlName = Object.keys(workspace.files).find(name => name.toLowerCase() === "index.html");
  if (!htmlName) {
    preview.srcdoc = "<p style='font-family:Arial;padding:30px'>Ajoute un fichier index.html pour afficher l'aperçu.</p>";
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
  if (!name) return;

  if (!/\.(html?|css|js)$/i.test(name)) {
    alert("Le fichier doit être en .html, .css ou .js.");
    return;
  }

  if (workspace.files[name]) {
    alert("Ce fichier existe déjà.");
    return;
  }

  workspace.files[name] = "";
  currentFile = name;
  save();
  renderFiles();
  selectFile(name);
  closeFileModal();
}

document.getElementById("addFile").addEventListener("click", openFileModal);
document.getElementById("quickAdd").addEventListener("click", openFileModal);
document.getElementById("cancelFile").addEventListener("click", closeFileModal);
document.getElementById("createFile").addEventListener("click", createFile);

fileName.addEventListener("keydown", event => {
  if (event.key === "Enter") createFile();
});

codeEditor.addEventListener("input", () => {
  workspace.files[currentFile] = codeEditor.value;
  save();
  updatePreview();
});

document.getElementById("refreshPreview").addEventListener("click", updatePreview);

document.getElementById("deleteFile").addEventListener("click", () => {
  const names = Object.keys(workspace.files);
  if (names.length <= 1) {
    alert("Un workspace doit garder au moins un fichier.");
    return;
  }

  delete workspace.files[currentFile];
  currentFile = Object.keys(workspace.files)[0];
  save();
  renderFiles();
  selectFile(currentFile);
  updatePreview();
});

document.getElementById("renameProject").addEventListener("click", () => {
  workspaceName.value = workspace.name;
  renameModal.classList.remove("hidden");
  workspaceName.focus();
});

document.getElementById("cancelRename").addEventListener("click", () => {
  renameModal.classList.add("hidden");
});

document.getElementById("saveRename").addEventListener("click", () => {
  const name = workspaceName.value.trim();
  if (!name) return;
  workspace.name = name;
  document.getElementById("projectTitle").textContent = name;
  save();
  renameModal.classList.add("hidden");
});

workspaceName.addEventListener("keydown", event => {
  if (event.key === "Enter") document.getElementById("saveRename").click();
});

document.getElementById("resetProject").addEventListener("click", () => {
  if (!confirm("Supprimer tous les fichiers de ce workspace ?")) return;
  workspace.files = { "index.html": "" };
  currentFile = "index.html";
  save();
  renderFiles();
  selectFile(currentFile);
  updatePreview();
});

document.getElementById("exportProject").addEventListener("click", async () => {
  for (const [name, content] of Object.entries(workspace.files)) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
    await new Promise(resolve => setTimeout(resolve, 80));
  }
});

fileModal.addEventListener("click", event => {
  if (event.target === fileModal) closeFileModal();
});

renameModal.addEventListener("click", event => {
  if (event.target === renameModal) renameModal.classList.add("hidden");
});

document.getElementById("projectTitle").textContent = workspace.name;
renderFiles();
selectFile(currentFile);
updatePreview();
