const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if(!token) return res.status(401).json({error:'Access denied. No token provided.'});

    try{
        const decoded = jwt.verify(token.split(' ')[1], 'secret_key'); // use strong secret in production
        req.user = decoded;
        next();
    }catch(err){
        res.status(400).json({error:'Invalid token.'});
    }
};

module.exports = auth;
