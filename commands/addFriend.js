const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');


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
                treeRefreshEvent.fire();
            }
            quickPick.hide();
        });

        quickPick.show();


    });


}

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

async function allFriendsRequests(context) {
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

function handleFriendRequest(context, treeRefreshEvent) {
    const disposable = vscode.commands.registerCommand('share.handleFriendRequest', async (args) => {
        const { request, user, databaze } = args; // ← rozbalíme oba objekty

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

        treeRefreshEvent.fire();
    });

    context.subscriptions.push(disposable);
}



module.exports = { LookupUsers, addFriend, allFriendsRequests, handleFriendRequest };


