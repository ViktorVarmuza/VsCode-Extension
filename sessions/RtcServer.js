const vscode = require('vscode');
const { createClient } = require('@supabase/supabase-js');
const { loadTokens, loadUserId } = require('../tokens/Tokens');
const path = require("path");
const fs = require("fs");
const WebSocket = require('ws')

//Funkce na zacatek komunikace s RTC Servrem :D

async function RtcRegister(context,ws) {
    const id = await loadUserId(context);
    
    ws = new WebSocket("ws://localhost:3000");

    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: "register",
            userId: id
        }));
    });

    ws.on('message', (raw) => {
        try {
            const data = JSON.parse(raw);

            // Pokud server poslal SIGNAL pro tebe
            if (data.type === "signal") {
                console.log("📞 Příchozí signal:", data);

                // Tady poznáš, že někdo volá:
                if (data.signal.type === "offer") {
                    console.log("📲 Někdo ti volá! Od:", data.from);

                    // 🔥 Tady otevřeš Webview s příchozím hovorem
                    vscode.commands.executeCommand("share.openCall", {
                        friendId: data.from,
                        ws: ws,
                        data: data.signal
                    });
                }

                // Můžeš zachytit i answer nebo ICE candidate:
                if (data.signal.type === "answer") {
                    console.log("Dostal jsem answer:", data.signal);
                }

                if (data.signal.type === "candidate") {
                    console.log("Dostal jsem kandidáta:", data.signal.candidate);
                }
            }

        } catch (e) {
            console.error("WS parse error:", e);
        }
    });

    ws.on('error', (err) => console.error("WS connection error:", err));
    ws.on('close', () => console.log("WS closed"));
}





module.exports = {RtcRegister}