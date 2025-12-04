const vscode = require('vscode');
const { createClient } = require('@supabase/supabase-js');
const { loadTokens, loadUserId } = require('../tokens/Tokens');
const path = require("path");
const fs = require("fs");
const { generateChatHtml } = require("../commands/sendMessage");
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

async function watchMessageTable(context, friendPanels, friendRoot, treeRefreshEvent) {
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
            async (payload) => {
                const message = payload.new;
                // ignorujeme zprávy od seb

                // pokud máme otevřený panel pro chat_id, pošleme zprávu
                const panel = friendPanels.get(message.chat_id);
                if (panel) {
                    panel.webview.postMessage({
                        type: 'newMessage',
                        message: message,
                        sender: message.sender_id === userId ? "sent" : "received"
                    });

                    if( userId !== message.sender_id){
                        vscode.window.showInformationMessage("Někdo ti poslal zprávu :D")

                    }

                    const { data, error } = await supabase
                        .from('messages')
                        .update({is_seen: true})
                        .eq('id', message.id);

                }else treeRefreshEvent.fire(friendRoot);

                
                
            }
        );



    channel.subscribe();


    const channel2 = supabase.channel('messages_updates')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            },
            (payload) => {
                const message = payload.new;

                // ignorujeme zprávy od sebe
                if (message.sender_id === userId) return;

                treeRefreshEvent.fire(friendRoot);
            }
        );

    channel2.subscribe();

    context.subscriptions.push({
        dispose: () => supabase.removeChannel(channel)
    });

    context.subscriptions.push({
        dispose: () => supabase.removeChannel(channel2)
    });

    return channel;
}


module.exports = { watchFriendsTable, watchRequestTable, watchMessageTable };