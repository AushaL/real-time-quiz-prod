# Отчёт по безопасности — real-time-quiz-prod

Дата: 2026-10-22
Область проверки: `backend/` (NestJS + Prisma + Socket.IO, Vercel Functions) и `frontend/` (React 19 + Vite, Clerk, Cloudinary).
Метод: чтение кода, трассировка потоков данных от пользовательского ввода, проверка конфигурации CORS/CSP/заголовков, проверка истории git.

## Краткий итог

| # | Уязвимость | Критичность | Статус |
|---|-----------|-------------|--------|
| 1 | Реальные секреты закоммичены в публичный GitHub-репозиторий (`backend/.env`) | **Critical** | Удаление из индекса подготовлено; требуется ротация ключей и очистка истории |
| 2 | Неаутентифицированный публичный Vercel Queues callback → удаление медиа и подмена игрового состояния | **High** | Исправлено |
| 3 | Полностью отсутствуют security-заголовки и CSP | **Medium** | Исправлено |
| 4 | Clerk-токены принимаются без проверки `azp` (authorized parties) | **Medium** | Исправлено |
| 5 | Публичный API отдаёт правильные ответы (`correctAnswerIndex`, `explanation`) | **Medium** | Не исправлено (ограничение дизайна), рекомендация |
| 6 | `@WebSocketGateway({ cors: { origin: true } })` — разрешающая CORS-конфигурация в коде | **Medium** | Исправлено |
| 7 | `imageUrl`/`avatarUrl` принимаются от клиента без валидации | Low | Рекомендация |
| 8 | Нет rate limiting на чувствительных маршрутах | Low | Рекомендация |

XSS, CSRF, SQL/NoSQL-инъекции и SSRF с реальным путём эксплуатации **не обнаружены** (детали ниже).

---

## 1. Critical — секреты в публичном репозитории

**Файл:** `backend/.env` (коммит `f77b946`, присутствует в `HEAD` и `origin/main`)
**Репозиторий:** `https://github.com/AushaL/real-time-quiz-prod` — публичный (GitHub API отвечает `200`).

В репозитории лежат:

* `CLERK_SECRET_KEY` (`sk_test_…`) — backend-ключ Clerk: управление пользователями инстанса;
* `CLOUDINARY_API_SECRET` + `CLOUDINARY_API_KEY` + `CLOUDINARY_CLOUD_NAME` — полный контроль над медиа-аккаунтом (загрузка, удаление, трансформации);
* `DATABASE_LOCAL` (`mongodb://…`) со старым паролем БД;
* `ADMIN_EMAIL` — адрес администратора.

**Сценарий эксплуатации:** любой пользователь GitHub может клонировать репозиторий, получить ключи и удалить/загрузить медиа через Cloudinary API либо выполнять административные операции в Clerk. Пароль MongoDB актуален, если старый кластер ещё жив.

**Что сделано в репозитории:**
* `backend/.env` уже поставлен на удаление из индекса (`git status`: `D backend/.env`);
* `backend/.gitignore` и корневой `.gitignore` игнорируют `.env`, `.env.*`, `*.env`;
* `backend/.env.example` не содержит значений.

**Что обязан сделать владелец (иначе уязвимость остаётся открытой):**

1. **Ротировать все ключи** (это единственная реальная защита, так как история публична и могла быть склонирована):
   * Clerk Dashboard → API Keys → Rotate secret key;
   * Cloudinary Console → Settings → Security → Regenerate API secret;
   * сменить пароль пользователя MongoDB или удалить неиспользуемый кластер;
2. **Вычистить историю** и force-push:
   ```bash
   # после ротации ключей
   git filter-repo --path backend/.env --invert-paths
   git remote add origin https://github.com/AushaL/real-time-quiz-prod.git
   git push --force --all
   git push --force --tags
   ```
   (или GitHub → Settings → пересоздать репозиторий; дополнительно попросить GitHub Support очистить кеш/форки);
