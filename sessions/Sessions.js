const vscode = require('vscode');
const { createClient } = require('@supabase/supabase-js');
const { loadTokens, loadUserId } = require('../tokens/Tokens');
const path = require("path");
const fs = require("fs");

async function watchFriendsTable(context, treeRefreshEvent, friendsRoot) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();


    const supabase = createClient(supabaseUrl, supabaseKey);


    // Přihlášení realtime na změny v tabulce friends
    const channel = supabase
        .channel('friends-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT | UPDATE | DELETE | *
                schema: 'public',
                table: 'friends'
            },
            (payload) => {
                console.log("Realtime friends change:", payload);

                // automatický refresh stromu
                treeRefreshEvent.fire(friendsRoot);
            }
        )
        .subscribe();

    // uložíme do contextu aby šel případně deaktivovat
    context.subscriptions.push({
        dispose: () => {
            supabase.removeChannel(channel);
        }
    });

    return channel;
}

async function watchRequestTable(context, treeRefreshEvent, friendsRoot) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const supabase = createClient(supabaseUrl, supabaseKey);

    const channel = supabase
        .channel('friend-requests-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT | UPDATE | DELETE | *
                schema: 'public',
                table: 'friend_requests'
            },
            (payload) => {
                console.log("Realtime friends change:", payload);

                // automatický refresh stromu
                treeRefreshEvent.fire(friendsRoot);
            }
        )
        .subscribe();

    // uložíme do contextu aby šel případně deaktivovat
    context.subscriptions.push({
        dispose: () => {
            supabase.removeChannel(channel);
        }
    });

    return channel;


}

module.exports = { watchFriendsTable, watchRequestTable };