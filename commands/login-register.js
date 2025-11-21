const vscode = require('vscode');
const { signInWithEmail, getLoginHtml } = require('../auth/login');
const { signUpWithEmail, getRegisterHtml } = require('../auth/register');
const { checkAuth } = require('../auth/checkLogin');


//login command ktery se pak pridava do extension kdyz se otevre login okno :D
function LoginCommand(Uri, treeRefreshEvent, context) {

    const Login_metoda = vscode.commands.registerCommand('share.login', () => {
        const panel = vscode.window.createWebviewPanel(
            'login-panel',
            'Login',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getLoginHtml(panel.webview, Uri);
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === "login") {

                const { email, password } = msg;

                const ok = await signInWithEmail(email, password, context);

                if (ok) {
                    vscode.window.showInformationMessage("Přihlášení proběhlo úspěšně!");
                    panel.dispose();
                    treeRefreshEvent.fire();

                    // treeRefreshEvent.fire();  // refresh sidebaru
                } else {
                    panel.webview.postMessage({ type: "error", message: "Špatný email nebo heslo." });
                }
            }
        });
    })
}

function RegisterCommand(Uri, treeRefreshEvent, context) {

    const Register_metoda = vscode.commands.registerCommand('share.register', () => {
        const panel = vscode.window.createWebviewPanel(
            'register-panel',
            'Register',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getRegisterHtml(panel.webview, Uri);

        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === 'register') {
                const { name, email, password } = msg;
                console.log('klikl si na button')
                const ok = await signUpWithEmail(email, password, name, context)

                if (ok) {
                    vscode.window.showInformationMessage("Registrace Úspěšná");
                    panel.dispose();
                    treeRefreshEvent.fire();
                    // treeRefreshEvent.fire();  // refresh sidebaru
                } else {
                    panel.webview.postMessage({ type: "error", message: "Chyba při registraci" });
                }
            }


        })
    })


}


module.exports = { LoginCommand, RegisterCommand };