const UserStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

let socket;
let currentRoom = null;
let typingTimeout = null;
let currentUserId = null;
let userReactions = new Map();
let onlineUsers = new Map();
let selectedUserForProfile = null;

const connectionSection = document.querySelector('.connection-info');
const appContainer = document.querySelector('.app-container');
const userIdInput = document.getElementById('userId');
const connectButton = document.getElementById('connectButton');
const connectionStatus = document.getElementById('connectionStatus');

const statusSelector = document.getElementById('statusSelector');
const customStatus = document.getElementById('customStatus');
const updateStatusButton = document.getElementById('updateStatusButton');
const onlineUsersList = document.getElementById('onlineUsersList');

const roomSection = document.getElementById('roomSection');
const roomNameInput = document.getElementById('roomName');
const joinRoomButton = document.getElementById('joinRoomButton');
const currentRoomStatus = document.getElementById('currentRoomStatus');
const messageInputContainer = document.getElementById('messageInputContainer');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const typingIndicator = document.getElementById('typingIndicator');
const whisperControls = document.getElementById('whisperControls');
const whisperModeCheckbox = document.getElementById('whisperModeCheckbox');
const messagesDiv = document.getElementById('messages');

const emojiModal = document.getElementById('emojiModal');
const emojiList = document.getElementById('emojiList');
const closeEmojiModal = document.getElementById('closeEmojiModal');
const userProfileModal = document.getElementById('userProfileModal');
const profileInitials = document.getElementById('profileInitials');
const profileName = document.getElementById('profileName');
const profileStatus = document.getElementById('profileStatus');
const profileActivity = document.getElementById('profileActivity');
const sendDirectMessageBtn = document.getElementById('sendDirectMessageBtn');
const closeProfileModal = document.getElementById('closeProfileModal');

let selectedMessageId = null;


function formatRelativeTime(date) {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return `${diffSec} seconds ago`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}


