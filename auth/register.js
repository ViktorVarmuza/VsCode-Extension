const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const fs = require('fs')
const path = require('path');
const { saveTokens } = require('../tokens/Tokens')

async function signUpWithEmail(email, password, username, context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1️⃣ Vytvoření účtu v Supabase Auth
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error('Chyba při registraci:', error.message);
        return false;
    }

    console.log('Uživatel registrován, id:', data.user?.id);

    const { error: insertError } = await supabase
        .from('users')
        .insert([
            {
                id: data.user?.id,
                username,
                avatar_url: null,
                created_at: new Date()
            }
        ]);

    saveTokens(context, {
        refresh_token: data.session.refresh_token,
        access_token: data.session.access_token
    }, data.user.id);

    if (insertError) {
        console.error('Chyba při ukládání profilu do tabulky users:', insertError.message);
        return false;
    }

    return data;
}

function getRegisterHtml(webview, extensionUri) {
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
            <title>Registrace</title>
        </head>
        <body>
            <h2>Registrace</h2>

            <label>Jmeno:</label><br>
            <input id="name" type="text"><br><br>

            <label>Email:</label><br>
            <input id="email" type="email"><br><br>

            <label>Heslo:</label><br>
            <input id="password" type="password"><br><br>

            <label>Potvrď heslo:</label><br>
            <input id="confirmPassword" type="password"><br><br>

            <button id="registerBtn">Registrovat se</button>

            <p id="error"></p>

            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById("registerBtn").onclick = () => {
                    const name = document.getElementById("name").value;
                    const email = document.getElementById("email").value;
                    const password = document.getElementById("password").value;
                    const confirmPassword = document.getElementById("confirmPassword").value;

                    if (password !== confirmPassword) {
                        document.getElementById("error").innerText = "Hesla se neshodují!";
                        return;
                    }

                    vscode.postMessage({
                        type: "register",
                        name,
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

module.exports = { signUpWithEmail, getRegisterHtml };