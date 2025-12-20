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
    const isImg = chat.attachment_url && isImageUrl(chat.attachment_url);
    const filename = chat.attachment_url
        ? getFileNameFromUrl(chat.attachment_url)
        : null;

    let fileIcon = chat.attachment_type === "file"
        ? getFileIcon(filename)
        : "📁";

    return `
    <div id="chat-${chat.id}" class="message ${chat.sender_id == userId ? 'sent' : 'received'}">

        <div class="messageMeta">
            <span class="sender">${chat.sender_id == userId ? 'Ty' : username}</span>
            <span class="time">${timeAgo(chat.created_at)}</span>
        </div>

        <div class="messageContent">
            ${chat.content ? `<div class="text">${chat.content}</div>` : ""}

            ${chat.attachment_url
            ? isImg
                ? `<img src="${chat.attachment_url}"
                           alt="${filename}"
                           class="chat-image" />`
                : `<a class="file-attachment"
                           href="${chat.attachment_url}"
                           download="${filename}">
                           <span class="file-icon">${fileIcon}</span>
                           <span class="file-name">${filename}</span>
                       </a>`
            : ""
        }
        </div>

        ${chat.attachment_url && isImg
            ? `<a class="attachment-btn"
                 href="${chat.attachment_url}"
                 download="${filename}">
                 📎 Stáhnout
               </a>`
            : ""
        }
    </div>`;
}





function getFileNameFromUrl(url) {
    try {
        const u = new URL(url);
        return u.pathname.split("/").pop();
    } catch {
        return null;
    }
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();

    const map = {
        // dokumenty
        pdf: "📕",
        doc: "📄",
        docx: "📝",
        xls: "📊",
        xlsx: "📊",
        ppt: "📈",
        pptx: "📈",
        txt: "📃",

        // obrázky
        png: "🖼️",
        jpg: "🖼️",
        jpeg: "🖼️",
        gif: "🖼️",
        webp: "🖼️",

        // archivy
        zip: "🗜️",
        rar: "🗜️",
        "7z": "🗜️",

        // kód
        js: "🧠",
        html: "🌐",
        css: "🎨",
        json: "🔧",

        // audio / video
        mp3: "🎵",
        wav: "🎵",
        mp4: "🎬",
        mkv: "🎬"
    };

    return map[ext] || "📄";
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

