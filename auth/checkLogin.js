const { createClient } = require('@supabase/supabase-js');
const { saveTokens, loadTokens } = require('../tokens/Tokens');
const fs = require('fs');
const path = require('path');

async function checkAuth(context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseAnonKey = fs.readFileSync(key_path, 'utf8').trim();

    const tokens = loadTokens(context);

    if (!tokens || !tokens.refresh_token || !tokens.access_token) {
        console.log("❌ Žádné tokeny – uživatel není přihlášen");
        return false;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.setSession({
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token
    });

    if (error) {
        console.log("❌ Session obnovena selhala:", error.message);
        return false;
    }

    if (data.session) {
        saveTokens(context, {
            refresh_token: data.session.refresh_token,
            access_token: data.session.access_token
        }, data.session.user.id);
    }

    console.log("✅ Session obnovena");
    return true;
}

module.exports = { checkAuth };
