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

async function watchMessageTable(context, friendPanels) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = await loadUserId(context);

    const channel = supabase.channel('messages_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            },
            (payload) => {
                const message = payload.new;

                // ignorujeme zprávy od sebe
                if (message.sender_id === userId) return;

                // pokud máme otevřený panel pro chat_id, pošleme zprávu
                const panel = friendPanels.get(message.chat_id);
                if (panel) {
                    panel.webview.postMessage({
                        type: 'newMessage',
                        message
                    });
                }
            }
        );

    channel.subscribe();

    context.subscriptions.push({
        dispose: () => supabase.removeChannel(channel)
    });

    return channel;
}


module.exports = { watchFriendsTable, watchRequestTable, watchMessageTable };