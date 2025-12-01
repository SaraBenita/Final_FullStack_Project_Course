# Solid Chat — הפעלת הפרויקט והסבר

מדריך קצר בעברית שמסביר איך להפעיל את השרת (Docker Compose), למה עטפנו את זה בקונטיינרים, איך לבדוק שהכול עובד, ושימוש עם ה‑client ב‑Vercel.

**מה יש בפרויקט**
- `client/` — React (Vite) front-end, כבר פרוס ב‑Vercel בכתובת `https://chatproject-azure.vercel.app` (ה‑client קורא API דרך `VITE_API_BASE`).
- `server/` — Node.js + Express + Socket.IO + Mongoose (MongoDB). מספק REST ו‑WebSocket ושירותי העלאה (uploads).
- DB: MongoDB (אפשר Atlas או mongo מקומי בתוך `docker compose`).

**פקודות מהירות (PowerShell)**
1. עברו לשרת:
```powershell
cd server
```
2. בנו והריצו את השירותים (מיקום: `server/`):
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

לאחר הרצה תקינה תראו בלוגים הודעות כמו:
- `[MongoDB] connected: ...` — חיבור למסד נתונים (Atlas או מקומי) הצליח
- `[Server] listening on 4000` — השרת מאזין

אם תרצו לעצור/להוריד את השירותים:
```powershell
docker compose down
```

מדוע עטפנו בקונטיינרים?
- בידוד וסביבת הרצה עקבית: כל מי שיכול להריץ Docker יקבל את אותה גרסה של Node, תלותיות ועוד.
- תצורה נוחה: Docker Compose מעלה את השרת ו‑Mongo ביחד, מגדיר רשת פנימית ו‑volumes.
- פריסה פשוטה: קל לפרוס את התמונה שנבנתה על הענן או VM.

הסבר על ה־Flow ותצורת ה‑network
- Compose מגדיר שני שירותים עיקריים: `mongo` ו‑`server`.
- השרת מתחבר ל‑Mongo לפי `MONGO_URI` (בקובץ `server/.env`). כאשר `MONGO_URI=mongodb://mongo:27017/chat_db` — השרת יתחבר ל‑mongo שבתוך Compose דרך שם השירות (`mongo`).
- אם `MONGO_URI` הוא מסוג `mongodb+srv://...` — השרת מתחבר ל‑MongoDB Atlas בענן.

חשוב על `CLIENT_ORIGIN` ו‑CORS
- בכדי שה‑client ב‑Vercel יוכל לקרוא לפונקציות ה‑API, על השרת לאפשר CORS עבור הדומיין של ה‑client.
- בקובץ `server/.env` יש את `CLIENT_ORIGIN=https://chatproject-azure.vercel.app` — ודאו שאין trailing slash.
- אם אתם בודקים מה‑Vercel (או מ‑https), שימו לב להמנע מ‑mixed content: השרת צריך להיות נגיש ב‑https (לבדיקות ניתן להשתמש ב‑ngrok).

חשוב על upload files ו‑volumes
- קבצים שמועלים נשמרים בתיקיית `uploads` בתיקיית `server/` על ה‑host וממופים לקונטיינר ב־`/app/uploads`.
- ודאו שקיימת תיקיית `server/uploads` או הריצו `mkdir server\\uploads` לפני הרצה.

נקודות מפתח בקוד (קבצים חשובים)
- `server/src/index.js` — bootstrap של האפליקציה, הגדרת middleware (helmet, cors, morgan), static route ל־`/uploads`, חיבור ל‑Socket.IO.
- `server/src/routes/auth.js` — `POST /api/auth/register` ו‑`POST /api/auth/login` (הרשמה/כניסה ומקבל/מחזיר token JWT).
- `server/src/routes/messages.js` — CRUD להודעות, משולב `multer` על `/api/messages/upload` להעלאת קבצים.
- `server/src/models/Message.js`, `User.js`, `Conversation.js` — סכמות Mongoose.
- `server/Dockerfile` — הגדרת תמונת ה‑server.
- `server/docker-compose.yml` — compose שמריץ `mongo` ו‑`server` יחד.
- `server/.env` — משתנים פרטיים (MONGO_URI, JWT_SECRET, PORT, CLIENT_ORIGIN). **אסור לדחוף קובץ זה ל‑git**.

