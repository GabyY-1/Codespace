const STORAGE_KEY = "codespace_projects";

let projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let currentId = null;
let currentFile = "html";

const projectsEl = document.getElementById("projects");
const projectCount = document.getElementById("projectCount");
const projectTitle = document.getElementById("projectTitle");
const emptyState = document.getElementById("emptyState");
const editorArea = document.getElementById("editorArea");
const codeEditor = document.getElementById("codeEditor");
const preview = document.getElementById("preview");
const modal = document.getElementById("modal");
const projectName = document.getElementById("projectName");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function renderProjects() {
  projectCount.textContent = projects.length + (projects.length > 1 ? " projets" : " projet");
  projectsEl.innerHTML = "";

  projects.forEach(project => {
    const item = document.createElement("button");
    item.className = "project-item" + (project.id === currentId ? " selected" : "");
    item.innerHTML = "<strong>" + escapeHtml(project.name) + "</strong><span>HTML · CSS · JS</span>";
    item.addEventListener("click", () => selectProject(project.id));
    projectsEl.appendChild(item);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function createProject(name) {
  const project = {
    id: Date.now().toString(),
    name,
    files: {
      html: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Mon projet</title>\n</head>\n<body>\n  <h1>Bonjour Codespace</h1>\n</body>\n</html>",
      css: "body {\n  font-family: Arial, sans-serif;\n  padding: 40px;\n}\n",
      js: "console.log('Codespace');\n"
    }
  };

  projects.unshift(project);
  save();
  selectProject(project.id);
  closeModal();
}

function selectProject(id) {
  currentId = id;
  currentFile = "html";
  const project = projects.find(item => item.id === id);
  if (!project) return;

  emptyState.classList.add("hidden");
  editorArea.classList.remove("hidden");
  projectTitle.textContent = project.name;
  updateEditor();
  renderProjects();
  updatePreview();
}

function updateEditor() {
  const project = projects.find(item => item.id === currentId);
  if (!project) return;
  codeEditor.value = project.files[currentFile];
  document.querySelectorAll(".file").forEach(button => {
    button.classList.toggle("active", button.dataset.file === currentFile);
  });
}

function updatePreview() {
  const project = projects.find(item => item.id === currentId);
  if (!project) return;

  const html = project.files.html;
  const css = "<style>" + project.files.css + "</style>";
  const script = "<script>" + project.files.js.replace(/<\/script>/gi, "<\\/script>") + "<\/script>";
  const source = html.replace("</head>", css + "</head>").replace("</body>", script + "</body>");

  preview.srcdoc = source;
}

function openModal() {
  modal.classList.remove("hidden");
  projectName.value = "";
  projectName.focus();
}

function closeModal() {
  modal.classList.add("hidden");
}

document.getElementById("newProject").addEventListener("click", openModal);
document.getElementById("addProject").addEventListener("click", openModal);
document.getElementById("emptyCreate").addEventListener("click", openModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

document.getElementById("createProject").addEventListener("click", () => {
  const name = projectName.value.trim();
  if (name) createProject(name);
});

projectName.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    const name = projectName.value.trim();
    if (name) createProject(name);
  }
});

document.querySelectorAll(".file").forEach(button => {
  button.addEventListener("click", () => {
    currentFile = button.dataset.file;
    updateEditor();
  });
});

codeEditor.addEventListener("input", () => {
  const project = projects.find(item => item.id === currentId);
  if (!project) return;
  project.files[currentFile] = codeEditor.value;
  save();
  updatePreview();
});

document.getElementById("runProject").addEventListener("click", updatePreview);
document.getElementById("refreshPreview").addEventListener("click", updatePreview);

document.getElementById("deleteProject").addEventListener("click", () => {
  if (!currentId) return;
  projects = projects.filter(project => project.id !== currentId);
  currentId = null;
  save();
  renderProjects();
  projectTitle.textContent = "Aucun projet";
  editorArea.classList.add("hidden");
  emptyState.classList.remove("hidden");
});

document.getElementById("exportProject").addEventListener("click", () => {
  const project = projects.find(item => item.id === currentId);
  if (!project) return;

  const files = [
    ["index.html", project.files.html],
    ["style.css", project.files.css],
    ["script.js", project.files.js]
  ];

  files.forEach(([name, content]) => {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  });
});

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

renderProjects();
