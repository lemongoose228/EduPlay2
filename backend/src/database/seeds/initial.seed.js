"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeed = runSeed;
const bcrypt = __importStar(require("bcryptjs"));
const user_entity_1 = require("../../modules/users/entities/user.entity");
const game_entity_1 = require("../../modules/games/entities/game.entity");
const category_entity_1 = require("../../modules/games/entities/category.entity");
const question_entity_1 = require("../../modules/games/entities/question.entity");
async function runSeed(connection) {
    const userRepository = connection.getRepository(user_entity_1.User);
    const gameRepository = connection.getRepository(game_entity_1.Game);
    const categoryRepository = connection.getRepository(category_entity_1.Category);
    const questionRepository = connection.getRepository(question_entity_1.Question);
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = await userRepository.save({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Тестовый Пользователь',
    });
    const game1 = await gameRepository.save({
        title: 'История России',
        description: 'Проверьте свои знания истории России',
        type: 'own',
        status: 'published',
        author: user,
        plays: 1234,
        rating: 4.8,
        settings: {
            allowNegativeScores: true,
        },
    });
    const categories = [
        {
            name: 'Древняя Русь',
            order: 0,
            game: game1,
        },
        {
            name: 'Российская Империя',
            order: 1,
            game: game1,
        },
        {
            name: 'Советский период',
            order: 2,
            game: game1,
        },
        {
            name: 'Современная Россия',
            order: 3,
            game: game1,
        },
    ];
    for (const catData of categories) {
        const category = await categoryRepository.save(catData);
        const questions = [100, 200, 300, 400, 500].map((value, index) => ({
            value,
            question: `Вопрос ${index + 1} для категории ${category.name}`,
            answer: `Ответ ${index + 1}`,
            category,
        }));
        await questionRepository.save(questions);
    }
    const game2 = await gameRepository.save({
        title: 'География мира',
        description: 'Увлекательная викторина о странах и столицах',
        type: 'quiz',
        status: 'published',
        author: user,
        plays: 892,
        rating: 4.5,
        settings: {
            timePerQuestion: 30,
        },
    });
    const quizCategory = await categoryRepository.save({
        name: 'Основные вопросы',
        order: 0,
        game: game2,
    });
    const quizQuestions = [
        { value: 100, question: 'Столица Франции?', answer: 'Париж' },
        { value: 200, question: 'Самая длинная река в мире?', answer: 'Нил' },
        { value: 300, question: 'Самая высокая гора?', answer: 'Эверест' },
        { value: 400, question: 'Самая маленькая страна?', answer: 'Ватикан' },
        { value: 500, question: 'Самый большой океан?', answer: 'Тихий' },
    ];
    await questionRepository.save(quizQuestions.map(q => ({ ...q, category: quizCategory })));
    console.log('Seed data created successfully');
}
