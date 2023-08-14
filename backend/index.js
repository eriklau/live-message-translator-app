const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ws = require('ws');
const Message = require('./models/Message')
const axios = require('axios');

dotenv.config();
// mongoose.connect(process.env.MONGO_URL, (err) => {
//     if (err) throw err;
// });

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

const jwtSecret = process.env.JWT_SECRET
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

app.get('/test', (req, res) => {
    res.json('test ok');
});

app.get('/profile', (req, res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            res.json(userData);
        });
    } else {
        res.status(401).json('no token');
    }
});

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (passOk) {
            jwt.sign({userId: foundUser._id, username}, jwtSecret, {}, (err, token) => {
                res.cookie('token', token, {sameSite:'none', secure:true}).json({
                    id: foundUser._id,
                });
            });
        }
    }
});

app.post('/logout', (req, res) => {
    res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
});

app.post('/register', async (req, res) => {
    const {username, password, preferredLanguage} = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
        const createdUser = await User.create({
            username: username, 
            password: hashedPassword,
            preferredLanguage: preferredLanguage,
        });
        jwt.sign({userId: createdUser._id, username}, jwtSecret, {}, (err, token) => {
            if (err) throw err;
            res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
                id: createdUser._id,
                username,
            });
        });
    } catch(err) {
        if (err) throw err;
        res.status(500).json('error');
    }
});


const server = app.listen(4000);

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) => {
    const cookies = req.headers.cookie;
    if (cookies) {
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
        if (tokenCookieString) {
            const token = tokenCookieString.split('=')[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }

    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient, text} = messageData;

        const recipientDoc = await User.findById(recipient);
        const recipientPreferredLanguage = recipientDoc.preferredLanguage;

        let translatedText = await translateMessage(recipientPreferredLanguage, text);

        // console.log(translatedText);

        if (recipient && text) {
            const messageDoc = await Message.create({
                sender:connection.userId,
                recipient,
                text,
                translatedText,
            });
            [...wss.clients]
                .filter(c => c.userId === recipient)
                .forEach(c => c.send(JSON.stringify({
                    text, 
                    translatedText,
                    sender:connection.userId,
                    recipient,
                    id:messageDoc._id,
                })));
        }
    });


    // console.log([...wss.clients].map(c => c.username));

    [...wss.clients].forEach(client => {
        client.send(JSON.stringify({
            online: [...wss.clients].map(c => ({userId: c.userId, username: c.username}))
        }));
    })
});


const { Configuration, OpenAIApi } = require("openai");

const config = new Configuration({
	apiKey: process.env.API_KEY,
});

const openai = new OpenAIApi(config);

const translateMessage = async (language, message) => {
	const prompt = `
        Translate the following message to ${language} as precisely as possible. Account for slang, grammar, and spelling (if a language is not specified just repeat the message in its native form):
        ${message}
    `;

	const response = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: prompt,
		max_tokens: 2048,
		temperature: 1,
	});

    // translation response
	const parsableJSONresponse = response.data.choices[0].text;
    return parsableJSONresponse;
};




// translateMessage("Hi! My day has been pretty good so far, thanks for asking. I've been catching up on some reading and exploring new recipes to try out.", 'french');