function getInitials(name) {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

function updateOnlineUsersList() {
  onlineUsersList.innerHTML = '';
  
  if (onlineUsers.size === 0) {
    const noUsers = document.createElement('p');
    noUsers.textContent = 'No users online';
    noUsers.classList.add('status');
    noUsers.style.padding = '10px 15px';
    onlineUsersList.appendChild(noUsers);
    return;
  }
  
  const sortedUsers = Array.from(onlineUsers.values()).sort((a, b) => {
    const statusOrder = {
      [UserStatus.ONLINE]: 0,
      [UserStatus.AWAY]: 1,
      [UserStatus.BUSY]: 2,
      [UserStatus.OFFLINE]: 3
    };
    
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  sortedUsers.forEach(user => {
    if (user.userId === currentUserId) return;
    
    const userItem = document.createElement('div');
    userItem.classList.add('user-item', `status-${user.status}`);
    userItem.dataset.userId = user.userId;
    
    const avatar = document.createElement('div');
    avatar.classList.add('user-avatar');
    avatar.textContent = getInitials(user.userId);
    
    const userInfo = document.createElement('div');
    userInfo.classList.add('user-info');
    
    const userName = document.createElement('div');
    userName.classList.add('user-name');
    userName.textContent = user.userId;
    
    const userStatus = document.createElement('div');
    userStatus.classList.add('user-status');
    
    const statusIndicator = document.createElement('span');
    statusIndicator.classList.add('status-indicator');
    
    const statusText = document.createElement('span');
    statusText.textContent = user.customStatus || capitalizeFirstLetter(user.status);
    
    const lastActivity = document.createElement('div');
    lastActivity.classList.add('last-activity');
    lastActivity.textContent = `Active: ${formatRelativeTime(user.lastActivity)}`;
    
    userStatus.appendChild(statusIndicator);
    userStatus.appendChild(statusText);
    userInfo.appendChild(userName);
    userInfo.appendChild(userStatus);
    userInfo.appendChild(lastActivity);
    
    userItem.appendChild(avatar);
    userItem.appendChild(userInfo);
    
    userItem.addEventListener('click', () => showUserProfile(user));
    
    onlineUsersList.appendChild(userItem);
  });
}


function showUserProfile(user) {
  selectedUserForProfile = user;
  
  profileInitials.textContent = getInitials(user.userId);
  profileName.textContent = user.userId;
  
  const statusClass = `status-${user.status}`;
  profileStatus.className = 'status-indicator';
  profileStatus.classList.add(statusClass);
  
  const statusHtml = `
    <span class="status-indicator"></span>
    ${user.customStatus || capitalizeFirstLetter(user.status)}
  `;
  profileStatus.innerHTML = statusHtml;
  
  profileActivity.textContent = `Last activity: ${formatRelativeTime(user.lastActivity)}`;
  
  userProfileModal.style.display = 'block';
}


function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function addMessage(text, type = 'info', isWhisper = false, messageData = null) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message-container');
  
  if (messageData && messageData.messageId) {
    messageElement.dataset.id = messageData.messageId;
  }

  const messageContent = document.createElement('div');
  messageContent.classList.add('message');
  
  if (type === 'error') {
    messageContent.classList.add('error');
  } else if (type === 'status') {
    messageContent.classList.add('status');
    messageContent.textContent = text;
  } else {
    if (messageData) {
      const messageHeader = document.createElement('div');
      messageHeader.classList.add('message-header');
      
      const senderSpan = document.createElement('span');
      senderSpan.classList.add('message-sender');
      senderSpan.textContent = messageData.senderUserId || 'Unknown';
      
      const roomSpan = document.createElement('span');
      roomSpan.classList.add('message-room');
      roomSpan.textContent = messageData.room ? `#${messageData.room}` : 'Direct Message';
      
      messageHeader.appendChild(senderSpan);
      messageHeader.appendChild(roomSpan);
      messageContent.appendChild(messageHeader);
      
      const textElement = document.createElement('div');
      textElement.classList.add('message-content');
      textElement.textContent = messageData.message;
      messageContent.appendChild(textElement);
    } else {
      messageContent.textContent = text;
    }
  }

  if (isWhisper) {
    messageContent.classList.add('whisper');
    setTimeout(() => {
      messageContent.classList.add('faded');
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 2000);
    }, 0);
  }

  messageElement.appendChild(messageContent);

  if (type !== 'status' && messageData && messageData.messageId) {
    const reactionsContainer = document.createElement('div');
    reactionsContainer.classList.add('reactions-container');

    const reactButton = document.createElement('button');
    reactButton.textContent = '+ Add Reaction';
    reactButton.classList.add('react-button');
    reactButton.addEventListener('click', () => openEmojiModal(messageData.messageId));

    reactionsContainer.appendChild(reactButton);
    messageElement.appendChild(reactionsContainer);
  }

  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


function openEmojiModal(messageId) {
  selectedMessageId = messageId;
  emojiModal.style.display = 'block';
}


function closeEmojiModalHandler() {
  emojiModal.style.display = 'none';
  selectedMessageId = null;
}


function handleMessageReaction(messageId, userId, reaction, removing = false) {
  const messageElement = document.querySelector(`[data-id="${messageId}"]`);
  if (!messageElement) {
    console.warn(`Message with ID ${messageId} not found for reaction`);
    return;
  }

  const reactionsContainer = messageElement.querySelector('.reactions-container');
  
  const existingEmojiReaction = Array.from(reactionsContainer.querySelectorAll('.reaction'))
    .find(el => el.dataset.emoji === reaction);
  
  if (removing) {
    if (existingEmojiReaction) {
      const tooltipElement = existingEmojiReaction.querySelector('.reaction-tooltip');
      const countElement = existingEmojiReaction.querySelector('.reaction-count');
      
      const userListText = tooltipElement.textContent;
      const updatedUserListText = userListText.replace(new RegExp(`(, )?${userId}`), '');
      
      const remainingUsers = updatedUserListText.split(',').filter(u => u.trim()).length;
      
      if (remainingUsers <= 0) {
        reactionsContainer.removeChild(existingEmojiReaction);
      } else {
        tooltipElement.textContent = updatedUserListText;
        countElement.textContent = remainingUsers;
        
        if (userId === currentUserId) {
          existingEmojiReaction.classList.remove('user-reacted');
        }
      }
    }
    
    if (userId === currentUserId) {
      userReactions.delete(messageId);
    }
  } else {
    
    if (userId === currentUserId) {
      const existingReaction = userReactions.get(messageId);
      if (existingReaction && existingReaction !== reaction) {
        handleMessageReaction(messageId, userId, existingReaction, true);
      }
      
      userReactions.set(messageId, reaction);
    }
    
    if (existingEmojiReaction) {
      const tooltipElement = existingEmojiReaction.querySelector('.reaction-tooltip');
      const userList = tooltipElement.textContent.split(',').map(u => u.trim()).filter(u => u && u !== userId);
      
      if (!userList.includes(userId)) {
        userList.push(userId);
      }
      
      tooltipElement.textContent = userList.join(', ');
      
      const countElement = existingEmojiReaction.querySelector('.reaction-count');
      countElement.textContent = userList.length;
      
      if (userId === currentUserId) {
        existingEmojiReaction.classList.add('user-reacted');
      }
    } else {
      const reactionElement = document.createElement('div');
      reactionElement.classList.add('reaction');
      reactionElement.dataset.emoji = reaction;
      
      if (userId === currentUserId) {
        reactionElement.classList.add('user-reacted');
      }
      
      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = reaction;
      emojiSpan.classList.add('reaction-emoji');
      
      const countSpan = document.createElement('span');
      countSpan.textContent = '1';
      countSpan.classList.add('reaction-count');
      
      const tooltip = document.createElement('span');
      tooltip.textContent = userId;
      tooltip.classList.add('reaction-tooltip');
      
      reactionElement.appendChild(emojiSpan);
      reactionElement.appendChild(countSpan);
      reactionElement.appendChild(tooltip);
      
      reactionElement.addEventListener('click', () => {
        if (currentUserId) {
          const isUserReaction = reactionElement.classList.contains('user-reacted');
          
          if (isUserReaction) {
            socket.emit('removeReaction', { 
              messageId: messageId, 
              reaction: reaction 
            });
          } else {
            socket.emit('reactToMessage', { 
              messageId: messageId, 
              reaction: reaction 
            });
          }
        }
      });
      
      reactionsContainer.appendChild(reactionElement);
    }
  }
}


function connect() {
  const userId = userIdInput.value.trim();
  if (!userId) {
    addMessage('Please enter a User ID.', 'error');
    return;
  }

  if (socket && socket.connected) {
    addMessage(
      'Already connected. Disconnect first if you want to change User ID.',
      'status',
    );
    return;
  }

  currentUserId = userId;
  userReactions.clear(); 
  onlineUsers.clear(); 

  socket = io('http://localhost:3000', {
    query: {
      userId: userId,
    },
  });

  connectionStatus.textContent = 'Status: Connecting...';
  addMessage(`Attempting to connect as User ID: ${userId}`, 'status');

  socket.on('connect', onConnect);
  socket.on('connection_success', onConnectionSuccess);
  socket.on('disconnect', onDisconnect);
  socket.on('error', onError);
  socket.on('joinedRoom', onJoinedRoom);
  socket.on('receiveMessage', onReceiveMessage);
  socket.on('typing', onTyping);
  socket.on('messageReaction', onMessageReaction);
  socket.on('reactionRemoved', onReactionRemoved);
  
  socket.on('userPresenceUpdate', onUserPresenceUpdate);
  socket.on('userPresenceList', onUserPresenceList);
  socket.on('userPresenceInfo', onUserPresenceInfo);
}

function onConnect() {
  connectionStatus.textContent = `Status: Connected`;
  connectionStatus.classList.add('connected');
  addMessage(`Connected to chat server`, 'status');
  
  appContainer.style.display = 'flex';
  userIdInput.disabled = true;
  connectButton.textContent = 'Disconnect';
  connectButton.onclick = disconnect;
}

function onConnectionSuccess(data) {
  addMessage(`Login success: ${data.userId} (Socket: ${data.clientId})`, 'status');
}

function onError(errorMsg) {
  addMessage(`Error: ${errorMsg}`, 'error');
}

function onDisconnect(reason) {
  connectionStatus.textContent = 'Status: Disconnected';
  connectionStatus.classList.remove('connected');
  addMessage(`Disconnected: ${reason}`, 'status');
  resetUI();
}

function onJoinedRoom(room) {
  addMessage(`Joined room: ${room}`, 'status');
  currentRoom = room;
  currentRoomStatus.textContent = `Currently in: #${currentRoom}`;
  messageInputContainer.style.display = 'flex';
  whisperControls.style.display = 'flex';
  messageInput.focus();
}

function onReceiveMessage(message) {
  addMessage(
    '',
    'info',
    message.isWhisper,
    message
  );
}

function onTyping(data) {
  const localUserId = userIdInput.value.trim();

  if (data.user === localUserId) {
    return;
  }

  if (data.room && data.room === currentRoom) {
    if (data.isTyping) {
      typingIndicator.textContent = `${data.user} is typing...`;
    } else {
      if (typingIndicator.textContent === `${data.user} is typing...`) {
        typingIndicator.textContent = '';
      }
    }
  }
}

function onMessageReaction(data) {
  handleMessageReaction(data.messageId, data.userId, data.reaction);
}

function onReactionRemoved(data) {
  handleMessageReaction(data.messageId, data.userId, data.reaction, true);
}

function onUserPresenceUpdate(presenceData) {
  onlineUsers.set(presenceData.userId, presenceData);
  
  updateOnlineUsersList();
  
  if (selectedUserForProfile && selectedUserForProfile.userId === presenceData.userId) {
    showUserProfile(presenceData);
  }
}

function onUserPresenceList(userList) {
  onlineUsers.clear();
  userList.forEach(user => {
    onlineUsers.set(user.userId, user);
  });
  
  updateOnlineUsersList();
}

function onUserPresenceInfo(presenceData) {
  onlineUsers.set(presenceData.userId, presenceData);
  
  showUserProfile(presenceData);
}

function resetUI() {
  appContainer.style.display = 'none';
  roomSection.style.display = 'block';
  messageInputContainer.style.display = 'none';
  whisperControls.style.display = 'none';
  currentRoom = null;
  currentRoomStatus.textContent = 'Not in any room.';
  typingIndicator.textContent = '';
  userIdInput.disabled = false;
  connectButton.textContent = 'Connect';
  connectButton.onclick = connect;
  userReactions.clear();
  onlineUsers.clear();
  
  onlineUsersList.innerHTML = '';
}


function disconnect() {
  if (socket) {
    socket.disconnect();
  }
}


function updateStatus() {
  if (!socket || !socket.connected) {
    addMessage('Not connected to the server.', 'error');
    return;
  }
  
  const status = statusSelector.value;
  const customStatusText = customStatus.value.trim() || undefined;
  
  socket.emit('updateStatus', {
    status,
    customStatus: customStatusText
  });
  
  addMessage(`Status updated to: ${status}${customStatusText ? ` (${customStatusText})` : ''}`, 'status');
}



statusSelector.addEventListener('change', updateStatus);
updateStatusButton.addEventListener('click', updateStatus);

closeProfileModal.addEventListener('click', () => {
  userProfileModal.style.display = 'none';
  selectedUserForProfile = null;
});

sendDirectMessageBtn.addEventListener('click', () => {
  if (selectedUserForProfile) {
    userProfileModal.style.display = 'none';
    
    const message = prompt(`Enter a direct message to ${selectedUserForProfile.userId}:`);
    if (message && message.trim()) {
      socket.emit('sendMessage', {
        message: message.trim(),
        recipientUserId: selectedUserForProfile.userId
      });
    }
  }
});

emojiList.addEventListener('click', (event) => {
  const target = event.target;
  if (target.classList.contains('emoji-button') && selectedMessageId) {
    const reaction = target.dataset.emoji;
    
    const existingReaction = userReactions.get(selectedMessageId);
    
    if (existingReaction === reaction) {
      socket.emit('removeReaction', { 
        messageId: selectedMessageId, 
        reaction: reaction 
      });
    } else {
      socket.emit('reactToMessage', { 
        messageId: selectedMessageId, 
        reaction: reaction 
      });
    }
    
    closeEmojiModalHandler();
  }
});

closeEmojiModal.addEventListener('click', closeEmojiModalHandler);

connectButton.addEventListener('click', connect);

joinRoomButton.addEventListener('click', () => {
  const roomName = roomNameInput.value.trim();
  if (!roomName) {
    addMessage('Please enter a room name.', 'error');
    return;
  }
  if (socket && socket.connected) {
    addMessage(`Joining room: ${roomName}...`, 'status');
    socket.emit('joinRoom', roomName);
  } else {
    addMessage('Not connected to the server.', 'error');
  }
});

sendMessageButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessage();
  }
});

messageInput.addEventListener('input', () => {
  if (socket && socket.connected && currentRoom) {
    if (typingTimeout) clearTimeout(typingTimeout);
    else socket.emit('typing', { room: currentRoom, isTyping: true });
    
    typingTimeout = setTimeout(() => {
      socket.emit('typing', { room: currentRoom, isTyping: false });
      typingTimeout = null;
    }, 2000);
  }
});

function sendMessage() {
  const messageText = messageInput.value.trim();
  if (!messageText) return;

  if (socket && socket.connected && currentRoom) {
    socket.emit('sendMessage', {
      message: messageText,
      room: currentRoom,
      isWhisper: whisperModeCheckbox.checked,
    });
    messageInput.value = '';
    messageInput.focus();
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      typingTimeout = null;
      socket.emit('typing', { room: currentRoom, isTyping: false });
    }
  } else {
    addMessage('Not connected or not in a room.', 'error');
  }
}