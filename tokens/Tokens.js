const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

//prace s tokenami a Id 
function saveTokens(context, tokens, id) {
    context.globalState.update('supabaseTokens', tokens);
    context.globalState.update('userId', id);
    console.log(context.globalState.get("supabaseTokens"));
}

function loadTokens(context) {
    return context.globalState.get('supabaseTokens');
}
function loadUserId(context) {
    return context.globalState.get('userId');
}
function deleteTokens(context) {
    context.globalState.update('supabaseTokens', null);
    context.globalState.update('userId', null);
}
// async function getSupabaseAccess(context, key_path) {
//     const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
//     const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

//     const supabase = createClient(supabaseUrl, supabaseKey);
//     return { supabase };

// }

module.exports = { saveTokens, loadTokens, deleteTokens, loadUserId };