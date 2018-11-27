-- Up
CREATE TABLE users (
    userID INTEGER PRIMARY KEY,
    email STRING,
    passwordHash STRING,
    firstName STRING,
    lastName STRING,
    birthday INTEGER,
    gender CHAR,
    created INTEGER,
    profilepic STRING
);
CREATE TABLE session (
    id INTEGER PRIMARY KEY,
    user_account_id INTEGER,
    session_token STRING,
    FOREIGN KEY(user_account_id) REFERENCES users(userID)
);
CREATE TABLE testtable (
    asdf INTEGER PRIMARY KEY
);

-- Down
DROP TABLE users;
DROP TABLE session;
DROP TABLE testtable;