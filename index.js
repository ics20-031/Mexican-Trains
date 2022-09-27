var AWS = require('aws-sdk');

exports.handler = async (event) => {

    AWS.config.update(
        {
            region: 'us-east-1',
        }
    );

    this.dynamoDB = new AWS.DynamoDB();

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
    // await db.query(params, (err, data) => {
    //     // console.log(data);
    //     if (err) {
    //         console.log("Error", err);
    //     } else if (data.Count > 0) {
    //         const milliseconds = parseInt(data.Items[0].game_time.N) * 1000;
    //         this.gameDate = new Date(parseInt(data.Items[0].game_time.N));
    //         this.gamePlayers = data.Items[0].players.SS.map((e) => { return e; }).join(", ");
    //     }
    // }).promise();
    let games = await this.dynamoDB.query(params).promise();
    console.log(JSON.stringify(games));
    
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello from getLastGame! 123',
            last_game: games
        })
    };
    return response;
};
