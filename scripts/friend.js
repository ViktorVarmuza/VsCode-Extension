// API VS Code
const vscode = acquireVsCodeApi();

// Elementy
const messagesDiv = document.getElementById("messages");
const btnSend = document.getElementById("btnSend");
const btnAttachFile = document.getElementById("btnAttachFile");
const btnAttachFolder = document.getElementById("btnAttachFolder");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folderInput");
const selectedFilesSpan = document.getElementById("selectedFiles");
const messageInput = document.getElementById("messageInput");
const btnCall = document.getElementById("btnCall");
// Tyto proměnné se doplní přímo v HTML
// const userId = ...;
// const friendName = "...";

// ENTER -> odeslání zprávy
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        btnSend.click();
    }
});

// Funkce pro relativní čas
function timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diff = (now - past) / 1000;

    if (diff < 30) return "právě teď";
    if (diff < 60) return "před pár vteřinami";
    if (diff < 3600) return "před " + Math.floor(diff / 60) + " minutami";
    if (diff < 3600 * 24) return "před " + Math.floor(diff / 3600) + " hodinami";

    const days = Math.floor(diff / (3600 * 24));
    if (days === 1) return "včera";
    return "před " + days + " dny";
}

// Přidání zprávy do DOM
function addMessageToDOM(content, sender, createdAt, id) {
    const sent = sender === "sent";
    const msgDiv = document.createElement("div");
    msgDiv.id = "chat-" + id;
    msgDiv.className = "message " + (sent ? "sent" : "received");

    msgDiv.innerHTML =
        '<div class="messageMeta">' +
        '<span class="sender">' + (sent ? "Ty" : friendName) + '</span>' +
        '<span class="time">' + timeAgo(new Date(createdAt)) + '</span>' +
        "</div>" +
        '<div class="messageContent">' + content + "</div>";

    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Odeslání zprávy
btnSend.onclick = () => {
    const content = messageInput.value.trim();
    const file = fileInput.files;
    const folder = folderInput.files;

    if (!content) return;

    let attachmentType = null;
    let attachmentPath = null;

    if (file && file.length > 0) {
        attachmentType = "file";
        attachmentPath = file[0].path || file[0].name;
    } else if (folder && folder.length > 0) {
        attachmentType = "folder";
        attachmentPath = folder[0].webkitRelativePath.split("/")[0];
    }

    vscode.postMessage({
        type: "sendMessage",
        message: content,
        attachmentType: attachmentType,
        attachmentPath: attachmentPath
    });

    // reset vstupů
    messageInput.value = "";
    fileInput.value = "";
    folderInput.value = "";
};
btnCall.onclick = () => {
    vscode.postMessage({
        type: "startCall"
    })
}
// Výběr souboru/složky
btnAttachFile.onclick = () => fileInput.click();
btnAttachFolder.onclick = () => folderInput.click();

// zobrazování náhledů obrázků
function showThumbnails(file) {
    const container = document.getElementById("thumbnails");
    container.innerHTML = "";

    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.width = "30px";
        img.style.height = "30px";
        img.style.objectFit = "cover";
        img.style.marginRight = "5px";
        container.appendChild(img);
    };
    reader.readAsDataURL(file);
}

function handleFiles(files) {
    if (files.length === 0) {
        selectedFilesSpan.textContent = "Nic nebylo vybráno";
        return;
    }

    let name;
    const firstFile = files[0];

    if (firstFile.webkitRelativePath && firstFile.webkitRelativePath.includes("/")) {
        name = firstFile.webkitRelativePath.split("/")[0]; // název složky
        selectedFilesSpan.textContent = name;
    } else {
        name = firstFile.name;
        selectedFilesSpan.textContent = name;
        showThumbnails(firstFile);
    }

    vscode.postMessage({
        type: "selected",
        name: name,
        files: Array.from(files).map((f) => f.name)
    });
}

fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
folderInput.addEventListener("change", (e) => handleFiles(e.target.files));

// Příjem zpráv z extension
window.addEventListener("message", (event) => {
    const data = event.data;
    if (data.type === "newMessage") {
        addMessageToDOM(
            data.message.content,
            data.sender,
            data.message.created_at,
            data.message.id
        );
    }
});
