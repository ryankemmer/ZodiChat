const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sqlite = require('sqlite');
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const cookieParser = require('cookie-parser')

app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.disable('view cache');
const dbPromise = sqlite.open('./data.db');
const saltRounds = 10;

const authorize = async (req, res, next) => {
    // const { sessionToken } = req.cookies;
    const db = await dbPromise;
    const sessionToken = req.cookies.sessionToken;
    if(!sessionToken) {
        next();
        return;
    };
    const user = await db.get('SELECT users.email, users.id as id FROM sessions LEFT JOIN users ON sessions.userid = users.id WHERE sessionToken=?', sessionToken);
    if(!user) {
        next();
        return;
    };
    console.log('logged in', user.email);
    req.user = user;
    next();
    return;
};

const requireAuth = (req, res, next) => {
    if (!req.user) {
        res.status(401).send('please log in');
        return;
    }
    next();
};

app.use(authorize);

app.get('/', async (req,res) => {
    res.render('login');
});


app.get('/Signup', async (req,res) => {
    res.render('Signup');
    
});

app.get('/home', async (req,res) => {
    res.render('Home');
});



app.get('/message', async (req, res) => {
    const db = await dbPromise;
    const messages = await db.all('SELECT * FROM messages;');
    const user = req.user;
    res.render('index',{ messages, user });
});

app.post('/message', async (req, res) => {
    const db = await dbPromise;
    await db.run('INSERT INTO messages (author, message) VALUES (?, ?)', req.user.email.split('@')[0], req.body.message);
    res.redirect('/');
});


//side panel 

app.get('/chats', async (req, res) => {
    const db = await dbPromise;
    const matches = await db.all('SELECT user2 FROM matches');
    const matchFirstName = await db.all('SELECT firstName FROM users WHERE userID=?', matches);
    const matchLastName = await db.all('SELECT lastName FROM users WHERE userID=?', matches);
    res.render('chats',{matches, matchFirstName, matchLastName});
    
});
       
        

app.post('/signup', async (req, res) => {
	const db = await dbPromise;
    console.log("work2");
	const user = await db.get('SELECT * FROM users WHERE email=?;', req.body.email);
	if (user) {
	   res.status(400).render('Signup', { signupError: 'ERROR: account already exists' });
		return;
	}
	const passwordHash = await bcrypt.hash(req.body.password, saltRounds);
	await db.run(
        'INSERT INTO users(firstname,lastname,passwordHash,email,gender,birthday) VALUES (?,?,?,?,?,?);', 
		req.body.firstname, 
		req.body.lastname, 
		passwordHash, 
		req.body.email, 
		req.body.gender, 
		req.body.birthday
	);
    
    res.render('login');
    
});


app.post('/login', async (req, res) => {
	const db = await dbPromise;
	const user = await db.get('SELECT * FROM users WHERE email=?', req.body.email);
	if (!user) {
		res.status(401).render('login', { loginError: 'email or password is incorrect' });
		return;
    }
	const passwordMatches = await bcrypt.compare(req.body.password, user.passwordHash);
	if (passwordMatches) {
        const sessionToken = uuidv4();
        await db.run('INSERT INTO sessions (userid, sessionToken) VALUES (?, ?);', user.id, sessionToken);
        res.cookie('sessionToken', sessionToken);
		res.render('Home');
	} else 
        res.status(401).render('login', { loginError: 'email or password is incorrect' });
    
    
});


app.use((req, res) => {
    res.status(404).send('file not found');
});

app.listen(3000);
console.log('listening on port 3000');

