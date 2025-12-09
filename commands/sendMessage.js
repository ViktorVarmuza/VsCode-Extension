const { loadTokens, loadUserId } = require('../tokens/Tokens');
const { checkAuth } = require('../auth/checkLogin');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const vscode = require('vscode');
const { timeAgo } = require('./time');

async function uploadFile(supabase, chatId, filePath) {
    const fileName = path.basename(filePath);
    const absolutPath = path.resolve(fileName);
    const fileBuffer = fs.readFileSync(absolutPath);
    const storagePath = `${chatId}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('Chat-Files')
        .upload(storagePath, fileBuffer, { upsert: true });

    if (error) throw error;

    const { publicUrl } = supabase.storage.from('Chat-Files').getPublicUrl(storagePath);
    return publicUrl;
}
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}
async function uploadFolder(supabase, chatId, folderPath) {
    const files = getAllFiles(folderPath);
    const urls = [];

    for (const filePath of files) {
        const relativePath = path.relative(folderPath, filePath);
        const storagePath = `${chatId}/${relativePath}`;
        const fileBuffer = fs.readFileSync(filePath);

        const { error } = await supabase.storage
            .from('Chat-Files')
            .upload(storagePath, fileBuffer, { upsert: true });

        if (error) throw error;

        const { publicUrl } = supabase.storage.from('Chat-Files').getPublicUrl(storagePath);
        urls.push(publicUrl);
    }

    return urls; // vrátí URL všech souborů ve složce
}


async function sendMessage(context, chatId, message, attachmentPath, attachmentType) {
    const supabaseUrl = 'https://fujkzibyfivcdhuaqxuu.supabase.co';
    const key_path = path.join(__dirname, '../key.key');
    const supabaseKey = fs.readFileSync(key_path, 'utf8').trim();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = await loadUserId(context);



    if (attachmentType === 'file' && attachmentPath ) {
        await uploadFile(supabase, chatId, attachmentPath);
    } else if (attachmentType === 'folder' && attachmentPath) {

        await uploadFolder(supabase, chatId, attachmentPath);
    }


    const { data, error } = await supabase
        .from('messages')
        .insert([
            {
                chat_id: chatId,
                sender_id: userId,
                content: message,
                created_at: new Date().toISOString(),
                attachment_url: attachmentPath,
                attachment_type: attachmentType
            },
        ]);

    if (error) throw error;

    return data;
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

