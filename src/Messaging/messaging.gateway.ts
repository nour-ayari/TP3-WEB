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

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway Initialized');
    }

    async handleConnection(client: Socket, ...args: any[]) {
        const userId = client.handshake.query.userId as string;

        if (!userId) {
            this.logger.error('Connection attempt without userId. Disconnecting.');
            client.emit('error', 'User ID is required for connection.');
            client.disconnect();
            return;
        }

        this.logger.log(`Client connected: ${client.id} - UserID: ${userId}`);
        this.connectedUsers.set(userId, client.id);

        this.server.emit('userOnline', { userId, socketId: client.id });
        client.emit('onlineUsers', Array.from(this.connectedUsers.keys()));
        client.emit('connection_success', { clientId: client.id, userId });
    }

    handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId as string;

        let disconnectedUserId: string | undefined;
        for (const [uid, sid] of this.connectedUsers.entries()) {
            if (sid === client.id) {
                disconnectedUserId = uid;
                break;
            }
        }

        if (disconnectedUserId) {
            this.connectedUsers.delete(disconnectedUserId);
            this.logger.log(`Client disconnected: ${client.id} - UserID: ${disconnectedUserId}`);
            this.server.emit('userOffline', { userId: disconnectedUserId });
        } else {
            this.logger.log(`Client disconnected: ${client.id} - UserID not found in mapping.`);
        }
    }

    @SubscribeMessage('sendMessage')
    handleMessage(client: Socket, payload: { senderUserId: string; message: string; room?: string; recipientUserId?: string; isWhisper?: boolean }): void {
        const senderSocketId = client.id;

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

    @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, room: string): void {
        const userId = client.handshake.query.userId as string;
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
}