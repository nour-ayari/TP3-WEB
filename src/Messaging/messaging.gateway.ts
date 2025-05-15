import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

export enum UserStatus {
    ONLINE = 'online',
    AWAY = 'away',
    BUSY = 'busy',
    OFFLINE = 'offline'
}

export interface UserPresence {
    userId: string;
    socketId: string;
    status: UserStatus;
    lastActivity: Date;
    customStatus?: string;
}

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class MessagingGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('MessagingGateway');
    private connectedUsers: Map<string, string> = new Map();
    private userReactions: Map<string, Map<string, string>> = new Map();
    private userPresence: Map<string, UserPresence> = new Map();
    private inactivityTimers: Map<string, NodeJS.Timeout> = new Map();

    afterInit() {
        this.logger.log('WebSocket Gateway Initialized');
    }

    async handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;

        if (!userId) {
            this.logger.error('Connection attempt without userId. Disconnecting.');
            client.emit('error', 'User ID is required for connection.');
            client.disconnect();
            return;
        }

        this.logger.log(`Client connected: ${client.id} - UserID: ${userId}`);
        this.connectedUsers.set(userId, client.id);

        if (!this.userReactions.has(userId)) {
            this.userReactions.set(userId, new Map());
        }

        const presenceData: UserPresence = {
            userId,
            socketId: client.id,
            status: UserStatus.ONLINE,
            lastActivity: new Date(),
        };
        this.userPresence.set(userId, presenceData);

        this.setInactivityTimer(userId);

        this.server.emit('userPresenceUpdate', presenceData);

        const onlineUsers = Array.from(this.userPresence.values());
        client.emit('userPresenceList', onlineUsers);

        this.server.emit('userOnline', { userId, socketId: client.id });
        client.emit('onlineUsers', Array.from(this.connectedUsers.keys()));
        client.emit('connection_success', { clientId: client.id, userId });
    }

    handleDisconnect(client: Socket) {
        let disconnectedUserId: string | undefined;
        for (const [uid, sid] of this.connectedUsers.entries()) {
            if (sid === client.id) {
                disconnectedUserId = uid;
                break;
            }
        }

        if (disconnectedUserId) {
            this.connectedUsers.delete(disconnectedUserId);

            if (this.userPresence.has(disconnectedUserId)) {
                const presenceData = this.userPresence.get(disconnectedUserId)!;
                presenceData.status = UserStatus.OFFLINE;
                if (presenceData) {
                    if (presenceData) {
                        if (presenceData) {
                            presenceData.lastActivity = new Date();
                        }
                    }
                }

                this.server.emit('userPresenceUpdate', presenceData);

                if (this.inactivityTimers.has(disconnectedUserId)) {
                    clearTimeout(this.inactivityTimers.get(disconnectedUserId));
                    this.inactivityTimers.delete(disconnectedUserId);
                }
            }

            this.logger.log(`Client disconnected: ${client.id} - UserID: ${disconnectedUserId}`);
            this.server.emit('userOffline', { userId: disconnectedUserId });
        } else {
            this.logger.log(`Client disconnected: ${client.id} - UserID not found in mapping.`);
        }
    }

    private setInactivityTimer(userId: string) {
        if (this.inactivityTimers.has(userId)) {
            clearTimeout(this.inactivityTimers.get(userId));
        }

        const timer = setTimeout(() => {
            if (this.userPresence.has(userId) &&
                this.userPresence.get(userId)?.status === UserStatus.ONLINE) {
                const presenceData = this.userPresence.get(userId);
                if (presenceData) {
                    presenceData.status = UserStatus.AWAY;
                }

                this.server.emit('userPresenceUpdate', presenceData);
                this.logger.log(`User ${userId} automatically set to AWAY due to inactivity`);
            }
        }, 5 * 60 * 1000); // 5 minutes

        this.inactivityTimers.set(userId, timer);
    }

    private updateUserActivity(userId: string) {
        if (this.userPresence.has(userId)) {
            const presenceData = this.userPresence.get(userId)!;
            presenceData.lastActivity = new Date();

            if (presenceData.status === UserStatus.AWAY) {
                presenceData.status = UserStatus.ONLINE;
                this.server.emit('userPresenceUpdate', presenceData);
            }

            this.setInactivityTimer(userId);
        }
    }

    @SubscribeMessage('sendMessage')
    handleMessage(client: Socket, payload: { senderUserId: string; message: string; room?: string; recipientUserId?: string; isWhisper?: boolean }): void {
        const senderSocketId = client.id;
        const userId = client.handshake.query.userId as string;

        this.updateUserActivity(userId);

        let actualSenderUserId: string | undefined;
        for (const [uid, sid] of this.connectedUsers.entries()) {
            if (sid === senderSocketId) {
                actualSenderUserId = uid;
                break;
            }
        }

        if (!actualSenderUserId) {
            client.emit('error', 'Could not identify sender. Message not sent.');
            return;
        }

        const messagePayload = {
            ...payload,
            senderUserId: actualSenderUserId,
            timestamp: new Date(),
            isWhisper: payload.isWhisper || false,
            messageId: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
        };

        this.logger.log(`Message from UserID ${actualSenderUserId} (${senderSocketId}): ${payload.message} (Whisper: ${messagePayload.isWhisper})`);

        if (payload.recipientUserId) {
            const recipientSocketId = this.connectedUsers.get(payload.recipientUserId);
            if (recipientSocketId) {
                this.server.to(recipientSocketId).emit('receiveMessage', messagePayload);
                client.emit('receiveMessage', messagePayload);
                this.logger.log(`Private message sent to UserID ${payload.recipientUserId} (Socket ${recipientSocketId})`);
            } else {
                this.logger.log(`Recipient UserID ${payload.recipientUserId} is not online.`);
                client.emit('error', `User ${payload.recipientUserId} is not online.`);
            }
        } else if (payload.room) {
            this.server.to(payload.room).emit('receiveMessage', messagePayload);
        } else {
            this.server.emit('receiveMessage', messagePayload);
        }
    }

    @SubscribeMessage('updateStatus')
    handleStatusUpdate(client: Socket, payload: { status: UserStatus; customStatus?: string }): void {
        const userId = client.handshake.query.userId as string;

        if (!userId) {
            client.emit('error', 'User ID is required to update status.');
            return;
        }

        if (this.userPresence.has(userId)) {
            const presenceData = this.userPresence.get(userId);
            if (!presenceData) return;
            presenceData.status = payload.status;

            if (payload.customStatus !== undefined) {
                presenceData.customStatus = payload.customStatus;
            }

            if (payload.status === UserStatus.ONLINE) {
                this.updateUserActivity(userId);
            }
            else if (this.inactivityTimers.has(userId)) {
                clearTimeout(this.inactivityTimers.get(userId));
                this.inactivityTimers.delete(userId);
            }

            this.server.emit('userPresenceUpdate', presenceData);
            this.logger.log(`User ${userId} updated status to ${payload.status}`);
        }
    }

    @SubscribeMessage('getUserPresence')
    handleGetUserPresence(client: Socket, userId: string): void {
        if (this.userPresence.has(userId)) {
            client.emit('userPresenceInfo', this.userPresence.get(userId));
        } else {
            client.emit('error', `User ${userId} not found.`);
        }
    }

    @SubscribeMessage('getAllUserPresence')
    handleGetAllUserPresence(client: Socket): void {
        const allPresence = Array.from(this.userPresence.values());
        client.emit('userPresenceList', allPresence);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, room: string): void {
        const userId = client.handshake.query.userId as string;

        this.updateUserActivity(userId);

        client.join(room);
        this.logger.log(`Client ${client.id} (UserID: ${userId}) joined room: ${room}`);
        client.emit('joinedRoom', room);
        client.to(room).emit('userJoinedRoom', { userId, room });
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, room: string): void {
        const userId = client.handshake.query.userId as string;
        client.leave(room);
        this.logger.log(`Client ${client.id} (UserID: ${userId}) left room: ${room}`);
        client.emit('leftRoom', room);
        client.to(room).emit('userLeftRoom', { userId, room });
    }

    @SubscribeMessage('typing')
    handleTyping(client: Socket, payload: { isTyping: boolean; room?: string; recipientUserId?: string }): void {
        const userId = client.handshake.query.userId as string;

        this.updateUserActivity(userId);

        if (!userId) return;

        if (payload.recipientUserId) {
            const recipientSocketId = this.connectedUsers.get(payload.recipientUserId);
            if (recipientSocketId) {
                this.server.to(recipientSocketId).emit('typing', { user: userId, isTyping: payload.isTyping });
            }
        } else if (payload.room) {
            client.to(payload.room).emit('typing', {
                user: userId,
                isTyping: payload.isTyping,
                room: payload.room
            });
        }
    }

    @SubscribeMessage('reactToMessage')
    handleReaction(client: Socket, payload: { messageId: string; reaction: string }): void {
        const userId = client.handshake.query.userId as string;

        this.updateUserActivity(userId);

        if (!userId) {
            client.emit('error', 'User ID is required to react to messages.');
            return;
        }

        const { messageId, reaction } = payload;

        const userReactionMap = this.userReactions.get(userId);
        if (userReactionMap) {
            const existingReaction = userReactionMap.get(messageId);
            if (existingReaction && existingReaction !== reaction) {
                this.server.emit('reactionRemoved', { messageId, userId, reaction: existingReaction });
                this.logger.log(`User ${userId} changed reaction from ${existingReaction} to ${reaction} on message ${messageId}`);
            }

            userReactionMap.set(messageId, reaction);
        }

        this.server.emit('messageReaction', { messageId, userId, reaction });

        this.logger.log(`User ${userId} reacted to message ${messageId} with ${reaction}`);
    }

    @SubscribeMessage('removeReaction')
    handleRemoveReaction(client: Socket, payload: { messageId: string; reaction: string }): void {
        const userId = client.handshake.query.userId as string;

        if (!userId) {
            client.emit('error', 'User ID is required to remove reactions.');
            return;
        }

        const { messageId, reaction } = payload;

        const userReactionMap = this.userReactions.get(userId);
        if (userReactionMap) {
            userReactionMap.delete(messageId);
        }

        this.server.emit('reactionRemoved', { messageId, userId, reaction });

        this.logger.log(`User ${userId} removed reaction ${reaction} from message ${messageId}`);
    }
}