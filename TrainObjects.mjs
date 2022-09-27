import promptPkg from 'prompt-sync';
import aws from "aws-sdk";
import fs from "fs";

const prompt = promptPkg({
    sigint: true
});

// set the region
aws.config.update(
    {
        region: "us-east-1",
        maxRetries: 15, 
        retryDelayOptions: 
        {
            base: 500
        }
    }
);

const filePath = process.argv[2];
let results = [];

let db = new aws.DynamoDB();

export class Boneyard 
{
    constructor()
    {   
        // create a new array to store the dominoes in
        this.dominoes = [];

        // create a variable to use as the array index
        let index = 0;

        for (let x = 0; x < 13; x++)
        {
            for (let y = x; y < 13; y++)
            {
                this.dominoes[index] = new Tile(x, y);
                index++;
            }
        }

        // shuffle the dominoes
        this.shuffleArray();
    }

    // shuffle the deck using the Durstenfeld shuffle
    shuffleArray() 
    {
        for (let i = this.dominoes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.dominoes[i], this.dominoes[j]] = [this.dominoes[j], this.dominoes[i]];
        }   
    }

    // draw a domino from the back of the deck, then remove that index
    // if no dominoes left, print to console
    draw() 
    {
        if (!this.isEmpty())
        {
            let domino = this.dominoes[this.dominoes.length - 1];
            this.dominoes.length -= 1;
            return domino;
        }
        console.log("Nothing in boneyard.");
    }

    // given a tileNumber, removes and returns the matching double-tile from the boneyard
    drawDouble(tileNumber)
    {
        if (!this.isEmpty())
        {
            // find the domino in the boneyard
            var retIndex = -1;
            var domino = this.dominoes.find((value, index) => 
            {
                retIndex = index;
                return value.left == tileNumber && value.right == tileNumber;
            }); 

            // if the domino was found
            if (domino) 
            {
                // remove domino at the index
                this.dominoes.splice(28, 1);
                return domino;
            }

            // otherwise return null
            return null;
        }

    }

    // return true if the deck is empty 
    isEmpty()
    {
        return this.dominoes.length == 0;
    }

    // return the number of dominos in the boneyard
    count() 
    {
        return this.dominoes.length;
    }
}

export class Tile
{
    constructor(left, right)
    {
        if(left < 0 || left > 12 || right < 0 || right > 12 ) throw "Tile value out of bounds";
        this.left = left;
        this.right = right;
    }

    // return a string representation of the domino
    toString()
    {
        return `[${this.left}, ${this.right}]`;
    }
}

export class Player 
{
    constructor(name, boneyard)
    {
        // create an empty hand for the player
        this.hand = [];
        this.name = name;
        this.boneyard = boneyard;
    }

    // draws 15 tiles from the boneyard
    drawTiles()
    {
        for (let i = 0; i < 15; i++)
        {
            this.hand.push(this.boneyard.draw());
        }    
    }

    // draws 1 tile from the boneyard
    drawTile()
    {
        this.hand.push(this.boneyard.draw());
    }

    // return string representation of the player and held tiles
    toString() 
    {
        let tiles = "";
        this.hand.map((element, index) => 
        {
            tiles += (index+1) + ". " + element.toString() + ", ";
        });

        return `Player: ${this.name}\nTiles: ${tiles}`;
    }

    isHandEmpty()
    {
        return (this.hand.length == 0);
    }
}

export class Train
{
    constructor(startNumber, player)
    {
         // check to make sure startNumber is a number and somewhere from 0 - 12
        if (startNumber < 0 || startNumber > 12 || typeof(startNumber) != "number")
        {
            throw "train start number out of bounds";
        }

        this.startNumber = startNumber;
        this.player = player;
        // create a new array to store the train
        this.train = [];
        // place the startNumber into the array
        this.train.push(new Tile(this.startNumber, this.startNumber));
    }

    // place a tile on the train if the tile is legal
    placeTile(tile)
    { 
        if (this.canPlaceTile(tile))
        {   
            // check which orientation to push the tile
            if (this.train.slice(-1)[0].right == tile.left)
            {
                this.train.push(tile);
            } 
            else
            {
                this.train.push(new Tile(tile.right, tile.left));
            }
        }
    }

