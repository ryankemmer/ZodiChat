const express = require('express');
const app = express();
//const bodyParser = require('body-parser');
const sqlite = require('sqlite');
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const cookieParser = require('cookie-parser')
const multer = require("multer");
//const cloudinary = require("cloudinary");
//const cloudinaryStorage = require("multer-storage-cloudinary");


//cloudinary.config({
//    cloud_name: process.env.CLOUD_NAME,
//    api_key: process.env.API_KEY,
//    api_secret: process.env.API_SECRET
//});

//const storage = cloudinaryStorage({
//    cloudinary: cloudinary,
//    folder: 'public/profilepics'
//    fileName: 
//    allowedFormats: ["jpg", "png"],
//    transformation: [{ width: 500, height: 500, crop: "limit" }]
//});

//const parser = multer({ storage: storage });

const storage = multer.diskStorage({
    destination: 'profilepics/',
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, `${uuidv4()}.jpg`);
    }
})

const upload = multer({ storage });
console.log(upload);

//app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.disable('view cache');
app.use(cookieParser());
app.use('/public', express.static('public'));
const dbPromise = sqlite.open('./data.db').then(db => db.migrate({ force: 'last' }));
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


app.get('/registerlike/:userID', async (req, res) => {
    //req.params.id
    //do some databse stuff
    console.log(`user ${req.user.userID} likes user ${req.params.userID}`)
    res.redirect('/home')
})


app.get('/home', requireAuth, async (req, res) => {
    console.log('on home page', req.user);
    //        var date1 = new Date("7/13/2010");
    //var date2 = new Date("12/15/2010");
    //var timeDiff = Math.abs(date2.getTime() - date1.getTime());
    //var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 

    const otherUser = {
        firstName: 'Lily', //from db
        userID: 10, //from db
        age: 20 //calculated above
    };
    res.render('Home', { otherUser, user: req.user });
});

app.get('/profilepic/:userID', requireAuth, async (req, res) => {
    console.log('rendering profile pic for ' + req.params.userID);
    const options = {
        root: __dirname + '/profilepics/'
    }
    res.sendFile(`${req.params.userID}.jpg`, options);
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

//app.post('/api/images', parser.single("image"), (req, res) => {
//  console.log(req.file) // to see what is returned to you
//  const image = {};
//  image.url = req.file.url;
//  image.id = req.file.public_id;
//  Image.create(image) // save image information in database
//    .then(newImage => res.json(newImage))
//    .catch(err => console.log(err));
//});

app.post('/signup',
    upload.single('avatar'),
    async (req, res, next) => {
        const db = await dbPromise;
        console.log(req.file);
        const user = await db.get('SELECT * FROM users WHERE email=?;', req.body.email);
        if (user) {
            res.status(400).render('Signup', { signupError: 'ERROR: account already exists' });
            return;
        }
        const passwordHash = await bcrypt.hash(req.body.password, saltRounds);
        console.log(req.body.birthday);
        const result = await db.run(
            'INSERT INTO users(firstname,lastname,passwordHash,email,gender,birthday,created,profilepic) VALUES (?,?,?,?,?,?,?,?);',
            req.body.firstname,
            req.body.lastname,
            passwordHash,
            req.body.email,
            req.body.gender,
            req.body.birthday,
            date.now(),
            req.file.filename
        );
        const newUserID = result.stmt.lastID;
        const newUser = await db.get('SELECT * FROM users WHERE userID=?', newUserID);
        const sessionToken = uuidv4();
        debugger;
        await db.run('INSERT INTO session (user_account_id, session_token) VALUES (?, ?);', newUser.userID, sessionToken);
        res.cookie('sessionToken', sessionToken);
        res.redirect('/home');
    });

app.get('/login', async (req, res) => {
    res.render('login');
})
app.post('/login', upload.none(), async (req, res) => {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM users WHERE email=?', req.body.email);
    console.log(user);
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

