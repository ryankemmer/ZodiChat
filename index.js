//test test test

const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const sqlite = require('sqlite');
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const cookieParser = require('cookie-parser')
const multer = require("multer");


const storage = multer.diskStorage({
    destination: 'profilepics/',
    filename: function (req, file, cb) {
        console.log('file uploaded', file);
        cb(null, `${uuidv4()}.jpg`);
    }
})

const upload = multer({ storage });
const bodyParse = bodyParser.urlencoded({extended: true});

app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.disable('view cache');
app.use(cookieParser());
app.use('/public', express.static('public'));
const dbPromise = sqlite.open('./data.db')
const saltRounds = 10;

const authorize = async (req, res, next) => {
    const db = await dbPromise;
    const sessionToken = req.cookies.sessionToken;
    if (!sessionToken) {
        next();
        return;
    };
    const user = await db.get('SELECT users.* FROM session LEFT JOIN users ON session.user_account_id = users.userID WHERE session_token=?', sessionToken);
    if (!user) {
        next();
        return;
    };
    delete user.passwordHash;
    console.log('authorized request');
    req.user = user;
    next();
    return;
};

app.use(authorize);

const requireAuth = (req, res, next) => {
    if (!req.user) {
        res.status(401).redirect('/login');
        return;
    }
    next();
};

app.get('/', async (req, res) => {
    res.render('login');
});


app.get('/registerlike/:userID', requireAuth, async (req, res) => {
    const db = await dbPromise;
    id1 = req.user.userID;
    id2 = req.params.userID;
    const match = await db.run ('INSERT INTO likes(user1,user2) VALUES (?,?);',
        id1,
        id2);
    console.log(`user ${req.user.userID} likes user ${req.params.userID}`)
    res.redirect('/home')
});

app.get('/registerdislike/:userID', requireAuth, async (req, res) => {
    const db = await dbPromise;
    id1 = req.user.userID;
    id2 = req.params.userID;
        const unmatch = await db.run ('INSERT INTO dislikes(user1,user2) VALUES (?,?);',
        id1,
        id2);
    console.log(`user ${req.user.userID} dislikes user ${req.params.userID}`)
    res.redirect('/home')
});



app.get('/home', requireAuth, async (req, res) => {
    const db = await dbPromise;

    //calculate year
    const d = new Date();
    const currentYear = d.getFullYear();

    //get gender
    if (req.user.gender == "Male"){
        othergender = "Female";
    } else {othergender = "Male"};

    //find previous matches and counts
    const allUsersObject = db.all('SELECT * FROM users');
    const userLikesObject = await db.all('SELECT * FROM likes WHERE user1=?', req.user.userID);
    const userDisLikesObject = await db.all('SELECT * FROM dislikes WHERE user1=?', req.user.userID);
    
    const userLikesArray = userLikesObject.map(function (obj) {
        return obj.user2;
    });
    const userDislikesArray = userDisLikesObject.map(function (obj){
        return obj.user2;
    });

    const allUsersArray = allUsersObject.map(function (obj) {
        return obj.userID;
    })

    const alreadyLiked = userLikesArray.concat(userDislikesArray);

    allUsersArray = allUsersArray.filter(function(item){
        return !alreadyLiked.includes(item);
    })
    
    console.log(othergender);
    console.log(req.user.sign);
    console.log(allUsersArray);

    //retrieve other user
    const otherUser = await db.get('SELECT * FROM users WHERE sign=? AND gender=? AND userID=?', req.user.sign, othergender, allUsersArray[0]);

    //determine age
    userBirthday = otherUser.birthday;
    
    //var dateParts = userBirthday.split("-");
    otherUser.age = currentYear - dateParts[0];
    
    res.render('Home', { otherUser, user: req.user });

});

app.get('/profilepic/:filename', requireAuth, async (req, res) => {
    console.log('getting profilepic', req.params.filename);
    const options = {
        root: __dirname + '/profilepics/'
    }
    res.sendFile(req.params.filename, options);
});

app.get('/logout', async (req, res) => {
    const db = await dbPromise;
    res.cookie('sessionToken', '', { maxAge: 0 });
    await db.run('DELETE FROM session WHERE session_token=?', req.cookies.sessionToken);
    res.redirect('/login');
});

app.get('/signup', async (req, res) => {
    res.render('Signup');
});

