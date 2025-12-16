
const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { getFriendHtml } = require('../view/friend');
const { sendMessage, newMessage } = require('./sendMessage');
const os = require("os");

//vyhledává uživatele a doporučuje je v quickpicku 
function LookupUsers(context, treeRefreshEvent) {
    const Register_metoda = vscode.commands.registerCommand('share.lookupUsers', async () => {
        const login = await checkAuth(context);

        if (!login) {
            treeRefreshEvent.fire();
            return;
        }

        const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
        const key_path = path.join(__dirname, '../key.key');
        const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

        const tokens = await loadTokens(context);
        const userId = await loadUserId(context);

        const supabase = createClient(supabaseUrl, supabaseKey);

        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = "Začni psát jméno uživatele...";

        let timeout;
        quickPick.onDidChangeValue((value) => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const { data: users, error } = await supabase
                    .from('users')
                    .select('id, username')
                    .ilike('username', `${value}%`)
                    .neq('id', userId);

                if (!error && users) {
                    quickPick.items = users.map(u => ({ label: u.username }));
                }
            }, 300);
        });

        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            if (selected) {
                addFriend(context, selected.label);
            }
            quickPick.hide();
        });

        quickPick.show();


    });


}
//pomocna funkce pro tu ktera ukazuje uzivatele a doplnuje v showpicku na kliknuti na nejakeho se zapne tahle funkce a posle to request uzivatelovi
async function addFriend(context, username) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Najdi druhého uživatele
    const { data: otherUser, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .single();

    if (error || !otherUser) {
        vscode.window.showErrorMessage("Uživatel nenalezen.");
        return;
    }

    if (otherUser.id === userId) {
        vscode.window.showErrorMessage("Nemůžeš si poslat žádost sám sobě.");
        return;
    }

    // ------------------------------------------
    // 🚧 KONTROLA EXISTUJÍCÍ ŽÁDOSTI
    // ------------------------------------------
    const { data: existing, error: checkError } = await supabase
        .from('friend_requests')
        .select('id, from_user, to_user, status')
        .or(`and(from_user.eq.${userId},to_user.eq.${otherUser.id}),and(from_user.eq.${otherUser.id},to_user.eq.${userId})`)
        .eq('status', 'pending');

    if (existing && existing.length > 0) {

        const req = existing[0];

        if (req.from_user === userId) {
            vscode.window.showWarningMessage(
                `Tomuto uživateli už jsi poslal žádost.`
            );
        } else {
            vscode.window.showWarningMessage(
                `Uživatel ${username} ti už poslal žádost.`
            );
        }

        return;
    }

    // ------------------------------------------
    // 📩 ODESLÁNÍ ŽÁDOSTI
    // ------------------------------------------
    const { error: insertError } = await supabase
        .from('friend_requests')
        .insert([
            {
                from_user: userId,
                to_user: otherUser.id,
                status: 'pending'
            }
        ]);

    if (insertError) {
        vscode.window.showErrorMessage("Chyba při odesílání žádosti o přátelství.");
        return;
    }

    vscode.window.showInformationMessage(
        `Žádost o přátelství odeslána uživateli ${username}.`
    );
}

//Získá všechny FriendRequesty a vrátí je to a každému přidá command na prijati
async function allFriendsRequests(context, treeRefreshEvent) {
    const login = await checkAuth(context);

    if (!login) {
        treeRefreshEvent.fire();
        return;
    }

    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: requests, error } = await supabase
        .from('friend_requests')
        .select(`
            id,
            from_user,
            to_user,
            status
        `)
        .eq('to_user', userId)
        .eq('status', 'pending');

    if (error) {
        vscode.window.showErrorMessage("Chyba při načítání žádostí o přátelství.");
        return [];
    }

    let requestsWithUsernames = [];

    for (let req of requests) {
        const { data: otherUser, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('id', req.from_user)
            .single();

        if (error) {
            console.error("Chyba při načítání uživatele pro žádost:");
            continue;
        }

        requestsWithUsernames.push({
            type: "info",
            label: otherUser.username,
            command: 'share.handleFriendRequest',
            arguments: [{ request: req, user: otherUser, databaze: supabase }]  // <- zabaleno do jednoho objektu
        });


    }
    return requestsWithUsernames;

}

