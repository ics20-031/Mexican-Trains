/*
* Student: Erin Nie
* Student Number: C0469526
* Title: Lab 3
* Program: Mexican Trains
* 
*/
import promptPkg from 'prompt-sync';
import {Game} from "./TrainObjects.mjs";

const prompt = promptPkg({
    sigint: true
});

try {
    let g = new Game(["Kevin", "Joshua", "Justin", "Daphne"]);
    g.playRound(12);
    // let playAgain = prompt("play again?");
    // while (playAgain == "y" || playAgain == "Y")
    // {
    //     g.playRound(12);
    // }
} catch (error) {
    console.log(error);
}