app.post('/signup', upload.single('avatar'), bodyParse, async (req, res) => {
    const db = await dbPromise;
    debugger;
    const user = await db.get('SELECT * FROM users WHERE email=?;', req.body.email);
    if (user) {
        res.status(400).render('Signup', { signupError: 'ERROR: account already exists' });
        return;
    }
    const passwordHash = await bcrypt.hash(req.body.password, saltRounds);


    //get horoscope
    var zod_signs = ["Capricorn" , "Aquarius", "Pisces", "Aries",
    "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius"];
    var dateParts = userBirthday.split("-");
    var day = dateParts[2];
    var month = dateParts[1];

    switch(month){
        case 00: {//January
                 if(day < 20)
                     zodiacSign = zod_signs[0];
                 else
                     zodiacSign = zod_signs[1];
                }break;
        case 01: {//February
                 if(day < 19)
                     zodiacSign = zod_signs[1];
                 else
                     zodiacSign = zod_signs[2];
                }break;
        case 02: {//March
                 if(day < 21)
                     zodiacSign = zod_signs[2];
                 else
                     zodiacSign = zod_signs[3];
                }break;
        case 03: {//April
                 if(day < 20)
                     zodiacSign = zod_signs[3];
                 else
                     zodiacSign = zod_signs[4];
                }break;
        case 04: {//May
                 if(day < 21)
                     zodiacSign = zod_signs[4];
                 else
                     zodiacSign = zod_signs[5];
                }break;
        case 05: {//June
                 if(day < 21)
                     zodiacSign = zod_signs[5];
                 else
                     zodiacSign = zod_signs[6];
                }break;
        case 06: {//July
                 if(day < 23)
                     zodiacSign = zod_signs[6];
                 else
                     zodiacSign = zod_signs[7];
                }break;
         case 07: {//August
                 if(day < 23)
                     zodiacSign = zod_signs[7];
                 else
                     zodiacSign = zod_signs[8];
                }break;
        case 08: {//September
                 if(day < 23)
                     zodiacSign = zod_signs[8];
                 else
                     zodiacSign = zod_signs[9];
                }break;
        case 09: {//October
                 if(day < 23)
                     zodiacSign = zod_signs[9];
                 else
                     zodiacSign = zod_signs[10];
                }break;
        case 10: {//November
                 if(day < 22)
                     zodiacSign = zod_signs[10];
                 else
                     zodiacSign = zod_signs[11];
                }break;
        case 11: {//December
                 if(day < 22)
                     zodiacSign = zod_signs[11];
                 else
                     zodiacSign = zod_signs[0];
                }break;
     }
        

    const result = await db.run(
        'INSERT INTO users(firstName,lastName,passwordHash,email,gender,birthday,created,profilepic,sign) VALUES (?,?,?,?,?,?,?,?,?);',
        req.body.firstname,
        req.body.lastname,
        passwordHash,
        req.body.email,
        req.body.gender,
        req.body.birthday,
        Date.now(),
        req.file.filename,
        zodiacSign

    );

    //if (req.body.rememberMe.checked == true ) {
        const newUserID = result.stmt.lastID;
        const newUser = await db.get('SELECT * FROM users WHERE userID=?', newUserID);
        const sessionToken = uuidv4();
        await db.run('INSERT INTO session (user_account_id, session_token) VALUES (?, ?);', newUser.userID, sessionToken);
        res.cookie('sessionToken', sessionToken);
  // }
   // else {
    //    return;
    //};

    res.redirect('/home');
});


app.get('/login', async (req, res) => {
    res.render('login');
});

app.post('/login', bodyParse, async (req, res) => {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM users WHERE email=?', req.body.email);
    if (!user) {
        res.status(401).render('login', { loginError: 'email or password is incorrect' });
        return;
    }
    const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);
    if (passwordMatches) {
        const sessionToken = uuidv4();
        await db.run('INSERT INTO session (user_account_id, session_token) VALUES (?, ?);', user.userID, sessionToken);
        res.cookie('sessionToken', sessionToken);
        res.redirect('/home');
    } else
        res.status(401).render('login', { loginError: 'email or password is incorrect' });

});


app.use((req, res) => {
    res.status(404).send('file not found');
});

app.listen(3000);
console.log('listening on port 3000');