3. включить **Secret scanning + Push protection** в настройках GitHub;
4. закоммитить уже подготовленное удаление `backend/.env`.

> Примечание: секреты из истории git нельзя считать удалёнными после `git rm` — они остаются в старых коммитах, форках и кешах. Поэтому пункт 1 обязателен независимо от очистки истории.

---

## 2. High — неаутентифицированный Vercel Queues callback

**Файл:** `backend/api/queue.js` (до исправления)
**Связанные:** `backend/vercel.json` (`experimentalTriggers` → `/api/queue`), `src/jobs/jobs.service.ts`

`api/queue.js` — публичная serverless-функция. `@vercel/queue`'s `handleNodeCallback` **не проверяет подпись запроса** (проверено в `node_modules/@vercel/queue/dist/index.js`: разбираются только CloudEvent-заголовки `ce-*`, никакой верификации). До исправления любой мог отправить POST с заголовками `ce-type: com.vercel.queue.v2beta`, `ce-vqsqueuename/consumergroup/messageid/receipthandle` и телом вида:

```json
{ "type": "media-cleanup", "assets": [{ "publicId": "quiz-media/<id>", "url": "https://res.cloudinary.com/.../video/upload/..." }] }
```

**Последствия:**
* `CloudinaryService.destroy()` удаляет произвольные ассеты аккаунта. Public ID легко получить из публичного `GET /api/quizzes` (`mediaUrl`), т.е. атакующий может стереть всё медиа приложения;
* `advance`/`question-timeout` позволяют вмешиваться в состояние игры, зная код комнаты.

**Исправление:**
* `src/jobs/queue.service.ts`: при отправке в Vercel Queues задача оборачивается в `{ payload, signature }`, где `signature = HMAC-SHA256(JSON.stringify(payload), secret)`; secret — `QUEUE_SIGNING_SECRET`, с fallback на `CLERK_SECRET_KEY`;
* `api/queue.js`: `verifyEnvelope()` проверяет HMAC через `timingSafeEqual`, затем `isValidJob()` дополнительно ограничивает типы задач, формат кода комнаты (`^[A-Z0-9]{4,12}$`) и public id (`^quiz-media/...`);
* неподписанные/некорректные сообщения логируются и подтверждаются (ack) без выполнения;
* `QUEUE_SIGNING_SECRET` добавлен в `src/config/env.validation.ts` и `.env.example` (опционален).

После деплоя сообщения, поставленные в очередь старой версией, будут отброшены — это безопасное поведение; активные игры, если они есть в момент деплоя, дойдут по таймауту.

---

## 3. Medium — отсутствие CSP и security-заголовков

**Файлы:** `backend/src/bootstrap.ts`, `frontend/vercel.json`, `frontend/index.html`

До исправления не отдавался ни один защитный заголовок: ни CSP, ни `X-Frame-Options`, ни `X-Content-Type-Options`, ни `Referrer-Policy`. Следствия: возможен clickjacking админ-панели (`/admin`) и отсутствует второй рубеж защиты при будущих XSS-багах.

**Исправление:**
* `applySecurityHeaders()` в `backend/src/bootstrap.ts` — для всех ответов API: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, строгий `Content-Security-Policy` (`default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`), HSTS в production; удалён `X-Powered-By`;
* `frontend/vercel.json` — заголовки для SPA: CSP с allowlist для Clerk (`*.clerk.accounts.dev`, `*.clerk.com`, Turnstile), Cloudinary/API/WSS, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS.

**Важно:** CSP для фронтенда применяется только на Vercel (заголовки из `vercel.json`). Если Clerk используется на кастомном Frontend API домене (не `*.clerk.accounts.dev` / `*.clerk.com`), добавьте его в `script-src`/`connect-src`/`frame-src`, иначе вход перестанет работать. Локальный `vite dev` CSP не отдаёт.

---

## 4. Medium — Clerk-токены без проверки `azp`

