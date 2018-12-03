//test test test test

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

Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
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
    const otherUserLikes = await db.all('SELECT user2 FROM likes WHERE user1=?;', id2);

    var otherUserLikesArray = otherUserLikes.map(function(item){
        return item['user2'];
    });
    
    console.log(otherUserLikesArray);

    if(otherUserLikesArray == null){
        res.redirect('/home');
    }
    else if(otherUserLikesArray.includes(id1)){
        const newMatch = await db.run ('INSERT INTO matches(user1,user2) VALUES (?,?);',
            id1,
            id2);
        console.log(`user ${req.user.userID} matched with user ${req.params.userID}`)
    };

    console.log(`user ${req.user.userID} likes user ${req.params.userID}`)
    res.redirect('/home');
    
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

app.get('/profile', requireAuth, async (req, res) => {
    const db = await dbPromise;
    var allMatches = [];

     //retrieve all matches
     const matches = await db.all('SELECT user1,user2 FROM matches WHERE user1=? OR user2=?', req.user.userID, req.user.userID);
    
     //store user1 and user2 from matches into array 
     var matchesUser1 = matches.map(function (item){
         return item['user1'];
     });
 
     var matchesUser2 = matches.map(function (item){
         return item['user2'];
     });
 
     allMatches = matchesUser1.concat(matchesUser2);
     allMatches.remove(req.user.userID);
     console.log("Matches:  " + allMatches);
 
     const allUsers = await db.all('SELECT * FROM users');
 
    res.render('profile', {user: req.user, allUsers, allMatches});
})


app.get('/home', requireAuth, async (req, res) => {
    const db = await dbPromise;
    var allMatches = [];

    //retrieve all matches
    const matches = await db.all('SELECT user1,user2 FROM matches WHERE user1=? OR user2=?', req.user.userID, req.user.userID);
    
    //store user1 and user2 from matches into array 
    var matchesUser1 = matches.map(function (item){
        return item['user1'];
    });

    console.log("user1:  " + matchesUser1);

    var matchesUser2 = matches.map(function (item){
        return item['user2'];
    });

    allMatches = matchesUser1.concat(matchesUser2);
    allMatches.remove(req.user.userID);
    console.log("Matches:  " + allMatches);

    const allUsers = await db.all('SELECT * FROM users');

    //calculate year
    const d = new Date();
    const currentYear = d.getFullYear();

    //get gender
    if (req.user.gender = "male"){
        othergender = "female";
    } else if (req.user.gender = "female"){
        othergender = "male";
    } else {othergender = "Other"};

    //find previous matches and counts
    const allUsersObjects = await db.all('SELECT * FROM users');
    const userLikesObjects = await db.all('SELECT * FROM likes WHERE user1=?', req.user.userID);
    const userDisLikesObjects = await db.all('SELECT * FROM dislikes WHERE user1=?', req.user.userID);

    var allUsersArray = allUsersObjects.map(function(item){
        return item['userID'];
    });

    var userLikesArray = userLikesObjects.map(function (item){
        return item['user2']
    });

    var userDislikesArray = userDisLikesObjects.map(function (item){
        return item['user2'];
    });

    const alreadyLiked = userLikesArray.concat(userDislikesArray);

    allUsersArray = allUsersArray.filter(function(item){
        return !alreadyLiked.includes(item);
    });
    
    //remove current user
    allUsersArray.remove(req.user.userID);

    console.log("allUsersArray: " + allUsersArray);

    //retrieve other user
    otherUser = await db.get('SELECT * FROM users WHERE sign=? AND userID=?', req.user.sign, allUsersArray[0]);
    
    //determine other user age
    userBirthday = otherUser.birthday;
    var dateParts = userBirthday.split("-");
    otherUser.age = currentYear - dateParts[0];

    res.render('Home', { otherUser, allUsers, allMatches, user: req.user });
       
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
    var dateParts = req.body.birthday.split("-");
    var month = dateParts[1];
    var day = dateParts[2];
    var zodiacSign = "";

    month = parseInt(month,10);
    day = parseInt(day,10);

    switch(month){
	case 0: {//January
			 if(day < 20)
		 		zodiacSign = zod_signs[0];
			 else
		 		zodiacSign = zod_signs[1];
		    }break;
	case 1: {//February
			 if(day < 19)
		 		zodiacSign = zod_signs[1];
			 else
		 		zodiacSign = zod_signs[2];
			}break;
	case 2: {//March
			 if(day < 21)
			 	zodiacSign = zod_signs[2];
			 else
			 	zodiacSign = zod_signs[3];
			}break;
	case 3: {//April
			 if(day < 20)
		 		zodiacSign = zod_signs[3];
			 else
		 		zodiacSign = zod_signs[4];
			}break;
	case 4: {//May
			 if(day < 21)
		 		zodiacSign = zod_signs[4];
			 else
		 		zodiacSign = zod_signs[5];
			}break;
	case 5: {//June
			 if(day < 21)
		 		zodiacSign = zod_signs[5];
			 else
		 		zodiacSign = zod_signs[6];
			}break;
	case 6: {//July
			 if(day < 23)
		 		zodiacSign = zod_signs[6];
			 else
		 		zodiacSign = zod_signs[7];
			}break;
 	case 7: {//August
			 if(day < 23)
		 		zodiacSign = zod_signs[7];
			 else
		 		zodiacSign = zod_signs[8];
			}break;
	case 8: {//September
			 if(day < 23)
		 		zodiacSign = zod_signs[8];
			 else
		 		zodiacSign = zod_signs[9];
			}break;
	case 9: {//October
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
        
     console.log(zodiacSign);

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

    res.redirect('/login');
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

