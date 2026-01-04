const vscode = require('vscode');
const { createClient } = require('@supabase/supabase-js');
const { checkAuth } = require('./auth/checkLogin');
const { loadTokens, loadUserId } = require('./tokens/Tokens');
const { online } = require('./auth/online');

const { LoginCommand, RegisterCommand } = require('./commands/login-register');
const { logOut } = require('./commands/logout');
const { LookupUsers, allFriendsRequests, handleFriendRequest, getAllFriends, openFriend } = require('./commands/addFriend');

const path = require("path");
const fs = require("fs");

const { watchFriendsTable, watchRequestTable, watchMessageTable } = require('./sessions/Sessions');
const { RtcRegister } = require('./sessions/RtcServer');
const { openIncomingCall, openGoingCall } = require('./commands/call')

const { getAllProjects, addProject, openProject, ChangeIcon, ChangeName, deleteProject } = require('./projects/project');

const { openSetings } = require('./projects/setings');
// globalne nastaveny ws WebSocket
let ws = null;

async function activate(context) {




    const friendPanels = new Map();
    //všechny friendPanely

    const treeRefreshEvent = new vscode.EventEmitter();
    //tree EventEmmiter resetuje tree a nekolik dalsich veci umi 

    // ------------------------------
    //   🌳 TREE DATA PROVIDER
    // ------------------------------

    //Cast stromu s kamarady
    const friendsRoot = {
        type: "friendsRoot",
        label: "👥 Přátelé",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };
    //Cast kamaradu kde jsou jenom Requesty
    const friendRequestsRoot = {
        type: "friendRequestsRoot",
        label: "📨 Žádosti",
        description: "5 nových ",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };
    const ProjectRoot = {
        type: "folder",
        label: "📁 Moje projekty",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };


    openProject(context);
    ChangeIcon(context, treeRefreshEvent, ProjectRoot);
    ChangeName(context, treeRefreshEvent, ProjectRoot);
    deleteProject(context, treeRefreshEvent, ProjectRoot);
    openSetings(context, context.extensionUri, treeRefreshEvent, ProjectRoot);


    const logeed = await checkAuth(context);
    let watching = false;
    if (logeed) {
        sessions();
    }

    async function sessions() {
        RtcRegister(context, ws);
        watchFriendsTable(context, treeRefreshEvent, friendsRoot);
        watchRequestTable(context, treeRefreshEvent, friendsRoot);
        watchMessageTable(context, friendPanels, friendsRoot, treeRefreshEvent);
        online(context, treeRefreshEvent);

        context.subscriptions.push(openGoingCall(context, context.extensionUri, ws));
        watching = true;
    }


    //generovani TreeView
    const treeDataProvider = {
        onDidChangeTreeData: treeRefreshEvent.event,

        async getChildren(element) {
            // ROOT
            if (!element) {
                const logged = await checkAuth(context);




                if (watching === false) {
                    sessions();
                }

                if (!logged) {
                    return [
                        { type: "root", label: "🔑 Přihlásit se", command: "share.login" },
                        { type: "root", label: "📝 Registrovat se", command: "share.register" },
                    ];
                }




                return [
                    ProjectRoot,
                    friendsRoot, // ← uložený uzel
                    { type: "root", label: "⚙️ Nastavení", command: "share.settings" },
                    { type: "root", label: "🚪 Odhlásit se", command: "share.logout" },
                ];
            }
            if (element.type === "folder") {
                const projects = await getAllProjects(context);

                return [
                    { type: "root", label: "➕ Přidat Projekt", command: "share.addProject" },
                    ...projects
                ];
            }


            // Přátelé
            if (element.type === "friendsRoot") {
                const friends = await getAllFriends(context, treeRefreshEvent, ws);
                const requests = await allFriendsRequests(context, treeRefreshEvent);

                // uložíme do friendRequestsRoot nejen description, ale i data
                friendRequestsRoot.description = requests.length > 0 ? `${requests.length}` : "";
                friendRequestsRoot.requestsData = requests; // ← uložené jako pole

                return [
                    { type: "root", label: "➕ Přidat přítele", command: "share.lookupUsers" },
                    friendRequestsRoot,
                    ...friends
                ];
            }



            // Žádosti o přátelství
            if (element.type === "friendRequestsRoot") {
                // použijeme už uložené requestsData místo opětovného dotazu
                const requests = element.requestsData || [];
                return requests.length > 0
                    ? requests
                    : [{ type: "info", label: "Žádné nové žádosti o přátelství.", collapsibleState: vscode.TreeItemCollapsibleState.None }];
            }



            // Ostatní
            return [];
        },

        getTreeItem(element) {
            const treeItem = new vscode.TreeItem(
                element.label,
                element.collapsibleState ?? vscode.TreeItemCollapsibleState.None
            );

            // Popis (volitelné)
            if (element.description) {
                treeItem.description = element.description;
            }

            // Ikona (volitelné)
            if (element.iconPath) {
                treeItem.iconPath = element.iconPath;
            }

            // Kontext pro menu (volitelné)
            if (element.contextValue) {
                treeItem.contextValue = element.contextValue;
            }

            // Command – zajišťuje, že arguments je vždy pole
            if (element.command) {
                treeItem.command = {
                    command: element.command,
                    title: element.label,
                    arguments: element.arguments ? element.arguments : [element] // <--- KLÍČOVÉ
                };
            }

            // Tooltip (volitelné)
            if (element.projectPath) {
                treeItem.tooltip = element.projectPath;
            }

           

            return treeItem;
        }



    };





    // Create the actual tree view
    vscode.window.createTreeView('mySidebarView', { treeDataProvider });

    // ------------------------------
    //   🔧 REGISTRACE COMMANDŮ
    // ------------------------------

    context.subscriptions.push(LoginCommand(context.extensionUri, treeRefreshEvent, context));
    context.subscriptions.push(RegisterCommand(context.extensionUri, treeRefreshEvent, context));
    context.subscriptions.push(logOut(context, context.extensionUri, treeRefreshEvent));
    context.subscriptions.push(LookupUsers(context, treeRefreshEvent));
    context.subscriptions.push(handleFriendRequest(context, treeRefreshEvent));
    context.subscriptions.push(openFriend(context, context.extensionUri, friendPanels));
    context.subscriptions.push(openIncomingCall(context, context.extensionUri));
    context.subscriptions.push(addProject(context, treeRefreshEvent, ProjectRoot));

}
//funkce se spustí po vypnutí extensionu nebo vscodu :D
function deactivate() {
    if (ws) {
        console.log("Closing WebSocket connection...");
        ws.close();
        ws = null;
    }

}

module.exports = { activate, deactivate };
