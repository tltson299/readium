const passport = require("passport");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jsonwebtoken = require("jsonwebtoken");
const ExtractJwt = require("passport-jwt").ExtractJwt;

const REQUIRE_ACTIVATE_ACCOUNT = "REQUIRE_ACTIVATE_ACCOUNT";
const NO_AUTH_TOKEN = "No auth token";

const pathToPrivKey = path.join(
  __dirname,
  "../..",
  "config/jwt/id_rsa_priv.pem"
);
const PRIV_KEY = fs.readFileSync(pathToPrivKey, "utf-8");

const pathToPubKey = path.join(
  __dirname,
  "../../",
  "config/jwt/id_rsa_pub.pem"
);

const PUB_KEY = fs.readFileSync(pathToPubKey, "utf8");

const issueJWT = (_id) => {
  const expiresIn = "10y";

  const payload = {
    iat: Date.now(),
    vux: _id,
  };

  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, {
    expiresIn: expiresIn,
    algorithm: "RS256",
  });

  const token = "Bearer " + signedToken;

  return token;
};

const decodeJWT = (token) => {
  return jsonwebtoken.verify(token, PUB_KEY);
};

const authMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err || !user) {
      return next(info);
    } else {
      if (
        req.path !== "/logout" &&
        req.path !== "/logout-all" &&
        !user.activated
      ) {
        return next({ message: REQUIRE_ACTIVATE_ACCOUNT });
      }
      req.user = user;
      return next();
    }
  })(req, res, next);
};

// cookie
// const re = /(\S+)\s+(\S+)/;

// var cookieExtractor = function (req) {
//   var token = null;
//   if (req && req.cookies) {
//     token = req.cookies["jwt"];
//   }
//   return token;
// };

const jwtOptions = {
  // jwtFromRequest: cookieExtractor, // cookie
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: PUB_KEY,
  algorithms: ["RS256"],
};

const algorithm = "aes-256-ctr";
const iv = crypto.randomBytes(16);
const secretKey = PRIV_KEY.slice(20, 52);

const encrypt = (message) => {
  message = Buffer.from(JSON.stringify(message));

  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  const encrypted = Buffer.concat([cipher.update(message), cipher.final()]);

  return [iv.toString("hex"), encrypted.toString("hex")];
};

const decrypt = ([iv, content]) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(iv, "hex")
  );

  const decrpyted = Buffer.concat([
    decipher.update(Buffer.from(content, "hex")),
    decipher.final(),
  ]);

  return JSON.parse(decrpyted.toString());
};

const Post = require("../../models/Post");
const checkOwnPost = async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(404).send({ message: "Post not found" });
  }

  if (post.author.toString() !== req.user._id.toString()) {
    return res.status(400).send({
      message: "You do not own this post to update its content",
    });
  }

  req.post = post;
  return next();
};

module.exports = {
  authMiddleware,
  checkOwnPost,
  issueJWT,
  decodeJWT,
  jwtOptions,
  encrypt,
  decrypt,
  messageCode: {
    NO_AUTH_TOKEN,
    REQUIRE_ACTIVATE_ACCOUNT,
  },
};
