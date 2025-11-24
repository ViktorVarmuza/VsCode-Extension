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

module.exports = { saveTokens, loadTokens, deleteTokens, loadUserId };
