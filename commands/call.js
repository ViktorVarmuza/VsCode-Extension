const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { getIncomingCallHtml, getOutgoingCallHtml } = require('../view/call');

// ukazuje webview na prijati hovoru

function openIncomingCall(context, extensionUri) {
    const disposable = vscode.commands.registerCommand('share.openCall', async (args) => {
        const { friendId, ws, data } = args;

        const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
        const key_path = path.join(__dirname, '../key.key');
        const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: Friend, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', friendId)
            .single();

        if (error || !Friend) {
            vscode.window.showErrorMessage("Nepodařilo se načíst informace o volajícím.");
            console.error(error);
            return;
        }

        const callPanel = vscode.window.createWebviewPanel(
            'Call-Panel',
            'Příchozí hovor',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        callPanel.webview.html = await getIncomingCallHtml(
            Friend.username,
            callPanel.webview,
            extensionUri
        );
    });

    context.subscriptions.push(disposable);
}
//ukazuje webview pro to když někomu volam
function openGoingCall(context, extensionUri, ws) {
    const disposable = vscode.commands.registerCommand('share.openGoingCall', async (args) => {
        const { Friend } = args;

        const callPanel = vscode.window.createWebviewPanel(
            "outgoingCall",             // identifikátor webview
            "Volání",                   // název
            vscode.ViewColumn.One,      // sloupec
            {
                enableScripts: true,                // povolit JS
                retainContextWhenHidden: true,     // zachovat stav, když webview není vidět
                enableCommandUris: true,           // umožní odkazům spouštět příkazy VS Code
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, "scripts"), vscode.Uri.joinPath(extensionUri, "style")],
                enableForms: true                   // pro formuláře (ne vždy nutné)
            }
        );


        callPanel.webview.html = await getOutgoingCallHtml(
            Friend,
            callPanel.webview,
            extensionUri,
            context
        );
        
        ws.send(JSON.stringify({
            type: "signal",
            targetUserId: Friend.id,
            signal: { type: "callRequest" }
        }));
    });


}

module.exports = { openIncomingCall, openGoingCall };
