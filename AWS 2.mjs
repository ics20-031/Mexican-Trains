exports.handler = async (event) => {   
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello from getLastGame! 123',
            last_game: 'hello'
        })
    };
    return response;
};
