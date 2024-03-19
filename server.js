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
let currentPlayer;
let otherPlayer;
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
        if (answer === "1") {
            currentPlayer.score++;
        }
        
        currentPlayer = otherPlayer;
        otherPlayer = players[currentPlayerIndex];
        currentPlayerIndex = currentPlayerIndex === 0 ? 1 : 0;
    
        currentPlayer.socket.emit('score', [players[0].name,players[0].score,players[1].name,players[1].score]);
        otherPlayer.socket.emit('score', [players[0].name,players[0].score,players[1].name,players[1].score]);
        sendQuestion();
    });

    socket.on('newGame', () => {
        resetGame();
    });
});

function startGame() {
    currentPlayerIndex = 0;
    currentPlayer = players[currentPlayerIndex];
    otherPlayer = players[1];
    sendQuestion();
}

function sendQuestion(){
    if (usedQuestions.size === questions.length){
        endGame();
    }
    else{
        let questionIndex;
        do {
            questionIndex = Math.floor(Math.random() * questions.length);
        } while (usedQuestions.has(questionIndex));

        const question = questions[questionIndex];
    
        currentPlayer.socket.emit('question', question);
        otherPlayer.socket.emit('opponentQuestion', question);

        usedQuestions.add(questionIndex);
    }
}

function endGame(){
    if (players[0].score === players[1].score){
        io.emit('endGame', "It's a Draw!");
    }
    else{
        io.emit('endGame', `The winner is ${players[0].score > players[1].score ? players[0].name : players[1].name}`);
    }
}

function resetGame(){
    usedQuestions.clear();
    players.clear;
    players.length = 0;
    io.emit('newGame');
}