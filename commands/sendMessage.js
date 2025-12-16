const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { timeAgo } = require('./time');
const { isImageUrl } = require('./image');


async function sendMessage(context, chatId, message, attachmentName, attachmentType, attachmentData) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../service.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = await loadUserId(context);

    let attachmentUrl = null;

    if (attachmentData && attachmentName) {
        const buffer = Buffer.from(attachmentData, 'base64');
        const filePath = `chat-${chatId}/${attachmentName}`;

        const { error: uploadError } = await supabase.storage
            .from('Chat-Files')
            .upload(filePath, buffer, {
                cacheControl: '3600',
                upsert: true,
                contentType: attachmentType === 'file' ? 'application/octet-stream' : 'application/zip',
            });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('Chat-Files')
            .getPublicUrl(filePath);

        attachmentUrl = urlData.publicUrl;
    }

    const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([
            {
                chat_id: chatId,
                sender_id: userId,
                content: message,
                created_at: new Date().toISOString(),
                attachment_url: attachmentUrl,
                attachment_type: attachmentType
            },
        ]);

    if (messageError) throw messageError;

    return messageData;
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
    const img = isImageUrl(chat.attachment_url);

    return `<div id="chat-${chat.id}" class="message ${chat.sender_id == userId ? 'sent' : 'received'}">
        <div class="messageMeta">
            <span class="sender">${chat.sender_id == userId ? 'Ty' : username}</span>
            <span class="time">${timeAgo(chat.created_at)}</span>
        </div>
        <div class="messageContent">
            ${chat.content || ''}
            ${chat.attachment_url ? (img ? `<img src="${chat.attachment_url}" alt="Příloha" class="chat-image" />` : '') : ''}
        </div>
        ${chat.attachment_url ? `<button class="attachment-btn" 
                               data-url="${chat.attachment_url}" 
                               data-id="${chat.id}">
                           📎 Stáhnout přílohu
                       </button>` : ''}
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

