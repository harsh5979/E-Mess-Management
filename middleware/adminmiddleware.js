const adminmiddleware = async (req, res, next) => {


    try {

        const Isadmin = req.user.admin;
        if (!Isadmin) {
            return res.sendStatus(400).json({ message: "Access denied . user is not an admin" })

        }


        next();
    } catch (error) {
        return res.status(400).json({ error: "Please authenticate using valid credentials" });


    }
    // if (req.user && req.user.isadmin) {
    //     next();
    //   } else {
    //     res.status(403).json({ message: "Access denied. Admins only." });
    //   }

}
module.exports = adminmiddleware;