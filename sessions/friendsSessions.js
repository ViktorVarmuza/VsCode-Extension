const { loadUserId, loadTokens } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

async function friends_session(context, treeRefreshEvent, friendsRoot) {
    console.log("Inicializace friendsSessions");
    const login = await checkAuth(context);
    if (!login) {
        treeRefreshEvent.fire(friendsRoot);
        return;
    }

    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const channel1 = supabase.channel(`friends_user:${userId}`);
    await channel1
        .on('postgres_changes', { schema: 'public', table: 'friends', event: '*', filter: `user_id=eq.${userId}` }, (p) => {
            console.log("Zachycená změna pro uživatele:", p);
            treeRefreshEvent.fire();
        })
        .subscribe();

    const channel2 = supabase.channel(`friends_friend:${userId}`);
    await channel2
        .on('postgres_changes', { schema: 'public', table: 'friends', event: '*', filter: `friend_id=eq.${userId}` }, (p) => {
            console.log("Zachycená změna pro přítele:", p);
            treeRefreshEvent.fire();
        })
        .subscribe();

}

module.exports = { friends_session };
