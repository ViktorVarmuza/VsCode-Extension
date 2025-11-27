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

const { friends_session } = require('./sessions/friendsSessions');


function activate(context) {
    
    const treeRefreshEvent = new vscode.EventEmitter();

    // ------------------------------
    //   🌳 TREE DATA PROVIDER
    // ------------------------------
    const friendsRoot = {
        type: "friendsRoot",
        label: "👥 Přátelé",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
    };

    const treeDataProvider = {
        onDidChangeTreeData: treeRefreshEvent.event,

        async getChildren(element) {
            // ROOT
            if (!element) {
                const logged = await checkAuth(context);

                if (!logged) {
                    return [
                        { type: "root", label: "🔑 Přihlásit se", command: "share.login" },
                        { type: "root", label: "📝 Registrovat se", command: "share.register" },
                    ];
                }

                online(context);

                return [
                    { type: "folder", label: "📁 Moje projekty", collapsibleState: vscode.TreeItemCollapsibleState.Collapsed },
                    friendsRoot, // ← uložený uzel
                    { type: "root", label: "⚙️ Nastavení", command: "share.settings" },
                    { type: "root", label: "🚪 Odhlásit se", command: "share.logout" },
                ];
            }

            // Přátelé
            if (element.type === "friendsRoot") {
                const friends = await getAllFriends(context, treeRefreshEvent);

                return [
                    { type: "root", label: "➕ Přidat přítele", command: "share.lookupUsers" },
                    {
                        type: "friendRequestsRoot",
                        label: "📨 Žádosti o přátelství",
                        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
                    },
                    ...friends
                ];
            }

            // Žádosti o přátelství
            if (element.type === "friendRequestsRoot") {
                const requests = await allFriendsRequests(context, treeRefreshEvent);
                return requests.length > 0
                    ? requests
                    : [{ type: "info", label: "Žádné nové žádosti o přátelství." }];
            }

            // Ostatní
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
                    arguments: element.arguments
                };
            }

            return treeItem;
        }
    };


    
    friends_session(context, treeRefreshEvent, friendsRoot);


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
    context.subscriptions.push(openFriend(context));

    // Project opener
    context.subscriptions.push(vscode.commands.registerCommand("share.openProject", (item) => {
        vscode.window.showInformationMessage(`Otevírám projekt: ${item.label}`);
    }));

}

function deactivate() { }

module.exports = { activate, deactivate };
