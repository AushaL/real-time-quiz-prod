import mongoose from "mongoose";
import { Quiz } from "../models/quiz.model.js";
import { config } from "dotenv";

config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_LOCAL);

    // Clear existing data
    await Quiz.deleteMany({});

    const quizzes = [
      {
        title: "Основы JavaScript",
        description:
          "Проверь свои знания базового синтаксиса и конструкций JavaScript.",
        difficulty: 2,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какое ключевое слово объявляет переменную с блочной областью видимости?",
            questionType: "text",
            options: ["var", "let", "function", "global"],
            correctAnswerIndex: 1,
            explanation:
              "`let` (и `const`) создают переменную с блочной областью видимости, в отличие от `var`.",
          },
          {
            questionText: "Что вернёт выражение `typeof null`?",
            questionType: "text",
            options: ["\"null\"", "\"undefined\"", "\"object\"", "\"number\""],
            correctAnswerIndex: 2,
            explanation:
              "Историческая особенность языка: `typeof null` возвращает `\"object\"`.",
          },
          {
            questionText: "Какой метод добавляет элемент в конец массива?",
            questionType: "text",
            options: ["push()", "pop()", "shift()", "unshift()"],
            correctAnswerIndex: 0,
            explanation: "`push()` добавляет один или несколько элементов в конец массива.",
          },
          {
            questionText: "Что выведет `console.log(2 + \"2\")`?",
            questionType: "text",
            options: ["4", "\"22\"", "NaN", "22"],
            correctAnswerIndex: 1,
            explanation:
              "При сложении числа со строкой число приводится к строке, поэтому результат — строка \"22\".",
          },
          {
            questionText: "Какой оператор сравнивает значения без приведения типов?",
            questionType: "text",
            options: ["==", "===", "=", "!="],
            correctAnswerIndex: 1,
            explanation:
              "Оператор `===` проверяет строгое равенство: сравнивает и значение, и тип.",
          },
          {
            questionText: "Что вернёт выражение `typeof undefined`?",
            questionType: "text",
            options: ["\"undefined\"", "\"null\"", "\"object\"", "\"number\""],
            correctAnswerIndex: 0,
            explanation: "`typeof undefined` возвращает строку `\"undefined\"`.",
          },
          {
            questionText: "Что делает метод массива `map()`?",
            questionType: "text",
            options: [
              "Изменяет исходный массив на месте",
              "Возвращает новый массив, преобразуя каждый элемент",
              "Удаляет дубликаты из массива",
              "Находит индекс первого совпадения",
            ],
            correctAnswerIndex: 1,
            explanation:
              "`map()` возвращает новый массив, применяя переданную функцию к каждому элементу, не изменяя исходный.",
          },
          {
            questionText: "Что вернёт выражение `typeof []`?",
            questionType: "text",
            options: ["\"array\"", "\"object\"", "\"undefined\"", "\"list\""],
            correctAnswerIndex: 1,
            explanation:
              "Массивы в JavaScript являются объектами, поэтому `typeof []` возвращает `\"object\"`.",
          },
        ],
      },
      {
        title: "Столицы мира",
        description:
          "Сможешь угадать столицу по её стране? Проверь свою географию.",
        difficulty: 3,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у Австралии?",
            questionType: "text",
            options: ["Сидней", "Мельбурн", "Канберра", "Перт"],
            correctAnswerIndex: 2,
            explanation:
              "Столицей Австралии является Канберра, а не крупнейший город Сидней.",
          },
          {
            questionText: "Какая столица у Канады?",
            questionType: "text",
            options: ["Торонто", "Ванкувер", "Монреаль", "Оттава"],
            correctAnswerIndex: 3,
            explanation: "Столица Канады — Оттава.",
          },
          {
            questionText: "Какая столица у Бразилии?",
            questionType: "text",
            options: ["Рио-де-Жанейро", "Сан-Паулу", "Бразилиа", "Салвадор"],
            correctAnswerIndex: 2,
            explanation:
              "Бразилиа была специально построена как новая столица в 1960 году.",
          },
          {
            questionText: "Какая столица у Швейцарии?",
            questionType: "text",
            options: ["Цюрих", "Женева", "Берн", "Базель"],
            correctAnswerIndex: 2,
            explanation:
              "Столица Швейцарии — Берн, хотя Цюрих и Женева более известны.",
          },
          {
            questionText: "Какая столица у Турции?",
            questionType: "text",
            options: ["Стамбул", "Анкара", "Измир", "Анталья"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Турции — Анкара, а не крупнейший город Стамбул.",
          },
          {
            questionText: "Какая столица у Новой Зеландии?",
            questionType: "text",
            options: ["Окленд", "Крайстчерч", "Веллингтон", "Данидин"],
            correctAnswerIndex: 2,
            explanation:
              "Столица Новой Зеландии — Веллингтон, расположенный на юге Северного острова.",
          },
          {
            questionText: "Какая столица у Нидерландов?",
            questionType: "text",
            options: ["Амстердам", "Роттердам", "Гаага", "Утрехт"],
            correctAnswerIndex: 0,
            explanation:
              "Официальная столица Нидерландов — Амстердам, хотя правительство находится в Гааге.",
          },
          {
            questionText: "Какая столица у Южной Кореи?",
            questionType: "text",
            options: ["Пусан", "Инчхон", "Тэгу", "Сеул"],
            correctAnswerIndex: 3,
            explanation: "Столица Южной Кореи — Сеул.",
          },
          {
            questionText: "Какая столица у Египта?",
            questionType: "text",
            options: ["Александрия", "Каир", "Гиза", "Луксор"],
            correctAnswerIndex: 1,
            explanation: "Столица Египта — Каир.",
          },
          {
            questionText: "Какая столица у Аргентины?",
            questionType: "text",
            options: ["Кордова", "Росарио", "Буэнос-Айрес", "Мендоса"],
            correctAnswerIndex: 2,
            explanation: "Столица Аргентины — Буэнос-Айрес.",
          },
          {
            questionText: "Какая столица у Индии?",
            questionType: "text",
            options: ["Мумбаи", "Нью-Дели", "Калькутта", "Бангалор"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Индии — Нью-Дели, а не крупнейший город Мумбаи.",
          },
          {
            questionText: "Какая столица у Испании?",
            questionType: "text",
            options: ["Барселона", "Валенсия", "Севилья", "Мадрид"],
            correctAnswerIndex: 3,
            explanation: "Столица Испании — Мадрид.",
          },
        ],
      },
      {
        title: "Столицы для начинающих",
        description:
          "Самые известные столицы мира. Идеально, чтобы размяться.",
        difficulty: 1,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у Франции?",
            questionType: "text",
            options: ["Марсель", "Лион", "Париж", "Ницца"],
            correctAnswerIndex: 2,
            explanation: "Столица Франции — Париж.",
          },
          {
            questionText: "Какая столица у Италии?",
            questionType: "text",
            options: ["Милан", "Рим", "Неаполь", "Венеция"],
            correctAnswerIndex: 1,
            explanation: "Столица Италии — Рим.",
          },
          {
            questionText: "Какая столица у Германии?",
            questionType: "text",
            options: ["Мюнхен", "Гамбург", "Берлин", "Франкфурт"],
            correctAnswerIndex: 2,
            explanation: "Столица Германии — Берлин.",
          },
          {
            questionText: "Какая столица у Японии?",
            questionType: "text",
            options: ["Осака", "Киото", "Токио", "Нагоя"],
            correctAnswerIndex: 2,
            explanation: "Столица Японии — Токио.",
          },
        ],
      },
      {
        title: "Столицы Европы",
        description:
          "Столицы европейских государств — от Португалии до Чехии.",
        difficulty: 2,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у Португалии?",
            questionType: "text",
            options: ["Порту", "Лиссабон", "Фару", "Коимбра"],
            correctAnswerIndex: 1,
            explanation: "Столица Португалии — Лиссабон.",
          },
          {
            questionText: "Какая столица у Греции?",
            questionType: "text",
            options: ["Салоники", "Афины", "Патры", "Ираклион"],
            correctAnswerIndex: 1,
            explanation: "Столица Греции — Афины.",
          },
          {
            questionText: "Какая столица у Норвегии?",
            questionType: "text",
            options: ["Берген", "Осло", "Тронхейм", "Ставангер"],
            correctAnswerIndex: 1,
            explanation: "Столица Норвегии — Осло.",
          },
          {
            questionText: "Какая столица у Швеции?",
            questionType: "text",
            options: ["Гётеборг", "Мальмё", "Стокгольм", "Уппсала"],
            correctAnswerIndex: 2,
            explanation: "Столица Швеции — Стокгольм.",
          },
          {
            questionText: "Какая столица у Польши?",
            questionType: "text",
            options: ["Краков", "Варшава", "Гданьск", "Вроцлав"],
            correctAnswerIndex: 1,
            explanation: "Столица Польши — Варшава.",
          },
          {
            questionText: "Какая столица у Чехии?",
            questionType: "text",
            options: ["Брно", "Прага", "Острава", "Пльзень"],
            correctAnswerIndex: 1,
            explanation: "Столица Чехии — Прага.",
          },
          {
            questionText: "Какая столица у Австрии?",
            questionType: "text",
            options: ["Зальцбург", "Вена", "Грац", "Линц"],
            correctAnswerIndex: 1,
            explanation: "Столица Австрии — Вена.",
          },
          {
            questionText: "Какая столица у Бельгии?",
            questionType: "text",
            options: ["Антверпен", "Брюгге", "Брюссель", "Гент"],
            correctAnswerIndex: 2,
            explanation: "Столица Бельгии — Брюссель.",
          },
        ],
      },
      {
        title: "Столицы Африки",
        description:
          "Проверь, насколько хорошо ты знаешь африканские столицы.",
        difficulty: 2,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у Нигерии?",
            questionType: "text",
            options: ["Лагос", "Абуджа", "Кано", "Ибадан"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Нигерии — Абуджа, а не крупнейший город Лагос.",
          },
          {
            questionText: "Какая столица у Кении?",
            questionType: "text",
            options: ["Момбаса", "Найроби", "Кисуму", "Накуру"],
            correctAnswerIndex: 1,
            explanation: "Столица Кении — Найроби.",
          },
          {
            questionText: "Какая столица у Эфиопии?",
            questionType: "text",
            options: ["Аддис-Абеба", "Дыре-Дауа", "Мекеле", "Гондэр"],
            correctAnswerIndex: 0,
            explanation: "Столица Эфиопии — Аддис-Абеба.",
          },
          {
            questionText: "Какая столица у Ганы?",
            questionType: "text",
            options: ["Кумаси", "Аккра", "Тамале", "Секонди"],
            correctAnswerIndex: 1,
            explanation: "Столица Ганы — Аккра.",
          },
          {
            questionText: "Какая столица у Марокко?",
            questionType: "text",
            options: ["Касабланка", "Марракеш", "Рабат", "Фес"],
            correctAnswerIndex: 2,
            explanation:
              "Столица Марокко — Рабат, хотя Касабланка крупнее.",
          },
          {
            questionText: "Какая столица у Туниса?",
            questionType: "text",
            options: ["Сфакс", "Сус", "Тунис", "Кайруан"],
            correctAnswerIndex: 2,
            explanation: "Столица Туниса — Тунис.",
          },
          {
            questionText: "Какая столица у Сенегала?",
            questionType: "text",
            options: ["Дакар", "Тиес", "Сен-Луи", "Туба"],
            correctAnswerIndex: 0,
            explanation: "Столица Сенегала — Дакар.",
          },
          {
            questionText: "Какая столица у Уганды?",
            questionType: "text",
            options: ["Энтеббе", "Кампала", "Гулу", "Мбарара"],
            correctAnswerIndex: 1,
            explanation: "Столица Уганды — Кампала.",
          },
        ],
      },
      {
        title: "Столицы Азии",
        description:
          "От Пекина до Багдада: угадай азиатские столицы.",
        difficulty: 3,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у Китая?",
            questionType: "text",
            options: ["Шанхай", "Пекин", "Гуанчжоу", "Шэньчжэнь"],
            correctAnswerIndex: 1,
            explanation: "Столица Китая — Пекин.",
          },
          {
            questionText: "Какая столица у Таиланда?",
            questionType: "text",
            options: ["Бангкок", "Чиангмай", "Пхукет", "Паттайя"],
            correctAnswerIndex: 0,
            explanation: "Столица Таиланда — Бангкок.",
          },
          {
            questionText: "Какая столица у Вьетнама?",
            questionType: "text",
            options: ["Хошимин", "Ханой", "Дананг", "Хюэ"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Вьетнама — Ханой, а не крупнейший город Хошимин.",
          },
          {
            questionText: "Какая столица у Монголии?",
            questionType: "text",
            options: ["Эрдэнэт", "Дархан", "Улан-Батор", "Чойбалсан"],
            correctAnswerIndex: 2,
            explanation: "Столица Монголии — Улан-Батор.",
          },
          {
            questionText: "Какая столица у Казахстана?",
            questionType: "text",
            options: ["Алматы", "Астана", "Шымкент", "Караганда"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Казахстана — Астана (ранее Нур-Султан).",
          },
          {
            questionText: "Какая столица у Узбекистана?",
            questionType: "text",
            options: ["Самарканд", "Бухара", "Ташкент", "Наманган"],
            correctAnswerIndex: 2,
            explanation: "Столица Узбекистана — Ташкент.",
          },
          {
            questionText: "Какая столица у Ирана?",
            questionType: "text",
            options: ["Тегеран", "Исфахан", "Шираз", "Мешхед"],
            correctAnswerIndex: 0,
            explanation: "Столица Ирана — Тегеран.",
          },
          {
            questionText: "Какая столица у Саудовской Аравии?",
            questionType: "text",
            options: ["Джидда", "Эр-Рияд", "Мекка", "Медина"],
            correctAnswerIndex: 1,
            explanation: "Столица Саудовской Аравии — Эр-Рияд.",
          },
          {
            questionText: "Какая столица у Индонезии?",
            questionType: "text",
            options: ["Джакарта", "Сурабая", "Бандунг", "Медан"],
            correctAnswerIndex: 0,
            explanation: "Столица Индонезии — Джакарта.",
          },
          {
            questionText: "Какая столица у Филиппин?",
            questionType: "text",
            options: ["Кесон-Сити", "Манила", "Себу", "Давао"],
            correctAnswerIndex: 1,
            explanation: "Столица Филиппин — Манила.",
          },
          {
            questionText: "Какая столица у Малайзии?",
            questionType: "text",
            options: ["Куала-Лумпур", "Путраджая", "Джорджтаун", "Джохор-Бару"],
            correctAnswerIndex: 0,
            explanation:
              "Куала-Лумпур — столица Малайзии, а Путраджая — административный центр правительства.",
          },
          {
            questionText: "Какая столица у Ирака?",
            questionType: "text",
            options: ["Басра", "Мосул", "Багдад", "Эрбиль"],
            correctAnswerIndex: 2,
            explanation: "Столица Ирака — Багдад.",
          },
        ],
      },
      {
        title: "Столицы Америки",
        description:
          "Северная и Южная Америка: угадай столицы обоих континентов.",
        difficulty: 3,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у США?",
            questionType: "text",
            options: ["Нью-Йорк", "Вашингтон", "Лос-Анджелес", "Чикаго"],
            correctAnswerIndex: 1,
            explanation:
              "Столица США — Вашингтон, а не крупнейший город Нью-Йорк.",
          },
          {
            questionText: "Какая столица у Мексики?",
            questionType: "text",
            options: ["Гвадалахара", "Мехико", "Монтеррей", "Канкун"],
            correctAnswerIndex: 1,
            explanation: "Столица Мексики — Мехико.",
          },
          {
            questionText: "Какая столица у Чили?",
            questionType: "text",
            options: ["Вальпараисо", "Сантьяго", "Консепсьон", "Антофагаста"],
            correctAnswerIndex: 1,
            explanation: "Столица Чили — Сантьяго.",
          },
          {
            questionText: "Какая столица у Перу?",
            questionType: "text",
            options: ["Куско", "Лима", "Арекипа", "Трухильо"],
            correctAnswerIndex: 1,
            explanation: "Столица Перу — Лима.",
          },
          {
            questionText: "Какая столица у Колумбии?",
            questionType: "text",
            options: ["Медельин", "Кали", "Богота", "Картахена"],
            correctAnswerIndex: 2,
            explanation: "Столица Колумбии — Богота.",
          },
          {
            questionText: "Какая столица у Венесуэлы?",
            questionType: "text",
            options: ["Каракас", "Маракайбо", "Валенсия", "Баркисимето"],
            correctAnswerIndex: 0,
            explanation: "Столица Венесуэлы — Каракас.",
          },
          {
            questionText: "Какая столица у Кубы?",
            questionType: "text",
            options: ["Гавана", "Сантьяго-де-Куба", "Камагуэй", "Ольгин"],
            correctAnswerIndex: 0,
            explanation: "Столица Кубы — Гавана.",
          },
          {
            questionText: "Какая столица у Панамы?",
            questionType: "text",
            options: ["Колон", "Панама", "Давид", "Сантьяго"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Панамы — город Панама, одноимённый со страной.",
          },
          {
            questionText: "Какая столица у Коста-Рики?",
            questionType: "text",
            options: ["Сан-Хосе", "Алахуэла", "Картаго", "Лимон"],
            correctAnswerIndex: 0,
            explanation: "Столица Коста-Рики — Сан-Хосе.",
          },
          {
            questionText: "Какая столица у Ямайки?",
            questionType: "text",
            options: ["Монтего-Бей", "Кингстон", "Спаниш-Таун", "Очо-Риос"],
            correctAnswerIndex: 1,
            explanation: "Столица Ямайки — Кингстон.",
          },
          {
            questionText: "Какая столица у Гаити?",
            questionType: "text",
            options: ["Порт-о-Пренс", "Кап-Аитьен", "Ле-Ке", "Гонаив"],
            correctAnswerIndex: 0,
            explanation: "Столица Гаити — Порт-о-Пренс.",
          },
          {
            questionText: "Какая столица у Доминиканской Республики?",
            questionType: "text",
            options: ["Сантьяго", "Санто-Доминго", "Ла-Романа", "Пуэрто-Плата"],
            correctAnswerIndex: 1,
            explanation: "Столица Доминиканской Республики — Санто-Доминго.",
          },
        ],
      },
      {
        title: "Столицы мира: Эксперт",
        description:
          "Редкие и малоизвестные столицы. Только для настоящих знатоков географии.",
        difficulty: 4,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Какая столица у Бутана?",
            questionType: "text",
            options: ["Тхимпху", "Паро", "Пунакха", "Гелепху"],
            correctAnswerIndex: 0,
            explanation: "Столица Бутана — Тхимпху.",
          },
          {
            questionText: "Какая столица у Буркина-Фасо?",
            questionType: "text",
            options: ["Уагадугу", "Бобо-Диуласо", "Кудугу", "Банфора"],
            correctAnswerIndex: 0,
            explanation: "Столица Буркина-Фасо — Уагадугу.",
          },
          {
            questionText: "Какая столица у Камбоджи?",
            questionType: "text",
            options: ["Сиемреап", "Пномпень", "Баттамбанг", "Сиануквиль"],
            correctAnswerIndex: 1,
            explanation: "Столица Камбоджи — Пномпень.",
          },
          {
            questionText: "Какая столица у Лаоса?",
            questionType: "text",
            options: ["Луангпхабанг", "Вьентьян", "Паксе", "Саваннакхет"],
            correctAnswerIndex: 1,
            explanation: "Столица Лаоса — Вьентьян.",
          },
          {
            questionText: "Какая столица у Мьянмы?",
            questionType: "text",
            options: ["Янгон", "Нейпьидо", "Мандалай", "Баган"],
            correctAnswerIndex: 1,
            explanation:
              "Столица Мьянмы — Нейпьидо, куда правительство переехало из Янгона в 2005 году.",
          },
          {
            questionText: "Какая столица у Намибии?",
            questionType: "text",
            options: ["Виндхук", "Свакопмунд", "Уолфиш-Бей", "Очиваронго"],
            correctAnswerIndex: 0,
            explanation: "Столица Намибии — Виндхук.",
          },
          {
            questionText: "Какая столица у Замбии?",
            questionType: "text",
            options: ["Лусака", "Ндола", "Китве", "Ливингстон"],
            correctAnswerIndex: 0,
            explanation: "Столица Замбии — Лусака.",
          },
          {
            questionText: "Какая столица у Уругвая?",
            questionType: "text",
            options: ["Пунта-дель-Эсте", "Монтевидео", "Сальто", "Пайсанду"],
            correctAnswerIndex: 1,
            explanation: "Столица Уругвая — Монтевидео.",
          },
          {
            questionText: "Какая столица у Парагвая?",
            questionType: "text",
            options: ["Асунсьон", "Сьюдад-дель-Эсте", "Энкарнасьон", "Консепсьон"],
            correctAnswerIndex: 0,
            explanation: "Столица Парагвая — Асунсьон.",
          },
          {
            questionText: "Какая столица у Эквадора?",
            questionType: "text",
            options: ["Гуаякиль", "Кито", "Куэнка", "Амбато"],
            correctAnswerIndex: 1,
            explanation: "Столица Эквадора — Кито.",
          },
          {
            questionText: "Какая столица у Гондураса?",
            questionType: "text",
            options: ["Сан-Педро-Сула", "Тегусигальпа", "Ла-Сейба", "Комаягуа"],
            correctAnswerIndex: 1,
            explanation: "Столица Гондураса — Тегусигальпа.",
          },
          {
            questionText: "Какая столица у Никарагуа?",
            questionType: "text",
            options: ["Манагуа", "Леон", "Гранада", "Масая"],
            correctAnswerIndex: 0,
            explanation: "Столица Никарагуа — Манагуа.",
          },
          {
            questionText: "Какая столица у Суринама?",
            questionType: "text",
            options: ["Парамарибо", "Никкери", "Албина", "Брокопондо"],
            correctAnswerIndex: 0,
            explanation: "Столица Суринама — Парамарибо.",
          },
          {
            questionText: "Какая столица у Джибути?",
            questionType: "text",
            options: ["Обок", "Таджура", "Джибути", "Али-Сабие"],
            correctAnswerIndex: 2,
            explanation:
              "Столица Джибути — город Джибути, одноимённый со страной.",
          },
          {
            questionText: "Какая столица у Руанды?",
            questionType: "text",
            options: ["Кигали", "Бутаре", "Гисеньи", "Рухенгери"],
            correctAnswerIndex: 0,
            explanation: "Столица Руанды — Кигали.",
          },
          {
            questionText: "Какая столица у Мадагаскара?",
            questionType: "text",
            options: ["Антананариву", "Туамасина", "Анцирабе", "Махадзанга"],
            correctAnswerIndex: 0,
            explanation: "Столица Мадагаскара — Антананариву.",
          },
        ],
      },
      {
        title: "Угадай логотип",
        description:
          "Сможешь узнать известные бренды по одному логотипу?",
        difficulty: 1,
        variant: "multiple_choice",
        mode: "live",
        questions: [
          {
            questionText: "Какому бренду принадлежит этот логотип?",
            questionType: "image",
            mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
            options: ["Samsung", "Apple", "Google", "Microsoft"],
            correctAnswerIndex: 1,
            explanation: "Надкушенное яблоко — логотип компании Apple.",
          },
          {
            questionText: "Какому бренду принадлежит этот логотип?",
            questionType: "image",
            mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
            options: ["Adidas", "Puma", "Nike", "Reebok"],
            correctAnswerIndex: 2,
            explanation: "Галочка («swoosh») — логотип Nike.",
          },
          {
            questionText: "Какому бренду принадлежит этот логотип из четырёх колец?",
            questionType: "image",
            mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/9/92/Audi-Logo_2016.svg",
            options: ["BMW", "Mercedes-Benz", "Audi", "Volkswagen"],
            correctAnswerIndex: 2,
            explanation:
              "Четыре переплетённых кольца символизируют четыре объединившиеся компании — это логотип Audi.",
          },
          {
            questionText: "Какому бренду принадлежит этот логотип с жёлтой буквой «M»?",
            questionType: "image",
            mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg",
            options: ["Burger King", "KFC", "McDonald's", "Subway"],
            correctAnswerIndex: 2,
            explanation: "Золотые арки в виде буквы «M» — логотип McDonald's.",
          },
        ],
      },
      {
        title: "Угадай птицу: Лёгкий",
        description:
          "Самые знакомые городские птицы. Справится даже новичок.",
        difficulty: 1,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/House_sparrow_male_in_Prospect_Park_%2853532%29.jpg/1280px-House_sparrow_male_in_Prospect_Park_%2853532%29.jpg",
            options: ["Серая ворона", "Воробей", "Большая синица", "Сизый голубь"],
            correctAnswerIndex: 1,
            explanation:
              "Домовый воробей — самая обычная городская птица, у самца серый верх и чёрный «галстук».",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Great_tit_%28Parus_major%29_Heligan.jpg/1280px-Great_tit_%28Parus_major%29_Heligan.jpg",
            options: ["Сизый голубь", "Воробей", "Большая синица", "Серая ворона"],
            correctAnswerIndex: 2,
            explanation:
              "Жёлтая грудка с чёрной полосой посередине — признак большой синицы.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Columba_livia_%28Rock_Dove%2C_wild%29%2C_Duncansby_Head%2C_Caithness%2C_Scotland_1.jpg/1280px-Columba_livia_%28Rock_Dove%2C_wild%29%2C_Duncansby_Head%2C_Caithness%2C_Scotland_1.jpg",
            options: ["Сизый голубь", "Воробей", "Серая ворона", "Большая синица"],
            correctAnswerIndex: 0,
            explanation:
              "Сизый голубь — дикий предок привычных городских голубей.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Hooded_Crow_%28Corvus_cornix%29_City_Park%2C_Skopje%2C_North_Macedonia.jpg/1280px-Hooded_Crow_%28Corvus_cornix%29_City_Park%2C_Skopje%2C_North_Macedonia.jpg",
            options: ["Большая синица", "Сизый голубь", "Воробей", "Серая ворона"],
            correctAnswerIndex: 3,
            explanation:
              "Серая ворона — серое тело с чёрными головой, крыльями и хвостом.",
          },
        ],
      },
      {
        title: "Угадай птицу: Средний",
        description:
          "Известные птицы лесов и водоёмов. Проверь свою наблюдательность.",
        difficulty: 2,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Bullfinch_male.jpg/1280px-Bullfinch_male.jpg",
            options: ["Снегирь", "Кряква", "Соловей", "Скворец"],
            correctAnswerIndex: 0,
            explanation: "Красногрудый снегирь — частый гость зимних кормушек.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Luscinia_megarhynchos_-_Common_nightingale_-_Nachtegaal_%28cropped%29.jpg/1280px-Luscinia_megarhynchos_-_Common_nightingale_-_Nachtegaal_%28cropped%29.jpg",
            options: ["Скворец", "Соловей", "Дятел", "Снегирь"],
            correctAnswerIndex: 1,
            explanation:
              "Невзрачная коричневатая птица, знаменитая своим пением, — соловей.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Great_spotted_woodpecker_%28Dendrocopos_major%29_male_Drenthe.jpg/1280px-Great_spotted_woodpecker_%28Dendrocopos_major%29_male_Drenthe.jpg",
            options: ["Ласточка", "Снегирь", "Большой пёстрый дятел", "Лебедь-шипун"],
            correctAnswerIndex: 2,
            explanation:
              "Чёрно-белое оперение с красным подхвостьем — большой пёстрый дятел.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Rauchschwalbe_Hirundo_rustica.jpg/1280px-Rauchschwalbe_Hirundo_rustica.jpg",
            options: ["Лебедь-шипун", "Кряква", "Соловей", "Деревенская ласточка"],
            correctAnswerIndex: 3,
            explanation:
              "Вильчатый хвост и красноватое горло — деревенская ласточка.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/SnowyOwlAmericanBlackDuck.jpg/1280px-SnowyOwlAmericanBlackDuck.jpg",
            options: ["Белая сова", "Лебедь-шипун", "Скворец", "Дятел"],
            correctAnswerIndex: 0,
            explanation: "Белая (полярная) сова — обитатель тундры.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/CygneVaires.jpg/1280px-CygneVaires.jpg",
            options: ["Кряква", "Лебедь-шипун", "Снегирь", "Ласточка"],
            correctAnswerIndex: 1,
            explanation:
              "Белый лебедь с оранжево-красным клювом — лебедь-шипун.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Anas_platyrhynchos_male_female_quadrat.jpg/1280px-Anas_platyrhynchos_male_female_quadrat.jpg",
            options: ["Дятел", "Соловей", "Кряква", "Белая сова"],
            correctAnswerIndex: 2,
            explanation: "Самая распространённая речная утка — кряква.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Common_starling_%28Sturnus_vulgaris%29_breeding_male_Marken.jpg/1280px-Common_starling_%28Sturnus_vulgaris%29_breeding_male_Marken.jpg",
            options: ["Снегирь", "Ласточка", "Лебедь-шипун", "Обыкновенный скворец"],
            correctAnswerIndex: 3,
            explanation:
              "Тёмная птица с переливчатым оперением в белых крапинках — скворец.",
          },
        ],
      },
      {
        title: "Угадай птицу: Сложный",
        description:
          "Птицы посложнее — от зимородка до щегла. Для внимательных знатоков.",
        difficulty: 3,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Alcedo_atthis_-England-8_%28cropped%29.jpg/1280px-Alcedo_atthis_-England-8_%28cropped%29.jpg",
            options: ["Удод", "Зимородок", "Чиж", "Щегол"],
            correctAnswerIndex: 1,
            explanation:
              "Яркая голубовато-оранжевая птица, живущая у воды, — зимородок.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Israel._Eurasian_Hoopoe_%286497645007%29.jpg/1280px-Israel._Eurasian_Hoopoe_%286497645007%29.jpg",
            options: ["Удод", "Свиристель", "Зарянка", "Поползень"],
            correctAnswerIndex: 0,
            explanation:
              "Хохолок на голове и длинный изогнутый клюв — удод.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Bombycilla_garrulus%2C_Novosibirsk_1.jpg/1280px-Bombycilla_garrulus%2C_Novosibirsk_1.jpg",
            options: ["Клёст", "Иволга", "Свиристель", "Трясогузка"],
            correctAnswerIndex: 2,
            explanation:
              "Хохлатая птица с красными «капельками» на крыльях — свиристель.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Erithacus_rubecula_with_cocked_head.jpg/1280px-Erithacus_rubecula_with_cocked_head.jpg",
            options: ["Зимородок", "Кукушка", "Серая цапля", "Зарянка"],
            correctAnswerIndex: 3,
            explanation: "Оранжевая грудка — это зарянка (малиновка).",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/20180415_015_Winterswijk_Witte_kwikstaart_%2840785272624%29.jpg/1280px-20180415_015_Winterswijk_Witte_kwikstaart_%2840785272624%29.jpg",
            options: ["Белая трясогузка", "Щегол", "Удод", "Чиж"],
            correctAnswerIndex: 0,
            explanation:
              "Белая трясогузка — чёрно-белая птица с длинным покачивающимся хвостом.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Kleiber_Sitta_europaea-0447.jpg/1280px-Kleiber_Sitta_europaea-0447.jpg",
            options: ["Свиристель", "Поползень", "Иволга", "Зарянка"],
            correctAnswerIndex: 1,
            explanation:
              "Поползень умеет лазать по стволу вниз головой.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Eurasian_siskin_%28Spinus_spinus%29_male_Biebrzanski.jpg/1280px-Eurasian_siskin_%28Spinus_spinus%29_male_Biebrzanski.jpg",
            options: ["Клёст", "Серая цапля", "Чиж", "Кукушка"],
            correctAnswerIndex: 2,
            explanation: "Маленькая зеленовато-жёлтая птица — чиж.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Red_Crossbills_%28Male%29.jpg/1280px-Red_Crossbills_%28Male%29.jpg",
            options: ["Зимородок", "Удод", "Щегол", "Клёст"],
            correctAnswerIndex: 3,
            explanation: "Перекрещённый клюв — главный признак клеста.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://upload.wikimedia.org/wikipedia/commons/6/69/Rigogolo-%28Oriolus_oriolus%29_Lazio%2C_isola_di_Ventotene_%28LT%29_19.4.2024_%28cropped%29.png",
            options: ["Иволга", "Трясогузка", "Поползень", "Чиж"],
            correctAnswerIndex: 0,
            explanation: "Ярко-жёлтый самец — обыкновенная иволга.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Cuckoo_%2851169010335%29.jpg/1280px-Cuckoo_%2851169010335%29.jpg",
            options: ["Свиристель", "Кукушка", "Зарянка", "Серая цапля"],
            correctAnswerIndex: 1,
            explanation:
              "Кукушка известна тем, что подкладывает яйца в чужие гнёзда.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Grey_heron_2022_03_18_01.jpg/1280px-Grey_heron_2022_03_18_01.jpg",
            options: ["Щегол", "Иволга", "Серая цапля", "Удод"],
            correctAnswerIndex: 2,
            explanation:
              "Крупная длинноногая птица, стоящая в воде, — серая цапля.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/072_Wild_European_goldfinch_at_the_Parc_Jura_vaudois_Photo_by_Giles_Laurent.jpg/1280px-072_Wild_European_goldfinch_at_the_Parc_Jura_vaudois_Photo_by_Giles_Laurent.jpg",
            options: ["Клёст", "Трясогузка", "Зимородок", "Щегол"],
            correctAnswerIndex: 3,
            explanation:
              "Красная «маска» на голове и жёлтые полосы на крыльях — щегол.",
          },
        ],
      },
      {
        title: "Угадай птицу: Эксперт",
        description:
          "Редкие и неочевидные птицы. Только для настоящих орнитологов.",
        difficulty: 4,
        variant: "multiple_choice",
        mode: "classic",
        questions: [
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Rougequeue_noir_ichkeul058_%28cropped%29.jpg/1280px-Rougequeue_noir_ichkeul058_%28cropped%29.jpg",
            options: ["Дубонос", "Горихвостка-чернушка", "Варакушка", "Пищуха"],
            correctAnswerIndex: 1,
            explanation:
              "Самец с тёмным оперением и рыжим хвостом — горихвостка-чернушка.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Bluethroat_%28Luscinia_svecica_svecica%29_male_Oppdal.jpg/1280px-Bluethroat_%28Luscinia_svecica_svecica%29_male_Oppdal.jpg",
            options: ["Варакушка", "Усатая синица", "Чечётка", "Серая славка"],
            correctAnswerIndex: 0,
            explanation:
              "Сине-оранжевое «ожерелье» на груди — варакушка.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Hawfinch_%28Coccothraustes_coccothraustes%29_male_Drenthe.jpg/1280px-Hawfinch_%28Coccothraustes_coccothraustes%29_male_Drenthe.jpg",
            options: ["Вертишейка", "Лесной жаворонок", "Дубонос", "Хохлатая синица"],
            correctAnswerIndex: 2,
            explanation:
              "Массивный клюв способен раскалывать косточки — это дубонос.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/%D0%92%D1%83%D1%81%D0%B0%D1%87_8066.jpg/1280px-%D0%92%D1%83%D1%81%D0%B0%D1%87_8066.jpg",
            options: ["Длиннохвостая синица", "Пищуха", "Серая мухоловка", "Усатая синица"],
            correctAnswerIndex: 3,
            explanation:
              "Усатая синица — с характерными «усами» у самца, живёт в тростниках.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Jynx_torquilla_%D0%BA%D1%80%D1%83%D1%82%D0%B8%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BA%D0%B0.jpg/1280px-Jynx_torquilla_%D0%BA%D1%80%D1%83%D1%82%D0%B8%D0%B3%D0%BE%D0%BB%D0%BE%D0%B2%D0%BA%D0%B0.jpg",
            options: ["Вертишейка", "Красноголовый королёк", "Чечётка", "Буроголовая гаичка"],
            correctAnswerIndex: 0,
            explanation:
              "Вертишейка — дятел, умеющий крутить шеей и притворяться змеёй.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Lullula_arborea_%28J%C3%A1n_Svetl%C3%ADk%29.jpg/1280px-Lullula_arborea_%28J%C3%A1n_Svetl%C3%ADk%29.jpg",
            options: ["Серая славка", "Лесной жаворонок", "Мухоловка-пеструшка", "Варакушка"],
            correctAnswerIndex: 1,
            explanation:
              "Лесной жаворонок отличается коротким хохолком и коротким хвостом.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Lophophanes_cristatus_-_01.jpg/1280px-Lophophanes_cristatus_-_01.jpg",
            options: ["Дубонос", "Пищуха", "Хохлатая синица", "Лесная завирушка"],
            correctAnswerIndex: 2,
            explanation: "Пёстрый хохолок на голове — хохлатая синица.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/%D0%94%D0%BE%D0%B2%D0%B3%D0%BE%D1%85%D0%B2%D0%BE%D1%81%D1%82%D0%B0_2.jpg/1280px-%D0%94%D0%BE%D0%B2%D0%B3%D0%BE%D1%85%D0%B2%D0%BE%D1%81%D1%82%D0%B0_2.jpg",
            options: ["Усатая синица", "Вертишейка", "Чечётка", "Длиннохвостая синица"],
            correctAnswerIndex: 3,
            explanation:
              "Очень длинный хвост и белая головка — длиннохвостая синица (ополовник).",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Common_firecrest_Franconville_03.jpg/1280px-Common_firecrest_Franconville_03.jpg",
            options: ["Красноголовый королёк", "Серая мухоловка", "Буроголовая гаичка", "Лесной жаворонок"],
            correctAnswerIndex: 0,
            explanation:
              "Яркая оранжево-красная полоска на темени — красноголовый королёк.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Carduelis_flammea_CT6.jpg/1280px-Carduelis_flammea_CT6.jpg",
            options: ["Серая славка", "Чечётка", "Горихвостка-чернушка", "Дубонос"],
            correctAnswerIndex: 1,
            explanation:
              "Чечётка — маленькая птица с красным пятном на лбу.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Eurasian_Treecreeper_-_Certhia_familiaris_%2854192274817%29.jpg/1280px-Eurasian_Treecreeper_-_Certhia_familiaris_%2854192274817%29.jpg",
            options: ["Хохлатая синица", "Варакушка", "Пищуха", "Мухоловка-пеструшка"],
            correctAnswerIndex: 2,
            explanation:
              "Пищуха ползёт по стволу снизу вверх, словно мышка.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/Muscicapa_striata_%D0%BC%D1%83%D1%85%D0%BE%D0%BB%D0%BE%D0%B2%D0%BA%D0%B0_%D1%81%D1%96%D1%80%D0%B0.jpg/1280px-Muscicapa_striata_%D0%BC%D1%83%D1%85%D0%BE%D0%BB%D0%BE%D0%B2%D0%BA%D0%B0_%D1%81%D1%96%D1%80%D0%B0.jpg",
            options: ["Вертишейка", "Усатая синица", "Лесная завирушка", "Серая мухоловка"],
            correctAnswerIndex: 3,
            explanation:
              "Серая мухоловка ловит насекомых прямо в полёте.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://upload.wikimedia.org/wikipedia/commons/5/53/Ficedula_hypoleuca_-Wood_of_Cree_Nature_Reserve%2C_Scotland_-male-8a.jpg",
            options: ["Мухоловка-пеструшка", "Чечётка", "Красноголовый королёк", "Пищуха"],
            correctAnswerIndex: 0,
            explanation:
              "Чёрно-белый самец мухоловки-пеструшки узнаётся по белому лбу.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Common_Whitethroat.jpg/1280px-Common_Whitethroat.jpg",
            options: ["Дубонос", "Серая славка", "Длиннохвостая синица", "Буроголовая гаичка"],
            correctAnswerIndex: 1,
            explanation:
              "Серая славка — невзрачная птица с белым кольцом вокруг глаза.",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Sumpfmeise_im_NSG_Hirschacker_und_Dossenwald_2.jpg/1280px-Sumpfmeise_im_NSG_Hirschacker_und_Dossenwald_2.jpg",
            options: ["Лесной жаворонок", "Горихвостка-чернушка", "Буроголовая гаичка", "Серая мухоловка"],
            correctAnswerIndex: 2,
            explanation:
              "Буроголовая гаичка (пухляк) — маленькая синица с чёрной «шапочкой».",
          },
          {
            questionText: "Что это за птица?",
            questionType: "image",
            mediaUrl:
              "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Dunnock_%28Prunella_modularis%29_3.jpg/1280px-Dunnock_%28Prunella_modularis%29_3.jpg",
            options: ["Пищуха", "Вертишейка", "Усатая синица", "Лесная завирушка"],
            correctAnswerIndex: 3,
            explanation:
              "Лесная завирушка — скромная коричневато-серая птица.",
          },
        ],
      },
      {
        title: "Музыкальный слух",
        description:
          "Угадай исполнителя или название песни по короткому аудиофрагменту.",
        difficulty: 4,
        variant: "multiple_choice",
        mode: "live",
        questions: [
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-bohemian.mp3",
            options: ["Queen", "The Beatles", "Led Zeppelin", "Pink Floyd"],
            correctAnswerIndex: 0,
            explanation: "Это фрагмент композиции «Bohemian Rhapsody» группы Queen.",
          },
          {
            questionText: "Как называется эта песня?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-imagine.mp3",
            options: ["Let It Be", "Imagine", "Hey Jude", "Yesterday"],
            correctAnswerIndex: 1,
            explanation: "Прозвучал фрагмент песни «Imagine» Джона Леннона.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-billie-jean.mp3",
            options: ["Prince", "Michael Jackson", "Stevie Wonder", "Marvin Gaye"],
            correctAnswerIndex: 1,
            explanation: "Это фрагмент песни «Billie Jean» Майкла Джексона.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-smells-like.mp3",
            options: ["Pearl Jam", "Soundgarden", "Nirvana", "Alice in Chains"],
            correctAnswerIndex: 2,
            explanation: "Прозвучал фрагмент «Smells Like Teen Spirit» группы Nirvana.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-rolling-in-the-deep.mp3",
            options: ["Beyoncé", "Rihanna", "Adele", "Alicia Keys"],
            correctAnswerIndex: 2,
            explanation: "Это фрагмент песни «Rolling in the Deep» Адель.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-nothing-else.mp3",
            options: ["Metallica", "Iron Maiden", "Megadeth", "Slayer"],
            correctAnswerIndex: 0,
            explanation: "Прозвучал фрагмент баллады «Nothing Else Matters» группы Metallica.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-hey-jude.mp3",
            options: ["The Rolling Stones", "The Beatles", "The Who", "The Kinks"],
            correctAnswerIndex: 1,
            explanation: "Это фрагмент песни «Hey Jude» группы The Beatles.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-comfortably.mp3",
            options: ["Led Zeppelin", "Yes", "Genesis", "Pink Floyd"],
            correctAnswerIndex: 3,
            explanation: "Прозвучал фрагмент «Comfortably Numb» группы Pink Floyd.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-shape-of-you.mp3",
            options: ["Shawn Mendes", "Ed Sheeran", "Justin Bieber", "Bruno Mars"],
            correctAnswerIndex: 1,
            explanation: "Это фрагмент песни «Shape of You» Эда Ширана.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-wonderwall.mp3",
            options: ["Blur", "Oasis", "Radiohead", "Coldplay"],
            correctAnswerIndex: 1,
            explanation: "Прозвучал фрагмент песни «Wonderwall» группы Oasis.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-stairway.mp3",
            options: ["Black Sabbath", "Deep Purple", "Led Zeppelin", "The Doors"],
            correctAnswerIndex: 2,
            explanation: "Это фрагмент «Stairway to Heaven» группы Led Zeppelin.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-like-a-rolling.mp3",
            options: ["Neil Young", "Bob Dylan", "Johnny Cash", "Leonard Cohen"],
            correctAnswerIndex: 1,
            explanation: "Прозвучал фрагмент «Like a Rolling Stone» Боба Дилана.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-hotel-california.mp3",
            options: ["Fleetwood Mac", "Eagles", "Lynyrd Skynyrd", "Creedence Clearwater Revival"],
            correctAnswerIndex: 1,
            explanation: "Это фрагмент песни «Hotel California» группы Eagles.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-purple-rain.mp3",
            options: ["David Bowie", "Prince", "George Michael", "Elton John"],
            correctAnswerIndex: 1,
            explanation: "Прозвучал фрагмент песни «Purple Rain» Принса.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-dancing-queen.mp3",
            options: ["Bee Gees", "ABBA", "Boney M.", "Village People"],
            correctAnswerIndex: 1,
            explanation: "Это фрагмент песни «Dancing Queen» группы ABBA.",
          },
          {
            questionText: "Кто исполняет эту песню?",
            questionType: "audio",
            mediaUrl: "https://example.com/snippet-lose-yourself.mp3",
            options: ["Eminem", "Jay-Z", "Kendrick Lamar", "Drake"],
            correctAnswerIndex: 0,
            explanation: "Прозвучал фрагмент «Lose Yourself» Эминема.",
          },
        ],
      },
    ];

    // Insert all quizzes
    const createdQuizzes = await Quiz.insertMany(quizzes);

    console.log("Database seeded successfully!");
    console.log(`Created ${createdQuizzes.length} quizzes.`);
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedDatabase();
