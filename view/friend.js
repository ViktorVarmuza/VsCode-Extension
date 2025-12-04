const vscode = require('vscode');
const { timeAgo } = require('../commands/time');
const { getChatHtml } = require('../commands/sendMessage');

async function getFriendHtml(Friend, extensionUri, webview, chatId, context, userId) {
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'style', 'friend.css')
    );

    const last_online = timeAgo(new Date(Friend.last_online));
    const chatHtml = await getChatHtml(context, Friend.username, chatId);

    return `
<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Chat</title>
<link rel="stylesheet" href="${styleUri}" />
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="avatar">U</div>
            <div class="meta">
                <div class="username">${Friend.username}</div>
                <div class="sub">${last_online}</div>
            </div>
            <div class="controls">
                <button class="btn" title="Zavolat">📞 Volat</button>
            </div>
        </div>

        <div class="messages" id="messages">
            ${chatHtml}
        </div>

        <div class="inputBar">
            <textarea id="messageInput" class="textarea" placeholder="Napiš zprávu..."></textarea>

            <!-- Skryté inputy pro soubory a složky -->
            <input id="fileInput" type="file" multiple style="display:none;" />
            <input id="folderInput" type="file" webkitdirectory directory multiple style="display:none;" />

            <!-- Tlačítka pro výběr -->
            <button class="btn" id="btnAttachFile" title="Připojit soubor">📄</button>
            <button class="btn" id="btnAttachFolder" title="Připojit složku">📁</button>

            <!-- Zobrazení vybraných souborů/složek -->
            <div>
            <div id="thumbnails" class="thumbnails"></div>
            <span id="selectedFiles" class="selectedFiles"></span>
            </div>

            <button class="btn" id="btnSend">Poslat</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const userId = ${userId};
        const friendName = "${Friend.username}";
        const messagesDiv = document.getElementById("messages");
        const btnSend = document.getElementById("btnSend");

        const btnAttachFile = document.getElementById("btnAttachFile");
        const btnAttachFolder = document.getElementById("btnAttachFolder");
        const fileInput = document.getElementById("fileInput");
        const folderInput = document.getElementById("folderInput");
        const selectedFilesSpan = document.getElementById("selectedFiles");

        // Odeslání zprávy Enter
        document.getElementById("messageInput").addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                btnSend.click();
            }
        });

        // Funkce pro relativní čas
        function timeAgo(date) {
            const now = new Date();
            const past = new Date(date);
            const diff = (now - past) / 1000; // sekundy

            if (diff < 30) return "právě teď";
            if (diff < 60) return "před pár vteřinami";
            if (diff < 3600) return "před " + Math.floor(diff / 60) + " minutami";
            if (diff < 3600 * 24) return "před " + Math.floor(diff / 3600) + " hodinami";

            const days = Math.floor(diff / (3600 * 24));
            if (days === 1) return "včera";
            return "před " + days + " dny";
        }

        // Přidání zprávy do DOM
        function addMessageToDOM(content, senderId, createdAt, id) {
            const sent = senderId === userId;
            const msgDiv = document.createElement("div");
            msgDiv.id = 'chat-' + id;
            msgDiv.className = 'message ' + (sent ? 'sent' : 'received');
            msgDiv.innerHTML = 
                '<div class="messageMeta">' +
                    '<span class="sender">' + (sent ? 'Ty' : friendName) + '</span>' +
                    '<span class="time">' + timeAgo(new Date(createdAt)) + '</span>' +
                '</div>' +
                '<div class="messageContent">' + content + '</div>';

            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Odeslání zprávy
        btnSend.onclick = () => {
            const content = document.getElementById("messageInput").value;
            const file = document.getElementById("fileInput").files;
            const folder = document.getElementById("folderInput").files;
            if(!content.trim()) return;

            
            

            addMessageToDOM(content, userId, new Date());

            vscode.postMessage({
                type: "sendMessage",
                message: content,
                attachment: file
            });

            document.getElementById("messageInput").value = "";
        };

        // Vybrání souborů nebo složky
        btnAttachFile.onclick = () => fileInput.click();
        btnAttachFolder.onclick = () => folderInput.click();
        
        function showThumbnails(file) {
            const container = document.getElementById("thumbnails");
            container.innerHTML = ""; // vyčistíme předchozí náhledy
                if (!file.type.startsWith("image/")) return; // jen obrázky

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
                // Je to složka
                name = firstFile.webkitRelativePath.split("/")[0];
                selectedFilesSpan.textContent = name;
            } else {
                // Je to soubor
                name = firstFile.name;
                selectedFilesSpan.textContent = name;
                showThumbnails(firstFile);
            }

            vscode.postMessage({
                type: "selected",
                name: name,
                files: Array.from(files).map(f => f.name)
            });
        }



        fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
        folderInput.addEventListener("change", (e) => handleFiles(e.target.files));

        // Příjem zpráv z extension
        window.addEventListener("message", (event) => {
            const data = event.data;
            if(data.type === "newMessage") {
                addMessageToDOM(data.message.content, data.message.sender_id, data.message.created_at, data.message.id);
            }
        });
    </script>
</body>
</html>
    `;
}

module.exports = { getFriendHtml };