//Přijmání a odmítání žádostí od uživatelů na přátelství
function handleFriendRequest(context, treeRefreshEvent) {
    const disposable = vscode.commands.registerCommand('share.handleFriendRequest', async (args) => {
        const { request, user, databaze } = args;

        const options = ['Přijmout', 'Odmítnout'];

        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: `Žádost o přátelství od uživatele: ${user.username}`
        });

        if (!choice) {
            return;
        }

        if (choice === 'Přijmout') {
            // Aktualizuj stav žádosti na 'accepted'
            const { error } = await databaze
                .from('friend_requests')
                .delete()
                .eq('id', request.id);

            if (error) {
                vscode.window.showErrorMessage("Chyba při aktualizaci žádosti o přátelství.");
                return;
            }

            const { error: insertError } = await databaze
                .from('friends')
                .insert([
                    {
                        'user_id': await loadUserId(context),
                        'friend_id': user.id,
                    }
                ])

            if (insertError) {
                vscode.window.showErrorMessage("Chyba při přidávání přítele.");
                return;
            }

            vscode.window.showInformationMessage(
                `Přidán nový přítel: ${user.username}.`
            );


        } else if (choice === 'Odmítnout') {
            // Aktualizuj stav žádosti na 'rejected'
            const { error } = await databaze
                .from('friend_requests')
                .delete()
                .eq('id', request.id);
            if (error) {
                vscode.window.showErrorMessage("Chyba při odmítání žádosti o přátelství.");
                return;
            }
            vscode.window.showInformationMessage(
                `Žádost o přátelství od uživatele ${user.username} byla odmítnuta.`
            );
        }


    });

    context.subscriptions.push(disposable);
}

// Vrací všechny tvé přátelé a přidava jim to kommand na otevreni chatu
async function getAllFriends(context, treeRefreshEvent, ws) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const login = await checkAuth(context);

    if (!login) {
        treeRefreshEvent.fire();
        return;
    }

    const { data: friends, error } = await supabase
        .from('friends')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (error) {
        vscode.window.showErrorMessage("Chyba při načítání přátel.");
        return [];
    }

    let allFriends = [];

    for (let f of friends) {
        const new_chats = await newMessage(f.id, userId);
        const { data: friendUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', f.user_id === userId ? f.friend_id : f.user_id)
            .single();

        allFriends.push({
            type: "info",
            label: friendUser.username,
            description: new_chats > 0 ? `💬 ${new_chats} nových zpráv` : "",
            command: 'share.openFriend',
            arguments: [{ Friend: friendUser, chatId: f.id, RTC: ws }]
        })  // <- zabaleno do jednoho objektu

    }

    return allFriends;

}





//otevira chat s Pritelem a provadi veskerou komunikaci mezi webview a node js
function openFriend(context, extensionUri, friendPanels) {
    const disposable = vscode.commands.registerCommand('share.openFriend', async (args) => {
        const { Friend, chatId, ws } = args;

        let friendPanel;
        if (friendPanels.has(chatId)) {
            // Panel pro tento chat už existuje
            friendPanel = friendPanels.get(chatId);
            friendPanel.title = `Profil přítele: ${Friend.username}`;
            friendPanel.webview.html = await getFriendHtml(Friend, extensionUri, friendPanel.webview, chatId, context);
            friendPanel.reveal(vscode.ViewColumn.Beside);
        } else {
            // Nový panel
            friendPanel = vscode.window.createWebviewPanel(
                'friend-panel',
                `Profil přítele: ${Friend.username}`,
                vscode.ViewColumn.Beside,
                { enableScripts: true },
            );

            friendPanel.webview.html = await getFriendHtml(Friend, extensionUri, friendPanel.webview, chatId, context);
            friendPanels.set(chatId, friendPanel);

            friendPanel.onDidDispose(() => {
                friendPanels.delete(chatId);
            });
        }

        friendPanel.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'sendMessage') {
                sendMessage(context, chatId, message.message, message.attachmentName, message.attachmentType, message.attachmentData);
            } else if (message.type === 'startCall') {
                vscode.commands.executeCommand('share.openGoingCall', {
                    Friend: Friend
                })
            } else if (message.type === 'openAttachment') {

                try {
                    vscode.env.openExternal(vscode.Uri.parse(message.url));
                    vscode.window.showInformationMessage('Stahování uspěšné');
                } catch (err){
                    vscode.window.showErrorMessage('stahování se nepovedlo :(');
                }
                
            }

        });

        context.subscriptions.push(friendPanel);
    });

    context.subscriptions.push(disposable);
}


module.exports = { LookupUsers, addFriend, allFriendsRequests, handleFriendRequest, getAllFriends, openFriend };


