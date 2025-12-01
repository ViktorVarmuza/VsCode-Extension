const vscode = require('vscode');
const { timeAgo } = require('../commands/time');
const { getChatHtml } = require('../commands/sendMessage');

async function getFriendHtml(Friend, extensionUri, webview, chatId, context, userId) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'style', 'friend.css')
  );

  const last_online = timeAgo(new Date(Friend.last_online));

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
            ${await getChatHtml(context, Friend.username, chatId)}
        </div>

        <div class="inputBar">
            <textarea id="messageInput" class="textarea" placeholder="Napiš zprávu..."></textarea>
            <input id="file" class="fileInput" type="file" />
            <button class="btn" id="btnAttach" title="Připojit soubor">📎</button>
            <button class="btn" id="btnSend">Poslat</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const userId = ${userId};
        const friendName = "${Friend.username}";
        const messagesDiv = document.getElementById("messages");
        const btnSend = document.getElementById("btnSend");

        // Funkce pro vložení zprávy do DOM
        function addMessageToDOM(content, senderId, createdAt) {
            const sent = senderId === userId;
            const msgDiv = document.createElement("div");
            msgDiv.className = 'message ' + (sent ? 'sent' : 'received');
            msgDiv.innerHTML = \`
                <div class="messageContent">\${content}</div>
                <div class="time">\${new Date(createdAt).toLocaleTimeString()}</div>
            \`;
            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        // Odeslání zprávy
        btnSend.onclick = () => {
            const content = document.getElementById("messageInput").value;
            if(!content.trim()) return;
            
            // Okamžité vložení zprávy do DOM
            addMessageToDOM(content, userId, new Date());

            // Odeslání do extension / backendu
            vscode.postMessage({
                type: "sendMessage",
                message: content
            });

            document.getElementById("messageInput").value = "";
        };

        // Příjem zpráv z extension (např. Realtime)
        window.addEventListener("message", (event) => {
            const data = event.data;
            if(data.type === "newMessage") {
                addMessageToDOM(data.message.content, data.message.sender_id, data.message.created_at);
            }
        });
    </script>
</body>
</html>
    `;
}

module.exports = { getFriendHtml };
