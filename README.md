# Chatico Chat — מדריך מקוצר והסבר

## סקירה כללית (Overview)

מטרה: יישום צ'אט מלא (SPA + backend) עם הודעות, קבוצות/שיחות, העלאת קבצים ותמיכה ב WebSockets (Socket.IO).

מה הוא עושה: משתמשים יכולים להירשם/להתחבר, ליצור/להצטרף לשיחות, לשלוח טקסט/קבצים בזמן אמת והודעות נשמרות ב MongoDB.

## Technology Stack

- Frontend: React (Vite) — UI מהיר, מודרני.
- Backend: Node.js + Express — REST API, middleware, serving סטטי.
- Realtime: Socket.IO — העברת הודעות בזמן אמת בין לקוחות.
- DB: MongoDB (Mongoose) — מודל נתונים עבור Users, Conversations, Messages. תמיכה ב Atlas או Mongo מקומי דרך Docker Compose.
- Uploads: multer — לטיפול בקבצי קלט (תמונות/קבצים).
- Deployment / Local Dev: Docker + Docker Compose (מכולות ל server ו mongo).
- אבטחה: JWT עבור אימות, helmet ל HTTP hardening, CORS מוסדר.

## מבנה הפרויקט (Tree-level)

- `client/` — אפליקציית React (Vite)
    - `src/` — קומפוננטות UI, שירותי socket, `api.js` ל HTTP
- `server/` — backend Node/Express
    - `src/` — קוד המקור (routes, models, socket, middleware)
    - `Dockerfile` — בניית תמונת ה server
    - `docker-compose.yml` — הרצת `server` + `mongo` (אופציונלי)
    - `.env` — משתנים (MONGO_URI, JWT_SECRET, CLIENT_ORIGIN, PORT)
- `README.md` — מדריך והסברים

## Server — קבצים חשובים ותפקידם

- `server/src/index.js` — נקודת הכניסה: הגדרת middleware (helmet, cors, morgan), חיבור ל Mongo, static serving ל־`/uploads`, יצירת HTTP/Socket.IO server.
- `server/src/config.js` — טעינת משתני סביבה וערכי ברירת מחדל.
- `server/src/routes/auth.js` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` — יצירת משתמשים, אימות והחזרת JWT.
- `server/src/routes/messages.js` — ניהול הודעות (שליפה, יצירה), ו־`/api/messages/upload` עבור multer → שמירת קבצים ויצירת URL.
- `server/src/models/User.js` — סכמת משתמש (username, email, passwordHash, displayName).
- `server/src/models/Conversation.js` — סכמת שיחה/קבוצה (participants, lastMessageAt).
- `server/src/models/Message.js` — סכמת הודעה (sender, body, attachment, createdAt, delivered/read).
- `server/src/socket.js` — לוגיקת Socket.IO: אימות socket, broadcasters, event handlers (`message:send`, `user:typing`, וכו').
- `server/Dockerfile` — בונה תמונה המיועדת לפריסה ב Compose/Production.
- `server/docker-compose.yml` — תצורת Compose; מגדיר `mongo` ושירות `server`, volumes ל uploads ולנתוני mongo.

## Client — קבצים חשובים ותפקידם

- `client/src/main.jsx` — mount של היישום, התחברות ל store/socket.
- `client/src/api.js` — axios wrapper, כולל `uploadFile(file)` לפנייה ל־`/api/messages/upload`.
- `client/src/store.js` — ניהול state גלובלי, חיבור ל Socket.IO, פעולות לשליחת הודעות + optimistic updates.
- `client/src/components/MessageInput.jsx` — UI לשליחת הודעה + קבצים (file input + upload flow).
- `client/src/components/MessageList.jsx` — רינדור הודעות, הצגת attachments, הורדה/תצוגה.
- `client/index.html`, `package.json`, `vite.config.js` — קונפיגורציית בנייה והרצה.

## איך ה Flow עובד (פשוט)

1. ה client שולח בקשת הרשמה/התחברות ל־`/api/auth` → השרת יוצר/מאמת משתמש ומחזיר JWT.
2. ה client פותח חיבור Socket.IO עם token (אימות ב socket middleware).
3. שליחת הודעה: ה client שולח או דרך REST (`POST /api/messages`) או דרך Socket.IO (`message:send`). השרת שומר את ההודעה ב Mongo ושולח `emit` למשתמשים אחרים בחדר.
4. העלאת קובץ: ה client מבצע `POST /api/messages/upload` (multipart/form-data) → multer שומר את הקובץ ב־`/uploads` → השרת מחזיר URL לצפייה/הורדה; ה attachment נשמר בהודעה.
5. קבצים סטטיים נגישים דרך `GET /uploads/:filename` (השרת מוסיף כותרות CORS מתאימות).

## סביבה והרצה (פקודות מהירות)

1. הכנסו לתיקיית השרת:
```powershell
cd server
```
2. בנו והריצו עם Docker Compose:
```powershell
docker compose --env-file .env up -d --build
```
3. בדקו קונטיינרים שרצים:
```powershell
docker ps
# או
docker compose ps
```
4. צפו בלוגים של השרת בזמן אמת:
```powershell
docker compose logs -f server
```
5. להורדה/עצירה:
```powershell
docker compose down
```

לאחר הרצה תקינה תראו בלוגים הודעות כמו:
- `[MongoDB] connected: ...` — חיבור למסד נתונים הצליח.
- `[Server] listening on 4000` — השרת מאזין.

## מדוע Docker / Compose? יתרונות

- סביבה עקבית בין מפתחים ופרודקשן.
- הרצה פשוטה של תלותיות (Mongo) בלי התקנה ידנית על המחשב.
- יכולת לבודד שירותים ולפרוס תמונה מוכנה לענן או VPS.

## בדיקת DB

- אם משתמשים ב Atlas: התחברו ל MongoDB Atlas UI → Collections → `chat_db` → בדקו `users`, `conversations`, `messages`.
- אם משתמשים במונגו מקומי בתוך compose:
```powershell
docker compose exec mongo mongosh
# בתוך mongosh
use chat_db
db.users.find().pretty()

**מה יש בפרויקט**
- `client/` — React (Vite) front-end, כבר פרוס ב Vercel בכתובת `https://chatproject-azure.vercel.app` (ה client קורא API דרך `VITE_API_BASE`).
- `server/` — Node.js + Express + Socket.IO + Mongoose (MongoDB). מספק REST ו WebSocket ושירותי העלאה (uploads).
- DB: MongoDB (אפשר Atlas או mongo מקומי בתוך `docker compose`).
