const vscode = require('vscode');
function getFriendHtml(Friend, extensionUri,webview) {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'style', 'friend.css')
  );
  return `
        <!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Chat</title>
<link rel="stylesheet" href="${styleUri}" />
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="avatar" id="avatar">U</div>
      <div class="meta">
        <div class="username" id="friendName">Jméno Přítele</div>
        <div class="sub" id="friendStatus">offline</div>
      </div>

      <div class="controls">
        <button class="btn" id="btnCall" title="Zavolat">📞 Volat</button>
        <button class="btn" id="btnAttach" title="Připojit soubor">📎</button>
      </div>
    </div>

    <div class="messages" id="messages">
      <!-- zprávy se vkládají sem -->
    </div>

    <div class="inputBar">
      <textarea id="messageInput" class="textarea" placeholder="Napiš zprávu..."></textarea>
      <input id="file" class="fileInput" type="file" />
      <button class="btn" id="btnSend">Poslat</button>
    </div>
    <div class="small" style="text-align:center">Tip: klikni na obrázek pro otevření v novém okně</div>
  </div>

<script>
  const vscode = acquireVsCodeApi?.() || { postMessage: ()=>{} }; // safe fallback for testing outside VSCode
  const messagesEl = document.getElementById('messages');
  const friendNameEl = document.getElementById('friendName');
  const friendStatusEl = document.getElementById('friendStatus');
  const avatarEl = document.getElementById('avatar');

  let currentFriend = null; // { id, username }
  let meUserId = null;

  // utility: format time
  function formatTime(ts){
    const d = new Date(ts);
    return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }

  // render single message object:
  // { id, from_user, to_user, content, attachment_url, attachment_type, created_at, read }
  function renderMessage(msg){
    const isMe = (msg.from_user === meUserId);
    const row = document.createElement('div');
    row.className = 'row ' + (isMe ? 'me' : 'friend');

    const bubble = document.createElement('div');
    bubble.className = 'bubble ' + (isMe ? 'me' : 'friend');

    if (msg.content) {
      const text = document.createElement('div');
      text.textContent = msg.content;
      bubble.appendChild(text);
    }

    if (msg.attachment_url) {
      const att = document.createElement('div');
      att.className = 'attachment';
      if (msg.attachment_type === 'image') {
        const img = document.createElement('img');
        img.src = msg.attachment_url;
        img.alt = 'image';
        img.loading = 'lazy';
        img.onclick = () => window.open(msg.attachment_url, '_blank');
        att.appendChild(img);
      } else {
        const a = document.createElement('a');
        a.href = msg.attachment_url;
        a.target = '_blank';
        a.textContent = '📄 ' + (msg.attachment_name || msg.attachment_url.split('/').pop());
        att.appendChild(a);
      }
      bubble.appendChild(att);
    }

    const time = document.createElement('div');
    time.className = 'time';
    time.textContent = formatTime(msg.created_at || Date.now());
    bubble.appendChild(time);

    row.appendChild(bubble);
    messagesEl.appendChild(row);
    // keep scroll to bottom for new message
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // reset and render whole history
  function renderHistory(list){
    messagesEl.innerHTML = '';
    if (!list || list.length === 0) {
      const info = document.createElement('div');
      info.className = 'day-sep';
      info.textContent = 'Žádné zprávy';
      messagesEl.appendChild(info);
      return;
    }
    list.forEach(renderMessage);
  }

  // send message through extension host
  function sendMessage(payload){
    vscode.postMessage({ type: 'sendMessage', payload });
  }

  // UI events
  document.getElementById('btnSend').addEventListener('click', () => {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    const fileInput = document.getElementById('file');
    const hasFile = fileInput.files && fileInput.files[0];
    if (!text && !hasFile) return;
    // if file chosen, we hand file to extension (upload) via postMessage
    if (hasFile) {
      const file = fileInput.files[0];
      // send file metadata + raw as ArrayBuffer (VS Code webview supports postMessage transferring)
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        // we send binary via postMessage to extension host:
        vscode.postMessage({
          type: 'sendFileMessage',
          payload: {
            to_user: currentFriend.id,
            fileName: file.name,
            fileType: file.type,
            data: arrayBuffer
          }
        }, [arrayBuffer]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      sendMessage({ to_user: currentFriend.id, content: text });
    }
    input.value = '';
    fileInput.value = '';
  });

  // attach button triggers hidden file input
  document.getElementById('btnAttach').addEventListener('click', () => {
    document.getElementById('file').click();
  });

  // Enter to send (Shift+Enter newline)
  document.getElementById('messageInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('btnSend').click();
    }
  });

  // call button
  document.getElementById('btnCall').addEventListener('click', () => {
    vscode.postMessage({ type: 'requestCall', payload: { to_user: currentFriend.id }});
  });

  // handle messages from extension
  window.addEventListener('message', (ev) => {
    const msg = ev.data;
    switch(msg.type){
      case 'init':
        // { meUserId, friend, history }
        meUserId = msg.meUserId;
        currentFriend = msg.friend;
        friendNameEl.textContent = currentFriend.username || 'Uživatel';
        avatarEl.textContent = (currentFriend.username||'U').slice(0,1).toUpperCase();
        friendStatusEl.textContent = msg.friendStatus || 'offline';
        if (msg.history) renderHistory(msg.history);
        break;
      case 'history':
        // full history array
        renderHistory(msg.history || []);
        break;
      case 'newMessage':
        // single message obj
        renderMessage(msg.message);
        break;
      case 'friendStatus':
        friendStatusEl.textContent = msg.status;
        break;
      case 'typing':
        showTypingIndicator(msg.from_user === currentFriend.id);
        break;
      case 'callRequest':
        // optional: show incoming call UI
        alert('Příchozí hovor...');
        break;
      default:
        console.warn('Unknown message from extension', msg);
    }
  });

  // typing indicator example (shows a small "píše..." momentarily)
  let typingTimer = null;
  function showTypingIndicator(show){
    clearTimeout(typingTimer);
    if (show){
      friendStatusEl.textContent = 'píše...';
      typingTimer = setTimeout(()=>{ friendStatusEl.textContent = 'online'; }, 2500);
    }
  }

  // expose simple API for extension to push state (optional)
  window.chatAPI = {
    addMessage: (m) => renderMessage(m),
    setHistory: (arr) => renderHistory(arr),
    setFriend: (f) => {
      currentFriend = f;
      friendNameEl.textContent = f.username;
      avatarEl.textContent = (f.username||'U').slice(0,1).toUpperCase();
    }
  };

  // initial handshake to request data from extension
  // extension should respond with an 'init' message
  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>

    `;
}

module.exports = { getFriendHtml };