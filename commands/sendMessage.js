const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { timeAgo } = require('./time');

async function sendMessage(context, chatId, message) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('messages')
        .insert([
            { chat_id: chatId, sender_id: userId, content: message, created_at: new Date().toISOString() },
        ]);
}

async function getAllMessages(context, chatId) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const userId = await loadUserId(context);
    const supabase = createClient(supabaseUrl, supabaseKey);


    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });


    const { data: updated } = await supabase
        .from('messages')
        .update({ is_seen: true })
        .eq('chat_id', chatId)
        .eq('is_seen', false)
        .neq('sender_id', userId);


    return data;
}

async function generateChatHtml(context, username, chat) {
    const userId = await loadUserId(context);
    
    return `<div id="chat-${chat.id}" class="message ${chat.sender_id == userId ? 'sent' : 'received'}">
    <div class="messageMeta">
        <span class="sender">${chat.sender_id == userId ? 'Ty' : username}</span>
        <span class="time">${timeAgo(chat.created_at)}</span>
    </div>
    <div class="messageContent">
        ${chat.content}
    </div>
    </div>`;
}

async function getChatHtml(context, username, chatId) {
    const userId = await loadUserId(context);
    const chats = await getAllMessages(context, chatId);

    let chatListHtml = '';

    for (const chat of chats) {
        chatListHtml += await generateChatHtml(context, username, chat);
    }

    return chatListHtml;
}

async function newMessage(chatId, userId) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();

    const supabase = createClient(supabaseUrl, supabaseKey);


    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .eq('is_seen', false)

    return data.length;
}


module.exports = { sendMessage, getAllMessages, getChatHtml, generateChatHtml, newMessage };

