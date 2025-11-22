const vscode = require('vscode');
const { checkAuth } = require('./auth/checkLogin');
// const {signInWithEmail, getLoginHtml} = require('./auth/login');
const {LoginCommand, RegisterCommand} = require('./commands/login-register');
const {logOut} = require('./commands/logout');

//hlavni slozka :D



//funkce co se vola když se zapne extension
function activate(context) {
     const treeRefreshEvent = new vscode.EventEmitter()
    //sidebar provider rika jak ma vypadat sidebar
    const treeDataProvider = {
        onDidChangeTreeData: treeRefreshEvent.event,

        async getChildren() {
            const logged = await checkAuth(context);

            if (!logged) {
                // ----- UŽIVATEL NEPŘIHLÁŠEN -------
                return [
                    { label: "🔑 Přihlásit se", command: "share.login" },
                    { label: "📝 Registrovat se", command: "share.register" },
                ];
            }

            // ----- UŽIVATEL PŘIHLÁŠEN --------
            return [
                { label: "📁 Moje projekty", command: "share.openProjects" },
                { label: "👥 Přátelé", command: "share.openFriends" },
                { label: "⚙️ Nastavení", command: "share.settings" },
                { label: "🚪 Odhlásit se", command: "share.logout" },
            ];
        },
        
        getTreeItem(element) {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.None
            );
            item.command = {
                title: element.label,
                command: element.command
            };
            return item;
        }
        
    };

    //vyrvari ten sidebar podle toho co provider rekl
    vscode.window.createTreeView('mySidebarView', { treeDataProvider });


    
    context.subscriptions.push(
        vscode.commands.registerCommand('myExtension.openWebview', () => {
            const panel = vscode.window.createWebviewPanel(
                'simpleWebview',
                'Moje Webview',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = `
                <html>
                <body>
                    <h1>Ahoj z Webview!</h1>
                    <p>Otevřeno kliknutím na ikonku v sidebaru.</p>
                </body>
                </html>
            `;
        })
    );

    context.subscriptions.push(LoginCommand(context.extensionUri, treeRefreshEvent, context));
    context.subscriptions.push(RegisterCommand(context.extensionUri, treeRefreshEvent, context));
    context.subscriptions.push(logOut(context, context.extensionUri, treeRefreshEvent ));
}

function deactivate() { }

module.exports = { activate, deactivate };
