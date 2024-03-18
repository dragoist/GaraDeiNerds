const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));
const usedQuestions = new Set();

const players = [];
let currentPlayer = players;
let currentPlayerIndex = -1;

server.listen(PORT, () =>{
    console.log(`Server avviato sulla porta ${PORT}`);
});

const io = require('socket.io')(server);

io.on('connection', (socket) => {
    console.log('Nuova connessione');

    socket.on('playerName', (name) =>{
        players.push({name, score:0, socket});
        if (players.length === 2) {
            startGame();
        }
    });

    socket.on('answer', (answer) => {
        console.log(`Answer: ${answer}`);
        if (answer === "1") {
            currentPlayer.score++;
        }
        
        const otherPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
        const otherPlayer = players[otherPlayerIndex];
        currentPlayerIndex = otherPlayerIndex;
    
        currentPlayer.socket.emit('score', [players[0].name,players[0].score,players[1].name,players[1].score]);
        otherPlayer.socket.emit('score', [players[0].name,players[0].score,players[1].name,players[1].score]);
        sendQuestion();
    });

    socket.on('timeUp', () => {
        currentPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
        sendQuestion();
    });
});

function startGame() {
    currentPlayerIndex = 0;
    sendQuestion();
}

function sendQuestion(){
    if (usedQuestions.size === questions.length){
        endGame();
    }
    else{
        let questionIndex;
        do {
            questionIndex = Math.round(Math.random() * questions.length);
        } while (usedQuestions.has(questionIndex));

        const question = questions[questionIndex];
        currentPlayer = players[currentPlayerIndex];
        currentPlayer.currentQuestion = question;
        currentPlayer.socket.emit('question', question);
        players[currentPlayerIndex === 0 ? 1 : 0].socket.emit('opponentQuestion', question);
        usedQuestions.add(questionIndex);
    }
}

function endGame(){
    currentPlayer.socket.emit('endGame');
    players[currentPlayerIndex === 0 ? 1 : 0].socket.emit('endGame');
    
}