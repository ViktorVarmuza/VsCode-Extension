const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const fs = require('fs')
const { saveTokens } = require('../tokens/Tokens')
const path = require('path');


//přihlášení pomocí emailu a hesla 
async function signInWithEmail(email, password, context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');


    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    if (!supabaseKey) {
        return false;

    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("vytvořen ucet")

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error('Chyba při přihlášení:', error.message);
        return false;
    }

    saveTokens(context, {
        refresh_token: data.session.refresh_token,
        access_token: data.session.access_token
    });

    console.log('Uživatel přihlášen, id:', data.user.id);

    return data;
}


/**
 * Vrací HTML pro login Webview
 * @param {vscode.Webview} webview
 * @param {vscode.Uri} extensionUri
 */

//vrací html kod pro login stranku
//extensionUri je cesta k slozce z kama je to volane
function getLoginHtml(webview, extensionUri) {
    // URI pro externí CSS
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'style', 'formulars.css')
    );

    return `
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="${styleUri}">
            <title>Přihlášení</title>
        </head>
        <body>
            <h2>Přihlášení</h2>

            <label>Email:</label><br>
            <input id="email" type="email"><br><br>

            <label>Heslo:</label><br>
            <input id="password" type="password"><br><br>

            <button id="loginBtn">Přihlásit se</button>

            <p id="error"></p>

            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById("loginBtn").onclick = () => {
                    const email = document.getElementById("email").value;
                    const password = document.getElementById("password").value;

                    vscode.postMessage({
                        type: "login",
                        email,
                        password
                    });
                };

                window.addEventListener("message", (event) => {
                    if (event.data.type === "error") {
                        document.getElementById("error").innerText = event.data.message;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = { signInWithEmail, getLoginHtml };
