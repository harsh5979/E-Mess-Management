const jwt = require('jsonwebtoken');

const authmiddleware = async (req, res, next) => {

    const token = req.header('auth-token');
    if (!token) {
        // return res.status(401).json({ error: "Please authenticate using valid token" });
        return res.status(401).json({ error: "Please login " });
    }
    try {
        const data = await jwt.verify(token, process.env.jwt_key);
        req.user = data.usercreate;
       
        next();
    } catch (error) {
        return res.status(401).json({ error: "Please authenticate using valid credentials" });


    }

}
module.exports = authmiddleware;