const vscode = require('vscode');
const { timeAgo } = require('../commands/time');
const { getChatHtml } = require('../commands/sendMessage');
//Vrací html pro chat s kamaradem

async function getFriendHtml(Friend, extensionUri, webview, chatId, context, userId) {
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'style', 'friend.css')
    );
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'scripts', 'friend.js')
    );
    const zipUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'jszip.min.js')
    )

    const last_online = timeAgo(new Date(Friend.last_online));
    const chatHtml = await getChatHtml(context, Friend.username, chatId);

    return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="Content-Security-Policy">
<title>Chat</title>

<link rel="stylesheet" href="${styleUri}" />
</head>

<body>
    <div class="container">

        <!-- Header -->
        <div class="header">
            <div class="avatar">U</div>

            <div class="meta">
                <div class="username">${Friend.username}</div>
                <div class="sub">${last_online}</div>
            </div>

            <div class="controls">
                <button class="btn" id="btnCall" title="Zavolat">📞 Volat</button>
            </div>
        </div>

        <!-- Messages -->
        <div class="messages" id="messages">
            ${chatHtml}
        </div>

        <!-- Input bar -->
        <div class="inputBar">
            <textarea id="messageInput" class="textarea" placeholder="Napiš zprávu..."></textarea>

            <!-- Hidden inputs -->
            <input id="fileInput" type="file" multiple style="display:none;" />
            <input id="folderInput" type="file" webkitdirectory directory multiple style="display:none;" />

            <!-- Buttons -->
            <button class="btn" id="btnAttachFile" title="Připojit soubor">📄</button>
            <button class="btn" id="btnAttachFolder" title="Připojit složku">📁</button>
            <button class="btn btn-reset" id="resetAttach" title="Zrušit výběr">✖</button>

            
            <div>
                <div id="thumbnails" class="thumbnails"></div>
                <span id="selectedFiles" class="selectedFiles"></span>
            </div>

            <button class="btn" id="btnSend">Poslat</button>
        </div>

    </div>

    <!-- Toto musí být NAD scriptem -->
    <script src="${zipUri}"></script>
    <script>
        const userId = ${userId};
        const friendName = "${Friend.username}";
    </script>

    <!-- Tvůj JavaScript soubor -->
    <script src="${scriptUri}"></script>
</body>
</html>
`;
}

module.exports = { getFriendHtml };
