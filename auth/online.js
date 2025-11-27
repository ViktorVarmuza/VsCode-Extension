const { loadTokens } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function online(context, treeRefreshEvent) {

    async function updateOnline() {
        console.log("zacatek online funkce");

        const isLoggedIn = await checkAuth(context);
        if (!isLoggedIn) {
            treeRefreshEvent.fire();
            return;
        };

        const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
        const key_path = path.join(__dirname, '../key.key');
        const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
        const tokens = await loadTokens(context);

        const supabase = createClient(supabaseUrl, supabaseKey);

        // získat uživatele
        const { data: userData, error: userError } = await supabase.auth.getUser(tokens.access_token);
        if (userError || !userData?.user) return;

        const user = userData.user;

        // aktualizace last_online
        const { error } = await supabase
            .from('users')
            .update({
                last_online: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error("Update error:", error);
        }
    }

    // 🔥 SPOUSTÍ SE OKAMŽITĚ
    updateOnline();

    // 🔥 A PAK KAŽDÝCH 60 sekund
    setInterval(updateOnline, 60000);
}


module.exports = { online };
