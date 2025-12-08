Chatico Chat — מדריך מקוצר והסבר
סקירה כללית (Overview)
מטרה: יישום צ'אט מלא (SPA + backend) עם הודעות, קבוצות/שיחות, העלאת קבצים ותמיכה ב WebSockets (Socket.IO).

מה הוא עושה: משתמשים יכולים להירשם/להתחבר, ליצור/להצטרף לשיחות, לשלוח טקסט/קבצים בזמן אמת והודעות נשמרות ב MongoDB.

Technology Stack
Frontend: React (Vite) — UI מהיר, מודרני.
Backend: Node.js + Express — REST API, middleware, serving סטטי.
Realtime: Socket.IO — העברת הודעות בזמן אמת בין לקוחות.
DB: MongoDB (Mongoose) — מודל נתונים עבור Users, Conversations, Messages. תמיכה ב Atlas או Mongo מקומי דרך Docker Compose.
Uploads: multer — לטיפול בקבצי קלט (תמונות/קבצים).
Deployment / Local Dev: Docker + Docker Compose (מכולות ל server ו mongo).
אבטחה: JWT עבור אימות, helmet ל HTTP hardening, CORS מוסדר.
מבנה הפרויקט (Tree-level)
client/ — אפליקציית React (Vite)
src/ — קומפוננטות UI, שירותי socket, api.js ל HTTP
server/ — backend Node/Express
src/ — קוד המקור (routes, models, socket, middleware)
Dockerfile — בניית תמונת ה server
docker-compose.yml — הרצת server + mongo (אופציונלי)
.env — משתנים (MONGO_URI, JWT_SECRET, CLIENT_ORIGIN, PORT)
README.md — מדריך והסברים
Server — קבצים חשובים ותפקידם
server/src/index.js — נקודת הכניסה: הגדרת middleware (helmet, cors, morgan), חיבור ל Mongo, static serving ל־/uploads, יצירת HTTP/Socket.IO server.
server/src/config.js — טעינת משתני סביבה וערכי ברירת מחדל.
server/src/routes/auth.js — POST /api/auth/register, POST /api/auth/login, GET /api/auth/me — יצירת משתמשים, אימות והחזרת JWT.
server/src/routes/messages.js — ניהול הודעות (שליפה, יצירה), ו־/api/messages/upload עבור multer → שמירת קבצים ויצירת URL.
server/src/models/User.js — סכמת משתמש (username, email, passwordHash, displayName).
server/src/models/Conversation.js — סכמת שיחה/קבוצה (participants, lastMessageAt).
server/src/models/Message.js — סכמת הודעה (sender, body, attachment, createdAt, delivered/read).
server/src/socket.js — לוגיקת Socket.IO: אימות socket, broadcasters, event handlers (message:send, user:typing, וכו').
server/Dockerfile — בונה תמונה המיועדת לפריסה ב Compose/Production.
server/docker-compose.yml — תצורת Compose; מגדיר mongo ושירות server, volumes ל uploads ולנתוני mongo.
Client — קבצים חשובים ותפקידם
client/src/main.jsx — mount של היישום, התחברות ל store/socket.
client/src/api.js — axios wrapper, כולל uploadFile(file) לפנייה ל־/api/messages/upload.
client/src/store.js — ניהול state גלובלי, חיבור ל Socket.IO, פעולות לשליחת הודעות + optimistic updates.
client/src/components/MessageInput.jsx — UI לשליחת הודעה + קבצים (file input + upload flow).
client/src/components/MessageList.jsx — רינדור הודעות, הצגת attachments, הורדה/תצוגה.
client/index.html, package.json, vite.config.js — קונפיגורציית בנייה והרצה.
איך ה Flow עובד (פשוט)
ה client שולח בקשת הרשמה/התחברות ל־/api/auth → השרת יוצר/מאמת משתמש ומחזיר JWT.
ה client פותח חיבור Socket.IO עם token (אימות ב socket middleware).
שליחת הודעה: ה client שולח או דרך REST (POST /api/messages) או דרך Socket.IO (message:send). השרת שומר את ההודעה ב Mongo ושולח emit למשתמשים אחרים בחדר.
העלאת קובץ: ה client מבצע POST /api/messages/upload (multipart/form-data) → multer שומר את הקובץ ב־/uploads → השרת מחזיר URL לצפייה/הורדה; ה attachment נשמר בהודעה.
קבצים סטטיים נגישים דרך GET /uploads/:filename (השרת מוסיף כותרות CORS מתאימות).
סביבה והרצה (פקודות מהירות)
הכנסו לתיקיית השרת:
cd server
בנו והריצו עם Docker Compose:
docker compose --env-file .env up -d --build
בדקו קונטיינרים שרצים:
docker ps
# או
docker compose ps
צפו בלוגים של השרת בזמן אמת:
docker compose logs -f server
להורדה/עצירה:
docker compose down
לאחר הרצה תקינה תראו בלוגים הודעות כמו:

[MongoDB] connected: ... — חיבור למסד נתונים הצליח.
[Server] listening on 4000 — השרת מאזין.
להיכנס לדפדפן רגיל ובנוסף לדפדפן Incognito ולהוסיף יוזרים ולהתחיל לדבר בינהם:
https://chatproject-azure.vercel.app/
מדוע Docker / Compose? יתרונות
סביבה עקבית בין מפתחים ופרודקשן.
הרצה פשוטה של תלותיות (Mongo) בלי התקנה ידנית על המחשב.
יכולת לבודד שירותים ולפרוס תמונה מוכנה לענן או VPS.