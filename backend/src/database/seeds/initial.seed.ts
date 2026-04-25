import { Connection } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../modules/users/entities/user.entity';
import { Game } from '../../modules/games/entities/game.entity';
import { Category } from '../../modules/games/entities/category.entity';
import { Question } from '../../modules/games/entities/question.entity';

export async function runSeed(connection: Connection) {
  const userRepository = connection.getRepository(User);
  const gameRepository = connection.getRepository(Game);
  const categoryRepository = connection.getRepository(Category);
  const questionRepository = connection.getRepository(Question);

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

  await questionRepository.save(
    quizQuestions.map(q => ({ ...q, category: quizCategory }))
  );

  console.log('Seed data created successfully');
}