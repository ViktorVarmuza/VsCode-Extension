const vscode = require('vscode');
const { timeAgo } = require('../commands/time');
const { loadUserId } = require('../tokens/Tokens')

//Vrací htmlka pro volani :D
function getCallHeader(friendName) {
    return `
        <div class="header" style="justify-content:center;">
            <div class="avatar" style="font-size:28px;">${friendName[0].toUpperCase()}</div>
            <div class="meta">
                <div class="username">${friendName}</div>
            </div>
            <meta http-equiv="Content-Security-Policy">
        </div>
    `;
}

function getIncomingCallHtml(friendName, webview, extensionUri) {
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "style", "friend.css")
    );

    return `
        <html>
        <head><link rel="stylesheet" href="${styleUri}" /></head>
        <body>
            <div class="container call-wrapper">
                ${getCallHeader(friendName)}
                <div class="sub">Volá vám…</div>
                <div class="call-buttons-wrapper call-buttons">
                    <button class="btn" id="acceptBtn">📞 Přijmout</button>
                    <button class="btn" id="declineBtn">❌ Odmítnout</button>
                </div>
            </div>
        </body>
        </html>
    `;
}

async function getOutgoingCallHtml(Friend, webview, extensionUri, context) {
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "style", "friend.css")
    );
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "scripts", "goingCall.js")
    );

    return `
    <html>
    <head>
        <link rel="stylesheet" href="${styleUri}" />
    </head>
    <body>
        <div class="container call-wrapper">
            ${getCallHeader(Friend.username)}
            <div class="sub">Voláte…</div>
            <div class="call-buttons-wrapper call-buttons">
                <button class="btn" id="cancelBtn">❌ Zrušit</button>
            </div>
        </div>

        <!-- Nejprve definujeme proměnné -->
        <script>     
            const targetId = "${Friend.id}";
        </script>

        <!-- Pak načteme JS soubor -->
        <script src="${scriptUri}"></script>
    </body>
    </html>
    `;
}



module.exports = { getIncomingCallHtml, getOutgoingCallHtml };
