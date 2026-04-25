"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const sessions_service_1 = require("./sessions.service");
let SessionsGateway = class SessionsGateway {
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
        this.userSockets = new Map();
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        for (const [userId, socketId] of this.userSockets.entries()) {
            if (socketId === client.id) {
                this.userSockets.delete(userId);
                break;
            }
        }
    }
    async handleJoinSession(client, data) {
        client.join(`session-${data.sessionId}`);
        this.userSockets.set(data.userId, client.id);
        const session = await this.sessionsService.findOne(data.sessionId);
        this.server.to(`session-${data.sessionId}`).emit('session-updated', session);
    }
    handleLeaveSession(client, data) {
        client.leave(`session-${data.sessionId}`);
    }
    async handleQuestionOpened(data) {
        this.server.to(`session-${data.sessionId}`).emit('question-opened', {
            categoryId: data.categoryId,
            questionId: data.questionId,
        });
    }
    async handleScoreUpdated(data) {
        this.server.to(`session-${data.sessionId}`).emit('score-updated', {
            teamId: data.teamId,
            newScore: data.newScore,
        });
    }
    async handleGameStarted(data) {
        this.server.to(`session-${data.sessionId}`).emit('game-started');
    }
    async handleGameFinished(data) {
        this.server.to(`session-${data.sessionId}`).emit('game-finished');
    }
};
exports.SessionsGateway = SessionsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SessionsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join-session'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], SessionsGateway.prototype, "handleJoinSession", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave-session'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], SessionsGateway.prototype, "handleLeaveSession", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('question-opened'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionsGateway.prototype, "handleQuestionOpened", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('score-updated'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionsGateway.prototype, "handleScoreUpdated", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game-started'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionsGateway.prototype, "handleGameStarted", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('game-finished'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SessionsGateway.prototype, "handleGameFinished", null);
exports.SessionsGateway = SessionsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: 'http://localhost:5173',
            credentials: true,
        },
        namespace: 'sessions',
    }),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsGateway);
