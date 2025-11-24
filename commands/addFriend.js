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
                vscode.window.showInformationMessage(`Vybrán uživatel: ${selected.label}`);
            }
            quickPick.hide();
        });

        quickPick.show();
    });

    context.subscriptions.push(Register_metoda);
}

module.exports = { LookupUsers };
