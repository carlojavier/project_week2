const express = require("express");
const app = express();
const PORT = 8080;
const morgan = require('morgan');
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
// const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

// set view engine to ejs
app.set("view engine", "ejs");
// set up morgan
app.use(morgan('dev'));
// set up middleware
app.use(bodyParser.urlencoded({ extended: true }));
// set up cookie-session
app.use(cookieSession({
    name: "session",
    keys: ['key1', 'key2']
}));

function generateRandomString() {
    const length = 5;
    const chars = 'qwertyuioplkjhgfdsazxcvbnm0987654321ZXCVBNMLKJHGFDSAQWERTYUIOP';
    var result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

// set urlDatabase
const urlDatabase = {
    "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID" },
    "9sm5xK": { longURL: "http://www.google.com", userID: "alsoUserRandomID" }
};
// set user database
const users = {
    "userRandomID": {
        id: "userRandomID",
        email: "user@example.com",
        password: "something-important-prob"
    },

    "alsoUserRandomID": {
        id: "alsoUserRandomID",
        email: "alsoUser@example.com",
        password: "also-something-important-idk"
    }
}
// fuction that goes through email sign up sheet
function doesEmailExistInDatabase(email) {
    let exists = false
    for (var key in users) {
        if (email === users[key].email) {
            exists = true
        }
    }
    return exists
}

function urlsForUser(userID) {
    // function will return urls for one user
    let usersURL = {};
    for (let key in urlDatabase) {
        if (urlDatabase[key].userID === userID) {
            usersURL[key] = urlDatabase[key];
        }

    }
    console.log(userID);
    console.log(urlDatabase);
    return usersURL;
}

// function to go through all handlers and replace username info with userID
function createTemplateVars(userID) {
    if (users[userID]) {
        let currentUser = users[userID]
        const templateVars = {
            urls: urlsForUser(userID),
            currentUser: currentUser
        };
        return templateVars
    } else {
        const templateVars = {
            urls: urlsForUser(userID),
            currentUser: {}
        };
        return templateVars
    }
}
// function to enforce conditional on existing emails and passwords
function checkUser(email, password) {
    for (var key in users) {
        console.log('key:', key);
        console.log('users[key]:', users[key]);
        if (users[key].email === email && bcrypt.compareSync(password, users[key].password)) {
            console.log('user found!');
            return users[key];
        }
    }
    return false;
}

app.get("/register", (request, response) => {
    const templateVars = createTemplateVars(request.session.UserID);
    response.render("urls_register", templateVars);
});

app.get("/urls", (request, response) => {
    const templateVars = createTemplateVars(request.session.UserID);
    console.log(templateVars)
    response.render("urls_index", templateVars);
});

app.get("/u/:shortURL", (request, response) => {
    const longURL = request.params.shortURL
    response.redirect(urlDatabase[longURL]);
});

app.get("/login", (request, response) => {
    response.render("urls_login");
});

app.get("/logout", (request, response) => {
    response.render("urls_new");
})

app.get("/urls/new", (request, response) => {
    if (!request.session.UserID) {
        response.status(403).send();
        response.redirect("/urls")
        return
    }
    const templateVars = createTemplateVars(request.session.UserID);
    response.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (request, response) => {
    const shortURL = request.params.shortURL
    let templateVars = createTemplateVars(request.session.UserID);
    templateVars["shortURL"] = shortURL;
    templateVars["longURL"] = urlDatabase[shortURL];
    response.render("urls_show", templateVars);
});

app.post("/register", (request, response) => {
    const hashedPassword = bcrypt.hashSync(request.body.password, 10);
    const newUserID = generateRandomString();
    const newUser = {
        id: newUserID,
        email: request.body.email,
        password: hashedPassword
    };
    console.log(newUser);
    if (newUser.email === "" || newUser.password === "") {
        response.status(400).send()
    } else if (doesEmailExistInDatabase(newUser.email)) {
        response.status(400).send()
    } else {
        console.log('new user created:', newUser);
        users[newUserID] = newUser;
        request.session.UserID = newUserID;
        response.redirect("/urls");
    }
});

app.post("/urls", (request, response) => {
    const shortURL = generateRandomString();
    const newURL = request.body.longURL;
    if (newURL) {
        urlDatabase[shortURL] = { longURL: newURL, userID: request.session.UserID };
        console.log("added")
    }
    response.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/", (request, response) => {
    if (!request.session.UserID) {
        response.redirect("/urls");
        return
    }
    console.log(request.params)
    const newURL = request.body.longURL;
    const id = request.params.shortURL;
    if (newURL) {
        urlDatabase[id] = { longURL: newURL, userID: request.session.UserID };
    }
    console.log(urlDatabase)
    response.redirect(`/urls/${id}`);
    console.log(newURL)
});

app.post("/urls/:shortURL/delete", (request, response) => {
    delete urlDatabase[request.params.shortURL];
    response.redirect('/urls');
});


app.post("/login", (request, response) => {
    const userResult = checkUser(request.body.email, request.body.password)
    if (userResult) {
        request.session.UserID = userResult.id;
        response.redirect('/urls');
    } else {
        response.status(403).send('Wrong login credentials');
    }
});

app.post("/logout", (request, response) => {
    const templateVars = createTemplateVars(request.session.UserID);
    if (!templateVars.currentUser) {
        response.status(403).send()
    } else if (templateVars) {
        request.session.UserID = null;
    }
    console.log(templateVars)
    response.redirect('/urls')
})

app.listen(PORT, () => {
    console.log(`Sample app listening on port ${PORT}!`);
});