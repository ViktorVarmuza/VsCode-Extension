const { online } = require('./auth/online');
const vscode = require('vscode');
const { checkAuth } = require('./auth/checkLogin');
const { LoginCommand, RegisterCommand } = require('./commands/login-register');
const { logOut } = require('./commands/logout');
const { LookupUsers } = require('./commands/addFriend');

function activate(context) {



    const treeRefreshEvent = new vscode.EventEmitter();

    const treeDataProvider = {
        onDidChangeTreeData: treeRefreshEvent.event,

        async getChildren(element) {

            // 🟦 1️⃣ ROOT úroveň
            if (!element) {
                const logged = await checkAuth(context);

                if (!logged) {
                    return [
                        { type: "root", label: "🔑 Přihlásit se", command: "share.login" },
                        { type: "root", label: "📝 Registrovat se", command: "share.register" },
                    ];
                }
                online(context, treeRefreshEvent);
                return [
                    { type: "folder", label: "📁 Moje projekty", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed },
                    { type: "root", label: "👥 Přátelé", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed },
                    { type: "root", label: "⚙️ Nastavení", command: "share.settings" },
                    { type: "root", label: "🚪 Odhlásit se", command: "share.logout" },

                ];
            }

            // 🟦 2️⃣ Rozbalení složky "Moje projekty"
            if (element.type === "folder" && element.label.includes("Moje projekty")) {
                return [
                    { type: "project", label: "Projekt A", command: "share.openProject" },
                    { type: "project", label: "Projekt B", command: "share.openProject" },
                    { type: "project", label: "Projekt C", command: "share.openProject" },
                ];
            } else if (element.label.includes("Přátelé")) {
                return [
                    { type: "root", label: "➕ Přídat Přítele", command: "share.lookupUsers" }
                ]


            }

            // 🟦 3️⃣ Ostatní položky nemají děti
            return [];
        },

        getTreeItem(element) {

            const treeItem = new vscode.TreeItem(
                element.label,
                element.collapsibleState ?? vscode.TreeItemCollapsibleState.None
            );

            if (element.command) {
                treeItem.command = {
                    command: element.command,
                    title: element.label,
                    arguments: [element]  // → můžeš získat data projektu
                };
            }

            return treeItem;
        }
    };

    vscode.window.createTreeView('mySidebarView', { treeDataProvider });

    // Commands
    context.subscriptions.push(LoginCommand(context.extensionUri, treeRefreshEvent, context));
    context.subscriptions.push(RegisterCommand(context.extensionUri, treeRefreshEvent, context));
    context.subscriptions.push(logOut(context, context.extensionUri, treeRefreshEvent));
    context.subscriptions.push(LookupUsers(context, treeRefreshEvent));

    // Command pro otevírání projektu
    context.subscriptions.push(vscode.commands.registerCommand("share.openProject", (item) => {
        vscode.window.showInformationMessage(`Otevírám projekt: ${item.label}`);
    }));
}

function deactivate() { }

module.exports = { activate, deactivate };
