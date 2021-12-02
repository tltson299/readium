/**
 ** Collection related routes
 */
const router = require("express").Router();

const Post = require("../../models/Post");
const { authMiddleware } = require("../../utils/auth");

router.post("/", authMiddleware, async (req, res) => {
  // #swagger.tags = ['Collection']
  // #swagger.summary = 'Create new collection'
  /*
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            properties: {
              name: {
                type: 'string',
                default: 'collection name',
              }
            }
          }  
        }
      }
    }
    #swagger.security = [{
      "bearerAuth": []
    }]
  */
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .send({ message: "Please provides the collection's name" });
  }

  const existed = req.user.collections.some(
    (collection) => collection.name === name
  );
  if (existed) {
    return res
      .status(400)
      .send({ message: "You have already created this collection!" });
  }

  const collection = { name, posts: [] };
  req.user.collections.push(collection);
  await req.user.save();
  return res.send(collection);
});

// TODO need merge and test
router.post("/posts", authMiddleware, async (req, res) => {
  // #swagger.tags = ['Collection']
  // #swagger.summary = 'Add post to collection'
  /*
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/definitions/PostToCollection"
          }  
        }
      }
    }
    #swagger.security = [{
      "bearerAuth": []
    }]
  */
  const { postId, collectionName } = req.body;

  if (!postId) {
    return res.status(400).send({ message: "Missing post id" });
  }
  if (!collectionName) {
    return res.status(400).send({ message: "Missing collection's name" });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).send({ message: "Invalid post id" });
  }

  const collection = req.user.collections.find(
    (col) => col.name === collectionName
  );
  if (!collection) {
    return res
      .status(404)
      .send({ message: "User doesn't have this collection." });
  }

  if (collection.posts.some((post) => post._id.toString() === postId)) {
    return res
      .status(400)
      .send({ message: "Post is already added in the collection" });
  }

  // found post & found collections -> valid id & valid collection name -> add to collection
  collection.posts.push(postId);

  await req.user.save();

  return res.send(collection);
});

// TODO need merge and test
router.delete("/posts", authMiddleware, async (req, res) => {
  // #swagger.tags = ['Collection']
  // #swagger.summary = 'Delete post from collection'
  /*
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/definitions/PostToCollection"
          }  
        }
      }
    }
    #swagger.security = [{
      "bearerAuth": []
    }]
  */
  const { postId, collectionName } = req.body;

  if (!postId) {
    return res.status(400).send({ message: "Missing post id" });
  }
  if (!collectionName) {
    return res.status(400).send({ message: "Missing collection's name" });
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).send({ message: "Invalid post id" });
  }

  const collection = req.user.collections.find(
    (col) => col.name === collectionName
  );
  if (!collection) {
    return res.status(404).send({ message: "Collection name is not valid." });
  }

  const postIndex = collection.posts.findIndex(
    (post) => post._id.toString() === postId
  );
  if (postIndex === -1) {
    return res
      .status(404)
      .send({ message: "Post is not in the collection to be removed!" });
  }

  // found post & found collections -> valid id & valid collection name -> add to collection
  collection.posts.splice(postIndex, 1);
  await req.user.save();

  return res.send(collection);
});

module.exports = router;