    // check to see if a tile can be placed on the train
    canPlaceTile(tile)
    {
        // compare right side from last Tile in the train to both side of tile passed in
        return this.train.slice(-1)[0].right == tile.left || this.train.slice(-1)[0].right == tile.right;
    }

    // return textual representation of the train
    toString() 
    {
        let string = "";
        for (let i = 0; i < this.train.length; i++)
        {
            string += this.train[i];
        }
        return string;
    }
}

export class Board 
{
    constructor(players, startTile)
    {
        this.centreTrain = new Train(startTile, null);
        this.mexicanTrain = new Train(startTile, null);
        this.players = players;
        this.playerTrains = players.map((player) => 
        (
            new Train(startTile, player)
        ));
    }

    toString() 
    {
        let string = ("Board\n-----");
        let i = 0;

        // add centre train
        string += `\nCentre: ${this.centreTrain}`; 

        for (i = 0; i < this.playerTrains.length; i++)
        {
            string += `\n${i}. ${this.playerTrains[i].player.name}: `;

            // don't print if train only has starting piece
            if (this.playerTrains[i].train.length > 1) 
            {
                string += `${this.playerTrains[i].toString()}`;
            }
        }

        // add mexican train
        string += `\n${i}. *Mexican train: `;

        if (this.mexicanTrain.train.length > 1) {
            string += `${this.mexicanTrain.toString()}`;
        }

        return string;
    }
}

export class Game
{
    constructor(names)
    {
        this.names = names;
        this.boneyard;
        this.board;
        this.players;
    }

    // take a tile number to use to start a round
    // initialize player objects, boneyard, board
    // draw 15 tiles for each player
    // display current state of the game
    async playRound(tileNumber)
    {   
        var playAgain = true;
        
        while (playAgain) {
            // initialize boneyard
            this.boneyard = new Boneyard();

            // initialize players
            this.players = this.names.map((name) => 
            (
                new Player(name, this.boneyard)
            ));

            // initialize board
            this.board = new Board(this.players, tileNumber);

            // draw tiles
            for (var i in this.players)
            {
                this.players[i].drawTiles();
            }

            await this.retrieveDynamoDB();

            // welcome player
            await this.getLastGame();

            let turn = 1;
            let gameContinue = true;
            while (gameContinue)
            {
                for (let player of this.players) 
                { 
                    console.log("\n" + player.name + "'s turn\n------------");
                    console.log(this.board.toString());
                    console.log(player.toString());
                    let moveObjects = new Move(player);
                    if (player.isHandEmpty())
                    {
                        console.log(player.name + " has won!");
                        gameContinue = false;
                        break;
                    }

                    for (;;)
                    {
                        
                        let op = prompt(
                            `\n1. display board, 2. display hand, 3. draw tile, 4. select tile, 5. select train, 6. move, 7. toggle mark, 8. end turn: ${turn}\n`
                        );

                        if (op === '1')             // display board
                        {
                            console.log("Display Board\n------");
                            console.log(this.board.toString());
                        } 
                        else if (op === '2')        // display hand
                        {
                            console.log("Display Hand\n------");
                            console.log(player.toString());
                        }
                        else if (op === '3')        // draw tile
                        {
                            console.log("Draw Tile\n------");
                            player.drawTile();
                        }
                        else if (op === '4')        // select tile
                        {
                            console.log("Select Tile\n------");
                            let tile = prompt("Select tile: ");
                            while(!player.hand[tile - 1])
                            {
                                tile = prompt("Invalid tile, try again: ");
                            }
                            moveObjects.selectTile(player.hand[tile - 1], tile - 1);
                        }
                        else if (op === '5')        // select train
                        {
                            console.log("Select Train\n------");
                            let train = prompt(`Select train: (-1 for centre): `);
                            while (train < -1 || train > this.players.length)
                            {
                                train = prompt("Invalid train, try again: ");
                            }
                            moveObjects.selectTrain(train);
                        }
                        else if (op === '6')        // move 
                        {
                            console.log("Move\n------");
                            console.log(`train: ${moveObjects.train}, tile: ${moveObjects.tile}`);

                            // if both train and tile have been selected
                            if (moveObjects.train != undefined && moveObjects.tile != undefined)
                            {
                                let placeSuccessful = false;
                                
                                // if train choice is centre
                                if (moveObjects.train == -1)
                                {
                                    this.board.centreTrain.placeTile(moveObjects.tile);
                                    if (this.board.centreTrain.canPlaceTile(moveObjects.tile))
                                    {
                                        placeSuccessful = true;
                                    }
                                }
                                // if train choice is the Mexican train
                                else if (moveObjects.train == this.players.length)
                                {
                                    this.board.mexicanTrain.placeTile(moveObjects.tile);
                                    if (this.board.mexicanTrain.canPlaceTile(moveObjects.tile))
                                    {
                                        placeSuccessful = true;
                                    }
                                }
                                // else the train choice is a player train
                                else 
                                {
                                    this.board.playerTrains[moveObjects.train].placeTile(moveObjects.tile);
                                    if (this.board.playerTrains[moveObjects.train].canPlaceTile(moveObjects.tile))
                                    {
                                        placeSuccessful = true;
                                    }
                                }

                                // if tile was successfully placed
                                if (placeSuccessful)
                                {
                                    player.hand.splice(moveObjects.index, 1);
                                    moveObjects.train = undefined;
                                    moveObjects.tile = undefined;
                                } 
                                else 
                                {
                                    console.log("Tile was not successfully placed");
                                }
                            }
                        }
                        else if (op === '7')        // toggle mark
                        {
                            console.log("Toggle Mark\n------");
                            // DEBUG
                            player.hand.length = 0;
                        }
                        else if (op === '8')        // end turn
                        {
                            console.log("End Turn\n------");
                            break;
                        }
                    }
                }
                turn++;
            }
            // record date and players
            await this.updateDynamoDB();
            
            playAgain = prompt("play again?");
            if (!(playAgain == "y" || playAgain == "Y"))
            {
                playAgain = false;
            }
        }
    }
    