**Файл:** `backend/src/auth/clerk.service.ts:41`

`verifyToken(token, { secretKey })` проверял подпись и срок жизни, но не `authorizedParties`. Токен, выпущенный для любого другого фронтенда того же Clerk-инстанса, принимался backend'ом и Socket.IO-хендшейком.

**Исправление:** в `verifyToken` добавлен `authorizedParties`, список берётся из `FRONTEND_URL` (тот же allowlist, что и для CORS). Юнит-тест обновлён.

**Требование к конфигурации:** `FRONTEND_URL` должен точно совпадать с origin фронтенда (со схемой, без завершающего слэша), иначе запросы будут отклоняться с 401.

---

## 5. Medium — публичный API раскрывает правильные ответы

**Файлы:** `backend/src/quizzes/quiz.mapper.ts:32-42`, `backend/src/quizzes/quizzes.controller.ts:10-17`

`GET /api/quizzes` и `GET /api/quizzes/:id` не требуют авторизации и возвращают `correctAnswerIndex` и `explanation` для каждого вопроса. В live-мультиплеере сервер сам считает очки, поэтому клиенту ответы не нужны — игрок может открыть DevTools/API и видеть правильные ответы, что ломает честность игры.

**Рекомендация:** разделить контракты:
* публичный/игровой ответ — без `correctAnswerIndex`/`explanation`;
* отдельный admin-only эндпоинт (или `?includeAnswers=true` под `ClerkAuthGuard + AdminGuard`) — для редактора и offline-режима.

Не исправлено автоматически, потому что offline/classic-режим сейчас скорит ответы на клиенте и использует эти поля.

---

## 6. Medium — разрешающий CORS в декораторе Socket.IO

**Файл:** `backend/src/realtime/realtime.gateway.ts:45`

Было: `@WebSocketGateway({ cors: { origin: true, credentials: true } })`. Фактически эта конфигурация перекрывалась `RedisIoAdapter.createIOServer()` (там `cors.origin` = allowlist из `FRONTEND_URL`), но оставленный `origin: true` — «мина»: при смене адаптера/порядка инициализации любой origin получил бы доступ.

**Исправление:** CORS из декоратора удалён; единственный источник истины — `RedisIoAdapter` (`src/realtime/redis-io.adapter.ts:25-35`).

---

## 7. Low — невалидируемые `imageUrl` / `avatarUrl`

**Файлы:** `backend/src/auth/dto/auth-callback.dto.ts:20-22`, `backend/src/auth/auth.service.ts:21-31`, `backend/src/realtime/realtime.gateway.ts:223-235`

Клиент передаёт `imageUrl` (и `name`/`avatarUrl` в Socket.IO handshake), значения сохраняются и показываются другим игрокам в `<img src>`. XSS это не даёт (React экранирует, `img` не исполняет `javascript:`), но позволяет:
* подставить трекинг-пиксель/внешний ресурс (утечка IP игроков);
* выдать себя за другого по отображаемому имени.

**Рекомендация:** принимать только `https:`-URL (лучше — только `img.clerk.com`/собственный CDN), ограничить длину `fullName` (например, 80 символов), а профиль брать из Clerk API, а не из тела запроса.

---

## 8. Low — отсутствие rate limiting

Нет ограничений на `POST /api/auth/callback`, `POST /api/media/signature`, `room:join` (подбор 6-символьного кода) и `chat:send`. Это не прямая уязвимость, но снижает стоимость перебора кодов комнат и злоупотребления подписью Cloudinary. Рекомендация: `@nestjs/throttler` или Vercel Firewall rate limits.

---

## Проверка механизмов, о которых спрашивали

