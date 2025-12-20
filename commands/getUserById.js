const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { loadTokens, loadUserId } = require('../tokens/Tokens');

async function getUser(id, context) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const tokens = await loadTokens(context);
    const userId = await loadUserId(context);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)

    if (error){
        console.log(error)
    }

    return user[0]
}

module.exports = {getUser}