    // return date, time, and players from last game played
    async getLastGame() 
    {
        if (this.gameDate)
        {
            console.log(`Welcome back to Mexican Trains, the last time you played was on ${this.gameDate} and you played with ${this.gamePlayers}`);
        }
        else
        {
            console.log("Welcome to Mexican Trains!");
        }
        
    }

    // push recorded date, time, and players to dynamoDB
    async updateDynamoDB()
    {
        this.gameDate = new Date().getTime();
        const params = {
            TableName: "game_play",
            Item: {
                "game": {S: "Mexican Trains"},
                "game_time": {N: `${this.gameDate}`},
                "players": {SS: this.names}
            }, 
            ReturnValues: "ALL_OLD"
        };

        await db.putItem(params, (err, data) => {
            if (err) {
                console.log("PUT Error", err);
            } else {
                // console.log("Success", data);
            }
        }).promise();
    }

    // retrieve data from dynamoDB
    async retrieveDynamoDB()
    {
        // console.log("retrieving dynamo");
        const params = {
            TableName: 'game_play',
            KeyConditionExpression: "game = :g",
            ProjectionExpression: "game, game_time, players",
            ExpressionAttributeValues: {
                ":g": {
                    S: "Mexican Trains"
                }
            },
            ScanIndexForward: false, 
            Limit: 1
        };
        
        // query the database with set params
        await db.query(params, (err, data) => {
            // console.log(data);
            if (err) {
                console.log("Error", err);
            } else if (data.Count > 0) {
                const milliseconds = parseInt(data.Items[0].game_time.N) * 1000;
                this.gameDate = new Date(parseInt(data.Items[0].game_time.N));
                this.gamePlayers = data.Items[0].players.SS.map((e) => { return e; }).join(", ");
            }
        }).promise();
    }
}

export class Move
{
    constructor(player)
    {
        this.player = player;
    }

    selectTile(tile, index)
    {
        this.tile = tile;
        this.index = index;
    }

    selectTrain(train)
    {
        this.train = train;
    }
}