מה עשינו בשינויים האחרונים (סיכום של מה שבוצע בפרויקט)
- שינינו את שם בסיס הנתונים ברירת המחדל ל‑`chat_db` והעדכנו `MONGO_URI`.
- החלפנו/יצרנו `JWT_SECRET` חזק בקובץ `.env`.
- הוספנו תמיכה בהעלאת קבצים: endpoint `/api/messages/upload`, שמירת קבצים ל‑`/uploads`, הצגה וקישורים ל‑attachments בצד ה‑client.
- הוספנו `server/Dockerfile` ו‑`server/docker-compose.yml` להרצה בתוך Docker Compose.
- תיקנו בעיות CORS — השרת מנרמל origin ומחזיר את הכותרת הנכונה כאשר ה‑client מבקש (ניקוי trailing slash).
- שינינו את מיפוי ה‑volume כך שה‑host folder `./uploads` ימופה ל‑`/app/uploads` בקונטיינר.

איך להוסיף משתמשים / לבדוק את ה‑API
- דרך ה‑UI (אם `VITE_API_BASE` ב‑Vercel מצביע לשרת נגיש): פתיחת היישום ב‑https://chatproject-azure.vercel.app והשתמשו בטופס ההרשמה.
- דרך curl (מקומי):
```powershell
# Register
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d '{"username":"sara","email":"sara@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"username":"sara","password":"secret123"}'
```
- העלאת קובץ (upload) עם token:
```powershell
$TOKEN = "<PASTE_TOKEN_HERE>"
curl -v -H "Authorization: Bearer $TOKEN" -F "file=@C:\path\to\test.jpg" http://localhost:4000/api/messages/upload
```

בדיקת DB
- אם אתם משתמשים ב‑Atlas: התחברו ל‑MongoDB Atlas UI → Collections → `chat_db` → בדקו `users`, `conversations`, `messages`.
- אם אתם משתמשים ב‑mongo מקומי בתוך compose:
```powershell
docker compose exec mongo mongosh
# בתוך mongosh
use chat_db
db.users.find().pretty()
```

פתרון בעיות נפוצות
- `ECONNREFUSED 127.0.0.1:27017` — משמעות: השרת מנסה להתחבר ל‑127.0.0.1 (הקונטיינר עצמו) במקום לשירות `mongo`. הפתרון: בקובץ `.env` השתמשו ב‑`MONGO_URI=mongodb://mongo:27017/chat_db` כאשר מפעילים דרך Compose.
- שגיאות CORS מהדפפן: בדקו `CLIENT_ORIGIN` ב‑`.env` (אין trailing slash) ודאו שהכותרת `Access-Control-Allow-Origin` תואמת בדיוק את ה‑Origin.
- בעיות upload: ודאו שהתיקייה `server/uploads` קיימת ושהרשאות תקינות.

הערות אבטחה ופרודקשן
- לעולם לא לדחוף `server/.env` עם סיסמאות ל‑git.
- בפרודקשן השתמשו ב‑secrets של הסביבה (לדוגמה: Vercel Environment Variables, Docker secrets, או תצורת CI/CD).
- הציבו reverse proxy (nginx/Traefik) לקבלת TLS וקישוריות WebSocket נכונה.

לסיכום — בדיקות מומלצות עכשיו
1. ודאו תיקיית `server/uploads` קיימת (`mkdir server\\uploads`).
2. מתוך `server/` הריצו:
```powershell
docker compose --env-file .env up -d --build
```
3. בדקו:
```powershell
docker ps
docker compose logs -f server
```
4. אם תרצו שאבדוק איתכם את החיבור מה‑Vercel (E2E) — אפשר להריץ `ngrok http 4000` ולהגדיר `VITE_API_BASE` ב‑Vercel לכתובת ה‑ngrok (https) ולבצע בדיקת UI.

אם תרצי, אני יכול להוסיף קטע קצר ב‑README עם הוראות פריסה ל‑VPS או העלאה ל‑Docker Hub / Server ב‑Cloud. רוצה שאוסיף את זה גם? 