### XSS — эксплуатация не найдена
* React 19 автоматически экранирует весь текст; в `frontend/src` нет `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`, `srcdoc` (grep по всему `src/` — пусто).
* Чат (`ChatPanel`), имена и аватары игроков (`Scoreboard`), тексты вопросов/ответов рендерятся как текст/атрибуты `src` (`QuizQuestionCard.tsx:65,71`).
* `mediaUrl` из админки ограничивается Cloudinary-аккаунтом, если передан `mediaPublicId` (`CloudinaryService.resolveClientMedia`), но без `mediaPublicId` допускается произвольный URL — только для админа и только в `img/audio src`, поэтому XSS нет (см. Low #7).
* CSP добавлен как второй рубеж (см. #3).

### CSRF — не применимо
Аутентификация на API и Socket.IO идёт через `Authorization: Bearer <Clerk token>` / `handshake.auth.token`; backend не читает cookie и не полагается на ambient-credentials. Межсайтовый запрос не может приложить токен. `credentials: true` в CORS сам по себе CSRF не создаёт — origin ограничен allowlist'ом. При переходе на cookie-сессии потребуется CSRF-токен и `SameSite`.

### CORS — настроен корректно
* HTTP: `origin` = список из `FRONTEND_URL` (не wildcard), `credentials: true` (`backend/src/bootstrap.ts:57-60`).
* Socket.IO: тот же список в `RedisIoAdapter` (`src/realtime/redis-io.adapter.ts:25-35`).
* Декоратор с `origin: true` удалён (#6).
* Если `FRONTEND_URL` не задан, действует только `http://localhost:3000` — в production это «fail closed», а не уязвимость, но приведёт к неработающему фронтенду.

### CSP — добавлен
См. #3: строгая политика для API и браузерная политика SPA с allowlist Clerk/Turnstile/Cloudinary.

### Прочее
* SQL/NoSQL-инъекции: Prisma с параметризованными запросами; единственный raw-запрос — `SELECT 1` (`health.controller.ts:10`). Динамический `buildWhere` строится из значений, прошедших allowlist (`quiz-query.ts`).
* Command injection / path traversal / SSRF: нет `child_process`, файловых операций и серверных fetch по пользовательским URL.
* Секреты в логах: не логируются (логируются только тексты ошибок Clerk/Cloudinary).
* Ошибки: `HttpExceptionFilter` в production не раскрывает внутренние сообщения.

---

## Изменённые файлы

| Файл | Изменение |
|------|-----------|
| `backend/src/bootstrap.ts` | middleware security-заголовков, удаление `X-Powered-By` |
| `backend/src/auth/clerk.service.ts` | `authorizedParties` для Clerk-токенов |
| `backend/src/jobs/queue.service.ts` | HMAC-подпись задач Vercel Queues |
| `backend/api/queue.js` | проверка подписи + строгая валидация задач |
| `backend/src/config/env.validation.ts`, `backend/.env.example` | `QUEUE_SIGNING_SECRET` |
| `backend/src/realtime/realtime.gateway.ts` | удалён permissive CORS |
| `backend/src/auth/clerk.service.spec.ts`, `backend/src/jobs/queue.service.spec.ts` | тесты обновлены |
| `frontend/vercel.json` | CSP, XFO, nosniff, Referrer-Policy, HSTS, Permissions-Policy |

## Верификация

* `npm run typecheck` — успешно;
* `npm test -- --runInBand` — 21 suite / 179 тестов, все прошли;
* `npm run test:e2e` — 2 suite / 22 теста, все прошли.

## Что осталось за владельцем

1. Ротировать Clerk / Cloudinary / MongoDB (критично, см. #1).
2. Вычистить `backend/.env` из истории git и force-push; включить GitHub secret scanning.
3. Закоммитить подготовленное удаление `backend/.env`.
4. Задать `QUEUE_SIGNING_SECRET` (или убедиться, что задан `CLERK_SECRET_KEY`) в production-окружении и передеплоить backend.
5. Проверить, что `FRONTEND_URL` точно совпадает с origin прод-фронтенда (из-за `authorizedParties`).
6. При необходимости добавить кастомный Clerk-домен в CSP и внедрить rate limiting (#8).
